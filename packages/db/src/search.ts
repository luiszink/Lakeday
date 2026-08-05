import { Prisma, PrismaClient } from '@prisma/client';

export type SearchCursor = Readonly<{
  id: string;
  rank: number;
  updatedAt: Date;
}>;

export type SearchMatch = Readonly<{
  id: string;
  rank: number;
  updatedAt: Date;
}>;

type SearchInput = Readonly<{
  cursor?: SearchCursor;
  limit: number;
  locale: 'de' | 'en';
  query: string;
}>;

const searchMatchesCte = (input: SearchInput) => Prisma.sql`
  WITH search_input AS (
    SELECT
      public.search_normalize(${input.query}) AS normalized,
      plainto_tsquery('simple', public.search_normalize(${input.query})) AS query
  ),
  search_matches AS (
    SELECT
      attraction.id,
      attraction.updated_at AS "updatedAt",
      GREATEST(
        ts_rank_cd(
          to_tsvector(
            'simple',
            public.search_normalize(
              concat_ws(
                ' ',
                active_localization.name,
                active_localization.summary,
                active_localization.description,
                attraction.municipality
              )
            )
          ),
          search_input.query
        ),
        COALESCE(
          ts_rank_cd(
            to_tsvector('simple', public.search_normalize(other_localization.name)),
            search_input.query
          ),
          0
        ),
        similarity(
          public.search_normalize(active_localization.name),
          search_input.normalized
        ),
        COALESCE(
          similarity(
            public.search_normalize(other_localization.name),
            search_input.normalized
          ),
          0
        ),
        similarity(public.search_normalize(attraction.municipality), search_input.normalized),
        COALESCE(
          (
            SELECT MAX(similarity(public.search_normalize(editorial_tag.value), search_input.normalized))
            FROM attraction_tag
            INNER JOIN editorial_tag ON editorial_tag.id = attraction_tag.tag_id
            WHERE attraction_tag.attraction_id = attraction.id
          ),
          0
        )
      )::double precision AS rank
    FROM attraction
    INNER JOIN attraction_localization AS active_localization
      ON active_localization.attraction_id = attraction.id
      AND active_localization.locale = ${input.locale}::"Locale"
    LEFT JOIN attraction_localization AS other_localization
      ON other_localization.attraction_id = attraction.id
      AND other_localization.locale <> ${input.locale}::"Locale"
    CROSS JOIN search_input
    WHERE attraction.status = 'PUBLISHED'::"AttractionStatus"
      AND (
        to_tsvector(
          'simple',
          public.search_normalize(
            concat_ws(
              ' ',
              active_localization.name,
              active_localization.summary,
              active_localization.description,
              attraction.municipality
            )
          )
        ) @@ search_input.query
        OR to_tsvector('simple', public.search_normalize(other_localization.name)) @@ search_input.query
        OR public.search_normalize(active_localization.name) LIKE '%' || search_input.normalized || '%'
        OR public.search_normalize(other_localization.name) LIKE '%' || search_input.normalized || '%'
        OR public.search_normalize(attraction.municipality) LIKE '%' || search_input.normalized || '%'
        OR EXISTS (
          SELECT 1
          FROM attraction_tag
          INNER JOIN editorial_tag ON editorial_tag.id = attraction_tag.tag_id
          WHERE attraction_tag.attraction_id = attraction.id
            AND (
              public.search_normalize(editorial_tag.value) LIKE '%' || search_input.normalized || '%'
              OR (
                length(search_input.normalized) >= 5
                AND similarity(public.search_normalize(editorial_tag.value), search_input.normalized) >= 0.3
              )
            )
        )
        OR (
          length(search_input.normalized) >= 5
          AND (
            similarity(public.search_normalize(active_localization.name), search_input.normalized) >= 0.3
            OR similarity(public.search_normalize(other_localization.name), search_input.normalized) >= 0.3
            OR similarity(public.search_normalize(attraction.municipality), search_input.normalized) >= 0.3
          )
        )
      )
  )
`;

export async function searchPublishedAttractions(
  client: PrismaClient,
  input: SearchInput,
): Promise<Readonly<{ matches: readonly SearchMatch[]; total: number }>> {
  const cursorCondition = input.cursor
    ? Prisma.sql`
        WHERE rank < ${input.cursor.rank}
           OR (rank = ${input.cursor.rank} AND "updatedAt" < ${input.cursor.updatedAt})
           OR (
             rank = ${input.cursor.rank}
             AND "updatedAt" = ${input.cursor.updatedAt}
             AND id < ${input.cursor.id}::uuid
           )
      `
    : Prisma.empty;

  const [matches, totalRows] = await Promise.all([
    client.$queryRaw<readonly SearchMatch[]>(Prisma.sql`
      ${searchMatchesCte(input)}
      SELECT id, rank, "updatedAt"
      FROM search_matches
      ${cursorCondition}
      ORDER BY rank DESC, "updatedAt" DESC, id DESC
      LIMIT ${input.limit + 1}
    `),
    client.$queryRaw<readonly [{ count: number }]>(Prisma.sql`
      ${searchMatchesCte(input)}
      SELECT COUNT(*)::integer AS count
      FROM search_matches
    `),
  ]);

  return { matches, total: totalRows[0]?.count ?? 0 };
}
