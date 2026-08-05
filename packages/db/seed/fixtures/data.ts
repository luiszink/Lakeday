export type FixtureAttraction = Readonly<{
  id: string;
  slug: string;
  nameDe: string;
  nameEn: string;
  regionCode: string;
  countryCode: 'DE' | 'CH' | 'AT';
  municipality: string;
  latitude: number;
  longitude: number;
  primaryCategoryCode: string;
  categoryCodes: readonly string[];
  priceLevel: 'FREE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'PREMIUM';
  indoorOutdoor?: 'INDOOR' | 'OUTDOOR' | 'MIXED';
  rainSuitability?: 'POOR' | 'OK' | 'GOOD' | 'EXCELLENT';
  heatSuitability?: 'POOR' | 'OK' | 'GOOD' | 'EXCELLENT';
  seasons?: readonly ('SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER' | 'ALL_YEAR')[];
  childAgeBands?: readonly ('0-2' | '3-5' | '6-9' | '10-13' | '14+')[];
  typicalDurationMin?: number;
  typicalDurationMax?: number;
  foodOnSite?: boolean;
  cafeOnSite?: boolean;
  picnicAllowed?: boolean;
  bookingRequirement?: 'NONE' | 'RECOMMENDED' | 'REQUIRED';
  strollerSuitable?: 'YES' | 'PARTIAL' | 'NO' | 'UNKNOWN';
  price?: Readonly<{ amount: number; currency: 'EUR' | 'CHF' }>;
  wheelchairAccess: 'FULL' | 'PARTIAL' | 'NONE' | 'UNKNOWN';
  dogPolicy?: 'ALLOWED' | 'LEASHED' | 'NO' | 'UNKNOWN';
  visitorLanguages?: readonly ('DE' | 'EN' | 'FR' | 'IT')[];
  transportModes?: readonly ('WALK' | 'BICYCLE' | 'PUBLIC_TRANSPORT' | 'CAR')[];
  interestCodes?: readonly string[];
  audienceCodes?: readonly string[];
  hoursUnknown?: boolean;
  scopeException?: boolean;
  scopeExceptionReason?: string;
  stale?: boolean;
}>;

const categoryGroups = [
  [
    'NATURE',
    ['lakeside_beach', 'nature_reserve', 'island', 'gorge_waterfall', 'viewpoint', 'garden_park'],
  ],
  [
    'CULTURE_HISTORY',
    ['castle_palace', 'church_monastery', 'museum', 'archaeological_site', 'old_town', 'monument'],
  ],
  [
    'FAMILY_ACTIVITY',
    ['zoo_wildlife', 'theme_park', 'playground', 'adventure', 'pool_lido', 'mini_golf'],
  ],
  ['WATER', ['boat_trip', 'ferry_experience', 'swimming', 'watersports', 'harbour']],
  ['ACTIVE', ['hiking_trail', 'cycling_route', 'climbing', 'winter_activity']],
  [
    'EXPERIENCE',
    ['cable_car', 'scenic_railway', 'observation_deck', 'thermal_spa', 'market', 'wine_tasting'],
  ],
  ['KNOWLEDGE', ['science_center', 'industry_heritage', 'planetarium', 'guided_tour']],
] as const;

const locations = [
  ['UEBERLINGER_SEE', 'DE', 'Überlingen', 47.77, 9.17],
  ['OBERSEE_NORD', 'DE', 'Friedrichshafen', 47.65, 9.48],
  ['BAYERN_UFER', 'DE', 'Lindau', 47.55, 9.69],
  ['VORARLBERG_UFER', 'AT', 'Bregenz', 47.5, 9.75],
  ['OBERSEE_SUED', 'CH', 'Rorschach', 47.48, 9.5],
  ['THURGAU_UFER', 'CH', 'Kreuzlingen', 47.64, 9.18],
  ['KONSTANZ_SEERHEIN', 'DE', 'Konstanz', 47.6634, 9.1755],
  ['UNTERSEE_NORD', 'DE', 'Radolfzell', 47.74, 8.97],
  ['UNTERSEE_SUED', 'CH', 'Stein am Rhein', 47.659, 8.859],
] as const;

