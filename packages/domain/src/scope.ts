import type { Attraction, Coordinates } from './entities/attraction.js';

export interface ScopeGeometry {
  isWithinShorelineBand(coordinates: Coordinates): boolean;
  isShorelineMunicipality(municipality: string): boolean;
}

export function isInScope(attraction: Attraction, geometry: ScopeGeometry): boolean {
  if (attraction.scopeException && attraction.scopeExceptionReason?.trim()) return true;
  if (attraction.coordinates && geometry.isWithinShorelineBand(attraction.coordinates)) return true;
  return (
    attraction.editorialRelevance === 'HIGH' &&
    geometry.isShorelineMunicipality(attraction.municipality)
  );
}
