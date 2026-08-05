import { z } from 'zod';

export const geocodeLocaleSchema = z.enum(['de', 'en']);

export const geocodeQuerySchema = z.strictObject({
  locale: geocodeLocaleSchema.default('de'),
  q: z.string().trim().min(2).max(120),
});

export const geocodeCoordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const geocodeResultSchema = z.object({
  label: z.string().trim().min(1).max(240),
  coordinates: geocodeCoordinateSchema,
});

export const geocodeResponseSchema = z.object({
  providerUnavailable: z.boolean(),
  results: z.array(geocodeResultSchema),
});

export const lakeConstanceScopeBox = {
  maxLatitude: 47.9,
  maxLongitude: 9.9,
  minLatitude: 47.3,
  minLongitude: 8.7,
} as const;

export type GeocodeLocale = z.infer<typeof geocodeLocaleSchema>;
export type GeocodeResult = z.infer<typeof geocodeResultSchema>;
export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
export type Wgs84Coordinate = z.infer<typeof geocodeCoordinateSchema>;

export type Geocoder = Readonly<{
  search: (query: string, locale: GeocodeLocale) => Promise<readonly GeocodeResult[]>;
}>;

export function roundCoordinate(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function roundWgs84Coordinate(coordinate: Wgs84Coordinate): Wgs84Coordinate {
  return {
    latitude: roundCoordinate(coordinate.latitude),
    longitude: roundCoordinate(coordinate.longitude),
  };
}

export function isInsideLakeConstanceScope(coordinate: Wgs84Coordinate): boolean {
  return (
    coordinate.latitude >= lakeConstanceScopeBox.minLatitude &&
    coordinate.latitude <= lakeConstanceScopeBox.maxLatitude &&
    coordinate.longitude >= lakeConstanceScopeBox.minLongitude &&
    coordinate.longitude <= lakeConstanceScopeBox.maxLongitude
  );
}