const priceLevels = ['FREE', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM'] as const;

const baseFixtures = categoryGroups.flatMap(([primaryCategoryCode, subcategories], groupIndex) =>
  subcategories.map((subcategoryCode, subcategoryIndex) => {
    const fixtureIndex = groupIndex * 6 + subcategoryIndex;
    const [regionCode, countryCode, municipality, latitude, longitude] =
      locations[fixtureIndex === 14 ? 6 : fixtureIndex % locations.length]!;
    const slug = `fixture-${subcategoryCode}`;
    return {
      id: `00000000-0000-4000-8000-${String(fixtureIndex + 1).padStart(12, '0')}`,
      slug,
      nameDe: `Testort ${subcategoryCode.replaceAll('_', ' ')}`,
      nameEn: `Fixture place ${subcategoryCode.replaceAll('_', ' ')}`,
      regionCode,
      countryCode,
      municipality,
      latitude: latitude + subcategoryIndex / 10_000,
      longitude: longitude + subcategoryIndex / 10_000,
      primaryCategoryCode,
      categoryCodes: [primaryCategoryCode, subcategoryCode],
      priceLevel: priceLevels[fixtureIndex % priceLevels.length]!,
      indoorOutdoor:
        fixtureIndex % 3 === 0 ? 'INDOOR' : fixtureIndex % 3 === 1 ? 'OUTDOOR' : 'MIXED',
      rainSuitability:
        fixtureIndex % 4 === 0 ? 'EXCELLENT' : fixtureIndex % 4 === 1 ? 'GOOD' : 'OK',
      heatSuitability: fixtureIndex % 3 === 0 ? 'GOOD' : 'OK',
      seasons: ['ALL_YEAR'],
      childAgeBands: fixtureIndex === 14 ? ['0-2', '3-5'] : [],
      typicalDurationMin: fixtureIndex % 3 === 0 ? 30 : fixtureIndex % 3 === 1 ? 90 : 180,
      typicalDurationMax: fixtureIndex % 3 === 0 ? 60 : fixtureIndex % 3 === 1 ? 120 : 240,
      foodOnSite: fixtureIndex % 3 === 0,
      cafeOnSite: fixtureIndex % 4 === 0,
      picnicAllowed: fixtureIndex % 2 === 0,
      bookingRequirement: fixtureIndex % 5 === 0 ? 'RECOMMENDED' : 'NONE',
      strollerSuitable:
        fixtureIndex === 14 ? 'YES' : fixtureIndex % 4 === 0 ? 'PARTIAL' : 'UNKNOWN',
      wheelchairAccess: fixtureIndex % 2 === 0 ? 'FULL' : 'UNKNOWN',
      dogPolicy: fixtureIndex % 3 === 0 ? 'ALLOWED' : 'UNKNOWN',
      visitorLanguages: fixtureIndex % 4 === 0 ? ['DE', 'EN', 'FR'] : ['DE', 'EN'],
      transportModes:
        fixtureIndex % 3 === 0
          ? ['WALK', 'PUBLIC_TRANSPORT', 'BICYCLE']
          : ['WALK', 'PUBLIC_TRANSPORT'],
      interestCodes: fixtureIndex % 2 === 0 ? ['nature'] : ['history'],
      audienceCodes: fixtureIndex === 14 ? ['families'] : ['couples'],
    } satisfies FixtureAttraction;
  }),
);

export const fixtureAttractions: readonly FixtureAttraction[] = [
  ...baseFixtures,
  {
    ...baseFixtures[0]!,
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'fixture-unknown-hours',
    nameDe: 'Testort mit unbekannten Öffnungszeiten',
    nameEn: 'Fixture place with unknown hours',
    hoursUnknown: true,
  },
  {
    ...baseFixtures[1]!,
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'fixture-chf-price',
    nameDe: 'Testort mit Schweizer Preis',
    nameEn: 'Fixture place with Swiss price',
    countryCode: 'CH',
    regionCode: 'THURGAU_UFER',
    municipality: 'Kreuzlingen',
    latitude: 47.64,
    longitude: 9.18,
    priceLevel: 'HIGH',
    price: { amount: 24, currency: 'CHF' },
  },
  {
    ...baseFixtures[2]!,
    id: '00000000-0000-4000-8000-000000000103',
    slug: 'fixture-scope-exception',
    nameDe: 'Testort mit Bereichsausnahme',
    nameEn: 'Fixture place with scope exception',
    municipality: 'Salem',
    latitude: 47.772,
    longitude: 9.295,
    scopeException: true,
    scopeExceptionReason: 'Synthetic regional landmark used to exercise the exception workflow.',
  },
  {
    ...baseFixtures[3]!,
    id: '00000000-0000-4000-8000-000000000104',
    slug: 'fixture-stale-facts',
    nameDe: 'Testort mit veralteten Fakten',
    nameEn: 'Fixture place with stale facts',
    stale: true,
  },
  {
    ...baseFixtures[4]!,
    id: '00000000-0000-4000-8000-000000000105',
    slug: 'fixture-near-duplicate-a',
    nameDe: 'Testhaus am Hafen',
    nameEn: 'Fixture house at the harbour',
    municipality: 'Konstanz',
    regionCode: 'KONSTANZ_SEERHEIN',
    latitude: 47.6634,
    longitude: 9.1755,
  },
  {
    ...baseFixtures[4]!,
    id: '00000000-0000-4000-8000-000000000106',
    slug: 'fixture-near-duplicate-b',
    nameDe: 'Test-Haus am Hafen',
    nameEn: 'Fixture House at Harbour',
    municipality: 'Konstanz',
    regionCode: 'KONSTANZ_SEERHEIN',
    latitude: 47.6637,
    longitude: 9.1757,
  },
];

export const fixtureIds = Object.fromEntries(
  fixtureAttractions.map(({ id, slug }) => [slug, id]),
) as Readonly<Record<string, string>>;
