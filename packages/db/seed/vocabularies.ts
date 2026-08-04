import { CategoryLevel, PrismaClient } from '@prisma/client';

type CategorySeed = Readonly<{
  code: string;
  labelDe: string;
  labelEn: string;
  subcategories: ReadonlyArray<Readonly<{ code: string; labelDe: string; labelEn: string }>>;
}>;

const categories: ReadonlyArray<CategorySeed> = [
  {
    code: 'NATURE',
    labelDe: 'Natur',
    labelEn: 'Nature',
    subcategories: [
      { code: 'lakeside_beach', labelDe: 'Seeufer und Strand', labelEn: 'Lakeside and beach' },
      { code: 'nature_reserve', labelDe: 'Naturschutzgebiet', labelEn: 'Nature reserve' },
      { code: 'island', labelDe: 'Insel', labelEn: 'Island' },
      {
        code: 'gorge_waterfall',
        labelDe: 'Schlucht und Wasserfall',
        labelEn: 'Gorge and waterfall',
      },
      { code: 'viewpoint', labelDe: 'Aussichtspunkt', labelEn: 'Viewpoint' },
      { code: 'garden_park', labelDe: 'Garten und Park', labelEn: 'Garden and park' },
    ],
  },
  {
    code: 'CULTURE_HISTORY',
    labelDe: 'Kultur und Geschichte',
    labelEn: 'Culture and history',
    subcategories: [
      { code: 'castle_palace', labelDe: 'Burg und Schloss', labelEn: 'Castle and palace' },
      { code: 'church_monastery', labelDe: 'Kirche und Kloster', labelEn: 'Church and monastery' },
      { code: 'museum', labelDe: 'Museum', labelEn: 'Museum' },
      {
        code: 'archaeological_site',
        labelDe: 'Archäologische Stätte',
        labelEn: 'Archaeological site',
      },
      { code: 'old_town', labelDe: 'Altstadt', labelEn: 'Old town' },
      { code: 'monument', labelDe: 'Denkmal', labelEn: 'Monument' },
    ],
  },
  {
    code: 'FAMILY_ACTIVITY',
    labelDe: 'Familie und Aktivität',
    labelEn: 'Family and activity',
    subcategories: [
      { code: 'zoo_wildlife', labelDe: 'Zoo und Tierwelt', labelEn: 'Zoo and wildlife' },
      { code: 'theme_park', labelDe: 'Freizeitpark', labelEn: 'Theme park' },
      { code: 'playground', labelDe: 'Spielplatz', labelEn: 'Playground' },
      { code: 'adventure', labelDe: 'Abenteuer', labelEn: 'Adventure' },
      { code: 'pool_lido', labelDe: 'Schwimmbad und Strandbad', labelEn: 'Pool and lido' },
      { code: 'mini_golf', labelDe: 'Minigolf', labelEn: 'Mini golf' },
    ],
  },
  {
    code: 'WATER',
    labelDe: 'Wasser',
    labelEn: 'Water',
    subcategories: [
      { code: 'boat_trip', labelDe: 'Schifffahrt', labelEn: 'Boat trip' },
      { code: 'ferry_experience', labelDe: 'Fähre', labelEn: 'Ferry experience' },
      { code: 'swimming', labelDe: 'Baden', labelEn: 'Swimming' },
      { code: 'watersports', labelDe: 'Wassersport', labelEn: 'Watersports' },
      { code: 'harbour', labelDe: 'Hafen', labelEn: 'Harbour' },
    ],
  },
  {
    code: 'ACTIVE',
    labelDe: 'Aktiv',
    labelEn: 'Active',
    subcategories: [
      { code: 'hiking_trail', labelDe: 'Wanderweg', labelEn: 'Hiking trail' },
      { code: 'cycling_route', labelDe: 'Radroute', labelEn: 'Cycling route' },
      { code: 'climbing', labelDe: 'Klettern', labelEn: 'Climbing' },
      { code: 'winter_activity', labelDe: 'Winteraktivität', labelEn: 'Winter activity' },
    ],
  },
  {
    code: 'EXPERIENCE',
    labelDe: 'Erlebnis',
    labelEn: 'Experience',
    subcategories: [
      { code: 'cable_car', labelDe: 'Seilbahn', labelEn: 'Cable car' },
      { code: 'scenic_railway', labelDe: 'Panoramabahn', labelEn: 'Scenic railway' },
      { code: 'observation_deck', labelDe: 'Aussichtsplattform', labelEn: 'Observation deck' },
      { code: 'thermal_spa', labelDe: 'Thermalbad', labelEn: 'Thermal spa' },
      { code: 'market', labelDe: 'Markt', labelEn: 'Market' },
      { code: 'wine_tasting', labelDe: 'Weinprobe', labelEn: 'Wine tasting' },
    ],
  },
  {
    code: 'KNOWLEDGE',
    labelDe: 'Wissen',
    labelEn: 'Knowledge',
    subcategories: [
      { code: 'science_center', labelDe: 'Wissenschaftszentrum', labelEn: 'Science center' },
      { code: 'industry_heritage', labelDe: 'Industriekultur', labelEn: 'Industrial heritage' },
      { code: 'planetarium', labelDe: 'Planetarium', labelEn: 'Planetarium' },
      { code: 'guided_tour', labelDe: 'Führung', labelEn: 'Guided tour' },
    ],
  },
];

