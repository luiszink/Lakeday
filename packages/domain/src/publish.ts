import {
  attractionLocalizationSchema,
  attractionSchema,
  criticalFactsSchema,
  type Attraction,
  type AttractionLocalization,
  type CriticalFacts,
} from './entities/attraction.js';
import { z } from 'zod';
import { failure, success, type Result } from './result.js';
import { isInScope, type ScopeGeometry } from './scope.js';

export const invariantViolationCodeSchema = z.enum([
  'LOCALIZATION_MISSING',
  'LOCALIZATION_INCOMPLETE',
  'LOCALIZATION_STALE',
  'COORDINATES_MISSING',
  'REGION_MISSING',
  'CATEGORY_MISSING',
  'CRITICAL_FACT_UNVERIFIED',
  'SCOPE_EXCEPTION_REASON_REQUIRED',
  'OUT_OF_SCOPE',
]);

export type InvariantViolationCode = z.infer<typeof invariantViolationCodeSchema>;

export type InvariantViolation = Readonly<{ code: InvariantViolationCode }>;
export type PublishedAttraction = Attraction & Readonly<{ status: 'PUBLISHED' }>;

function hasCompleteLocalization(localization: AttractionLocalization): boolean {
  return Boolean(
    localization.name && localization.slug && localization.summary && localization.description,
  );
}

export function publishAttraction(
  attractionInput: Attraction,
  localizationsInput: readonly AttractionLocalization[],
  criticalFactsInput: CriticalFacts,
  scopeGeometry: ScopeGeometry,
): Result<PublishedAttraction, InvariantViolation> {
  const attraction = attractionSchema.parse(attractionInput);
  const localizations = localizationsInput.map((localization) =>
    attractionLocalizationSchema.parse(localization),
  );
  const criticalFacts = criticalFactsSchema.parse(criticalFactsInput);
  const violations: InvariantViolation[] = [];
  const localized = new Map(
    localizations.map((localization) => [localization.locale, localization]),
  );

  for (const locale of ['de', 'en'] as const) {
    const localization = localized.get(locale);
    if (!localization) violations.push({ code: 'LOCALIZATION_MISSING' });
    else if (!hasCompleteLocalization(localization))
      violations.push({ code: 'LOCALIZATION_INCOMPLETE' });
    else if (localization.translationState === 'STALE')
      violations.push({ code: 'LOCALIZATION_STALE' });
  }
  if (!attraction.coordinates) violations.push({ code: 'COORDINATES_MISSING' });
  if (!attraction.regionCode) violations.push({ code: 'REGION_MISSING' });
  if (attraction.categoryCodes.length === 0) violations.push({ code: 'CATEGORY_MISSING' });
  if (Object.values(criticalFacts).some((state) => state === 'UNVERIFIED')) {
    violations.push({ code: 'CRITICAL_FACT_UNVERIFIED' });
  }
  if (attraction.scopeException && !attraction.scopeExceptionReason?.trim()) {
    violations.push({ code: 'SCOPE_EXCEPTION_REASON_REQUIRED' });
  }
  if (!isInScope(attraction, scopeGeometry)) violations.push({ code: 'OUT_OF_SCOPE' });

  return violations.length > 0
    ? failure(violations)
    : success({ ...attraction, status: 'PUBLISHED' });
}
