import type { ResearchOutput } from './schema.js';
import { findCopiedProse, type CopiedProseMatch } from './prose-guard.js';
import { researchOutputSchema } from './schema.js';

export type ResearchValidationIssue = Readonly<{
  path: string;
  code: string;
  message: string;
  details?: Readonly<{
    field: CopiedProseMatch['field'];
    matchedQuote: string;
    similarity: number;
  }>;
}>;

export type ResearchValidationResult = Readonly<{
  valid: boolean;
  record: ResearchOutput | null;
  issues: readonly ResearchValidationIssue[];
}>;

type SectorBounds = Readonly<{
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}>;

export const researchSectorBounds: Readonly<Record<string, SectorBounds>> = {
  'BS-01': { minLon: 9.05, minLat: 47.62, maxLon: 9.28, maxLat: 47.78 },
  'BS-02': { minLon: 9.02, minLat: 47.65, maxLon: 9.32, maxLat: 47.86 },
  'BS-03': { minLon: 8.95, minLat: 47.62, maxLon: 9.24, maxLat: 47.82 },
  'BS-04': { minLon: 8.82, minLat: 47.62, maxLon: 9.16, maxLat: 47.84 },
  'BS-05': { minLon: 8.72, minLat: 47.58, maxLon: 9.08, maxLat: 47.78 },
  'BS-06': { minLon: 8.72, minLat: 47.58, maxLon: 8.98, maxLat: 47.78 },
  'BS-07': { minLon: 8.82, minLat: 47.55, maxLon: 9.38, maxLat: 47.76 },
  'BS-08': { minLon: 9.15, minLat: 47.52, maxLon: 9.58, maxLat: 47.72 },
  'BS-09': { minLon: 9.32, minLat: 47.42, maxLon: 9.88, maxLat: 47.72 },
  'BS-10': { minLon: 9.34, minLat: 47.34, maxLon: 9.88, maxLat: 47.62 },
  'BS-11': { minLon: 9.48, minLat: 47.3, maxLon: 9.92, maxLat: 47.62 },
  'BS-12': { minLon: 9.48, minLat: 47.42, maxLon: 10.08, maxLat: 47.72 },
  'BS-13': { minLon: 9.38, minLat: 47.54, maxLon: 9.82, maxLat: 47.76 },
  'BS-14': { minLon: 9.08, minLat: 47.57, maxLon: 9.68, maxLat: 47.82 },
  'BS-15': { minLon: 8.72, minLat: 47.62, maxLon: 9.42, maxLat: 47.88 },
};

export const researchTaxonomyCodes = {
  categories: [
    'NATURE',
    'lakeside_beach',
    'nature_reserve',
    'island',
    'gorge_waterfall',
    'viewpoint',
    'garden_park',
    'CULTURE_HISTORY',
    'castle_palace',
    'church_monastery',
    'museum',
    'archaeological_site',
    'old_town',
    'monument',
    'FAMILY_ACTIVITY',
    'zoo_wildlife',
    'theme_park',
    'playground',
    'adventure',
    'pool_lido',
    'mini_golf',
    'WATER',
    'boat_trip',
    'ferry_experience',
    'swimming',
    'watersports',
    'harbour',
    'ACTIVE',
    'hiking_trail',
    'cycling_route',
    'climbing',
    'winter_activity',
    'EXPERIENCE',
    'cable_car',
    'scenic_railway',
    'observation_deck',
    'thermal_spa',
    'market',
    'wine_tasting',
    'KNOWLEDGE',
    'science_center',
    'industry_heritage',
    'planetarium',
    'guided_tour',
  ],
  interests: [
    'history',
    'art',
    'technology',
    'nature',
    'animals',
    'water_fun',
    'adventure',
    'relaxation',
    'food_wine',
    'architecture',
    'science',
    'photography',
    'local_traditions',
  ],
  audiences: ['families', 'couples', 'solo', 'groups', 'seniors'],
} as const;

const categoryCodes = new Set<string>(researchTaxonomyCodes.categories);
const interestCodes = new Set<string>(researchTaxonomyCodes.interests);
const audienceCodes = new Set<string>(researchTaxonomyCodes.audiences);

function schemaIssues(input: unknown): ResearchValidationIssue[] {
  const result = researchOutputSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: `schema.${issue.code}`,
    message: issue.message,
  }));
}