const interests = [
  ['history', 'Geschichte', 'History'],
  ['art', 'Kunst', 'Art'],
  ['technology', 'Technik', 'Technology'],
  ['nature', 'Natur', 'Nature'],
  ['animals', 'Tiere', 'Animals'],
  ['water_fun', 'Wasserspaß', 'Water fun'],
  ['adventure', 'Abenteuer', 'Adventure'],
  ['relaxation', 'Erholung', 'Relaxation'],
  ['food_wine', 'Essen und Wein', 'Food and wine'],
  ['architecture', 'Architektur', 'Architecture'],
  ['science', 'Wissenschaft', 'Science'],
  ['photography', 'Fotografie', 'Photography'],
  ['local_traditions', 'Lokale Traditionen', 'Local traditions'],
] as const;

const audiences = [
  ['families', 'Familien', 'Families'],
  ['couples', 'Paare', 'Couples'],
  ['solo', 'Alleinreisende', 'Solo travellers'],
  ['groups', 'Gruppen', 'Groups'],
  ['seniors', 'Seniorinnen und Senioren', 'Seniors'],
] as const;

export async function seedVocabularies(client: PrismaClient): Promise<void> {
  for (const [sortOrder, category] of categories.entries()) {
    const parent = await client.category.upsert({
      where: { code: category.code },
      create: {
        code: category.code,
        labelDe: category.labelDe,
        labelEn: category.labelEn,
        level: CategoryLevel.PRIMARY,
        sortOrder,
      },
      update: {
        labelDe: category.labelDe,
        labelEn: category.labelEn,
        level: CategoryLevel.PRIMARY,
        parentCategoryId: null,
        sortOrder,
      },
    });
    for (const [subcategorySortOrder, subcategory] of category.subcategories.entries()) {
      await client.category.upsert({
        where: { code: subcategory.code },
        create: {
          ...subcategory,
          level: CategoryLevel.SUB,
          parentCategoryId: parent.id,
          sortOrder: subcategorySortOrder,
        },
        update: {
          ...subcategory,
          level: CategoryLevel.SUB,
          parentCategoryId: parent.id,
          sortOrder: subcategorySortOrder,
        },
      });
    }
  }

  for (const [sortOrder, [code, labelDe, labelEn]] of interests.entries()) {
    await client.interest.upsert({
      where: { code },
      create: { code, labelDe, labelEn, sortOrder },
      update: { labelDe, labelEn, sortOrder },
    });
  }
  for (const [sortOrder, [code, labelDe, labelEn]] of audiences.entries()) {
    await client.audience.upsert({
      where: { code },
      create: { code, labelDe, labelEn, sortOrder },
      update: { labelDe, labelEn, sortOrder },
    });
  }
}

export const vocabularyCodes = {
  categories: categories.flatMap((category) => [
    category.code,
    ...category.subcategories.map(({ code }) => code),
  ]),
  interests: interests.map(([code]) => code),
  audiences: audiences.map(([code]) => code),
} as const;
