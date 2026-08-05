import { geocodeCoordinateSchema, roundWgs84Coordinate, type Wgs84Coordinate } from '@lake/domain';

export type LocalLocation = Readonly<{
  coordinates: Wgs84Coordinate;
  label: string;
}>;

const storageKey = 'lake-location-v1';

export function readLocalLocation(): LocalLocation | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (
      typeof value !== 'object' ||
      value === null ||
      !('label' in value) ||
      !('coordinates' in value)
    ) {
      return null;
    }
    if (typeof value.label !== 'string') return null;
    const coordinates = geocodeCoordinateSchema.safeParse(value.coordinates);
    return coordinates.success ? { label: value.label, coordinates: coordinates.data } : null;
  } catch {
    return null;
  }
}

export function writeLocalLocation(location: LocalLocation): void {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      label: location.label,
      coordinates: roundWgs84Coordinate(location.coordinates),
    }),
  );
}

export function distanceMeters(first: Wgs84Coordinate, second: Wgs84Coordinate): number {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const firstLatitude = (first.latitude * Math.PI) / 180;
  const secondLatitude = (second.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine)));
}