function foundValue(input: { status: string; value: unknown }) {
  return input.status === 'found' ? input.value : null;
}

function addUnknownCodeIssues(
  issues: ResearchValidationIssue[],
  value: unknown,
  path: string,
  knownCodes: ReadonlySet<string>,
) {
  if (typeof value === 'string' && !knownCodes.has(value)) {
    issues.push({
      path,
      code: 'taxonomy.unknown_code',
      message: `Unknown taxonomy code: ${value}.`,
    });
  }
}

function addUnknownArrayCodeIssues(
  issues: ResearchValidationIssue[],
  value: unknown,
  path: string,
  knownCodes: ReadonlySet<string>,
) {
  if (!Array.isArray(value)) return;
  for (const [index, item] of value.entries()) {
    addUnknownCodeIssues(issues, item, `${path}.${index}`, knownCodes);
  }
}

function addFileConventionIssue(
  issues: ResearchValidationIssue[],
  filePath: string | undefined,
  sector: string,
) {
  if (!filePath) return;
  const normalized = filePath.replaceAll('\\', '/');
  const match = normalized.match(/(?:^|\/)data\/research\/([^/]+)\/([^/]+)\.json$/u);
  if (!match) return;
  const [, sectorDirectory, candidateSlug] = match;
  if (sectorDirectory !== sector) {
    issues.push({
      path: 'researchMeta.sector',
      code: 'file.sector_directory_mismatch',
      message: `File is under ${sectorDirectory}, but the record declares ${sector}.`,
    });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(candidateSlug!)) {
    issues.push({
      path: '$file',
      code: 'file.invalid_candidate_slug',
      message: 'Research filenames must use a lowercase kebab-case candidate slug.',
    });
  }
}

function addStaticIssues(record: ResearchOutput, filePath?: string): ResearchValidationIssue[] {
  const issues: ResearchValidationIssue[] = [];
  const sectorBounds = researchSectorBounds[record.researchMeta.sector];
  const coordinates = foundValue(record.geo.coordinates);
  if (
    sectorBounds &&
    typeof coordinates === 'object' &&
    coordinates !== null &&
    'lat' in coordinates &&
    'lon' in coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lon === 'number'
  ) {
    const inSector =
      coordinates.lon >= sectorBounds.minLon &&
      coordinates.lon <= sectorBounds.maxLon &&
      coordinates.lat >= sectorBounds.minLat &&
      coordinates.lat <= sectorBounds.maxLat;
    if (!inSector && record.geo.scopeCheck.exceptionProposed !== true) {
      issues.push({
        path: 'geo.coordinates.value',
        code: 'scope.outside_sector_bbox',
        message: `Coordinates fall outside the ${record.researchMeta.sector} bounding box.`,
      });
    }
  }

  const primaryCategory = foundValue(record.classification.primaryCategory);
  addUnknownCodeIssues(
    issues,
    primaryCategory,
    'classification.primaryCategory.value',
    categoryCodes,
  );
  addUnknownArrayCodeIssues(
    issues,
    foundValue(record.classification.subcategories),
    'classification.subcategories.value',
    categoryCodes,
  );
  addUnknownArrayCodeIssues(
    issues,
    foundValue(record.classification.interests),
    'classification.interests.value',
    interestCodes,
  );
  addUnknownArrayCodeIssues(
    issues,
    foundValue(record.classification.audiences),
    'classification.audiences.value',
    audienceCodes,
  );
  addFileConventionIssue(issues, filePath, record.researchMeta.sector);
  for (const match of findCopiedProse(record)) {
    issues.push({
      path: match.field,
      code: 'prose.copied',
      message: `Localization text is too similar to an evidence quote (similarity ${match.similarity.toFixed(3)}).`,
      details: {
        field: match.field,
        matchedQuote: match.matchedQuote,
        similarity: match.similarity,
      },
    });
  }
  return issues;
}

export function validateResearchRecord(
  input: unknown,
  filePath?: string,
): ResearchValidationResult {
  const parseResult = researchOutputSchema.safeParse(input);
  if (!parseResult.success) {
    return { valid: false, record: null, issues: schemaIssues(input) };
  }
  const issues = addStaticIssues(parseResult.data, filePath);
  return { valid: issues.length === 0, record: parseResult.data, issues };
}
