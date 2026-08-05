CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, value);
$$;

CREATE OR REPLACE FUNCTION public.search_normalize(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT replace(
    replace(
      replace(lower(public.immutable_unaccent(value)), 'ae', 'a'),
      'oe',
      'o'
    ),
    'ue',
    'u'
  );
$$;

CREATE INDEX "attraction_loc_fts"
ON "attraction_localization"
USING GIN (
  to_tsvector(
    'simple',
    public.search_normalize(name || ' ' || coalesce(summary, '') || ' ' || coalesce(description, ''))
  )
);

CREATE INDEX "attraction_loc_trgm"
ON "attraction_localization"
USING GIN (public.search_normalize(name) gin_trgm_ops);

CREATE INDEX "attraction_municipality_trgm"
ON "attraction"
USING GIN (public.search_normalize(municipality) gin_trgm_ops);

CREATE INDEX "editorial_tag_value_trgm"
ON "editorial_tag"
USING GIN (public.search_normalize(value) gin_trgm_ops);