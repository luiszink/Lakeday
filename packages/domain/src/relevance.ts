export type RelevanceInput = Readonly<{
  dataCompleteness: number;
  editorialImportance: number;
  freshness: number;
  proximity?: number | undefined;
  seasonFit: number;
}>;

export const relevanceWeights = Object.freeze({
  dataCompleteness: 0.2,
  editorialImportance: 0.35,
  freshness: 0.15,
  proximity: 0.15,
  seasonFit: 0.15,
});

function unitInterval(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scoreRelevance(input: RelevanceInput): number {
  const baseScore =
    relevanceWeights.editorialImportance * unitInterval(input.editorialImportance) +
    relevanceWeights.dataCompleteness * unitInterval(input.dataCompleteness) +
    relevanceWeights.freshness * unitInterval(input.freshness) +
    relevanceWeights.seasonFit * unitInterval(input.seasonFit);

  if (input.proximity === undefined) return baseScore / (1 - relevanceWeights.proximity);
  return baseScore + relevanceWeights.proximity * unitInterval(input.proximity);
}

export function haversineDistanceM(
  from: Readonly<{ latitude: number; longitude: number }>,
  to: Readonly<{ latitude: number; longitude: number }>,
): number {
  const earthRadiusM = 6_371_000;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const fromLatitude = (from.latitude * Math.PI) / 180;
  const toLatitude = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(haversine));
}
