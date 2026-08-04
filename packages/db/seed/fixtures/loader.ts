import { Prisma, PrismaClient } from '@prisma/client';
import process from 'node:process';

import { fixtureAttractions, type FixtureAttraction } from './data.js';

function assertNonProductionEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Synthetic fixture data must not be loaded in production.');
  }
}

async function upsertFixtureAttraction(
  client: PrismaClient,
  fixture: FixtureAttraction,
): Promise<void> {
  await client.$executeRaw(
    Prisma.sql`
      INSERT INTO attraction (
        id, status, location, country_code, municipality, region_code, scope_exception,
        scope_exception_reason, indoor_outdoor, seasons, child_age_bands, visitor_languages,
        transport_modes, price_level, wheelchair_access, verification_state, updated_at
      ) VALUES (
        ${fixture.id}::uuid, ${fixture.stale ? 'DRAFT' : 'PUBLISHED'}::"AttractionStatus",
        ST_SetSRID(ST_MakePoint(${fixture.longitude}, ${fixture.latitude}), 4326)::geography,
        ${fixture.countryCode}::"CountryCode", ${fixture.municipality}, ${fixture.regionCode},
        ${fixture.scopeException ?? false}, ${fixture.scopeExceptionReason ?? null}, 'MIXED'::"IndoorOutdoor",
        ARRAY['ALL_YEAR']::"Season"[], ARRAY[]::"ChildAgeBand"[], ARRAY['DE', 'EN']::"VisitorLanguage"[],
        ARRAY['WALK', 'PUBLIC_TRANSPORT']::"TransportMode"[], ${fixture.priceLevel}::"PriceLevel",
        ${fixture.wheelchairAccess}::"WheelchairAccess", 'VERIFIED'::"VerificationState", CURRENT_TIMESTAMP
      ) ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status, location = EXCLUDED.location, country_code = EXCLUDED.country_code,
        municipality = EXCLUDED.municipality, region_code = EXCLUDED.region_code,
        scope_exception = EXCLUDED.scope_exception, scope_exception_reason = EXCLUDED.scope_exception_reason,
        price_level = EXCLUDED.price_level, wheelchair_access = EXCLUDED.wheelchair_access,
        updated_at = CURRENT_TIMESTAMP;
    `,
  );

  for (const [locale, name, slug, summary, description] of [
    [
      'de',
      fixture.nameDe,
      fixture.slug,
      `Synthetische Kurzbeschreibung für ${fixture.nameDe}.`,
      `Synthetische Beschreibung für ${fixture.nameDe}.`,
    ],
    [
      'en',
      fixture.nameEn,
      `${fixture.slug}-en`,
      `Synthetic summary for ${fixture.nameEn}.`,
      `Synthetic description for ${fixture.nameEn}.`,
    ],
  ] as const) {
    await client.attractionLocalization.upsert({
      where: { attractionId_locale: { attractionId: fixture.id, locale } },
      create: {
        attractionId: fixture.id,
        locale,
        name,
        slug,
        summary,
        description,
        translationState: fixture.stale ? 'STALE' : locale === 'de' ? 'SOURCE' : 'TRANSLATED',
      },
      update: {
        name,
        slug,
        summary,
        description,
        translationState: fixture.stale ? 'STALE' : locale === 'de' ? 'SOURCE' : 'TRANSLATED',
      },
    });
  }

  const categories = await client.category.findMany({
    where: { code: { in: fixture.categoryCodes } },
    select: { id: true, code: true },
  });
  for (const category of categories) {
    await client.attractionCategory.upsert({
      where: { attractionId_categoryId: { attractionId: fixture.id, categoryId: category.id } },
      create: {
        attractionId: fixture.id,
        categoryId: category.id,
        isPrimary: category.code === fixture.primaryCategoryCode,
      },
      update: { isPrimary: category.code === fixture.primaryCategoryCode },
    });
  }

  await client.openingSchedule.upsert({
    where: { attractionId: fixture.id },
    create: {
      attractionId: fixture.id,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      hoursUnknown: fixture.hoursUnknown ?? false,
    },
    update: { hoursUnknown: fixture.hoursUnknown ?? false },
  });

  if (fixture.price) {
    const price = await client.priceInfo.findFirst({
      where: { attractionId: fixture.id, currency: fixture.price.currency },
    });
    if (!price)
      await client.priceInfo.create({
        data: {
          attractionId: fixture.id,
          audience: 'ADULT',
          amount: fixture.price.amount,
          currency: fixture.price.currency,
          confidence: 'HIGH',
        },
      });
  }
}

export async function seedFixtures(client: PrismaClient): Promise<void> {
  assertNonProductionEnvironment();
  for (const fixture of fixtureAttractions) await upsertFixtureAttraction(client, fixture);
}
