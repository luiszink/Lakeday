import type { GeocodeLocale, GeocodeResult, Geocoder } from '@lake/domain';

type GeoJsonFeature = Readonly<{
  geometry?: Readonly<{ coordinates?: unknown }>;
  properties?: Readonly<Record<string, unknown>>;
}>;

type GeoJsonResponse = Readonly<{ features?: unknown }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readFeature(value: unknown): GeocodeResult | null {
  if (!isRecord(value)) return null;
  const feature = value as GeoJsonFeature;
  const coordinates = feature.geometry?.coordinates;
  if (
    !Array.isArray(coordinates) ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number'
  ) {
    return null;
  }

  const properties = feature.properties ?? {};
  const label = [properties.label, properties.name, properties.city, properties.town].find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  );
  if (!label) return null;

  return {
    label: label.trim(),
    coordinates: { latitude: coordinates[1], longitude: coordinates[0] },
  };
}

export class UnavailableGeocoder implements Geocoder {
  async search(): Promise<readonly GeocodeResult[]> {
    throw new Error('Geocoder is not configured.');
  }
}

export class HttpGeocoder implements Geocoder {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async search(query: string, locale: GeocodeLocale): Promise<readonly GeocodeResult[]> {
    const endpoint = new URL(this.baseUrl);
    endpoint.searchParams.set('q', query);
    endpoint.searchParams.set('language', locale);
    if (this.apiKey) endpoint.searchParams.set('key', this.apiKey);

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(2_000) });
    if (!response.ok) throw new Error('Geocoder request failed.');
    const payload = (await response.json()) as GeoJsonResponse;
    if (!Array.isArray(payload.features)) return [];

    return payload.features
      .map(readFeature)
      .filter((result): result is GeocodeResult => result !== null);
  }
}

export class FakeGeocoder implements Geocoder {
  constructor(private readonly fixtures: readonly GeocodeResult[] = []) {}

  async search(query: string): Promise<readonly GeocodeResult[]> {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return this.fixtures.filter((fixture) =>
      fixture.label.toLocaleLowerCase().includes(normalizedQuery),
    );
  }
}

export function createGeocoder(): Geocoder {
  const baseUrl = process.env.GEOCODER_URL;
  return baseUrl
    ? new HttpGeocoder(baseUrl, process.env.GEOCODER_API_KEY)
    : new UnavailableGeocoder();
}
