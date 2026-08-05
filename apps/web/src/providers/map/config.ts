import type { MapProviderConfig } from './types';

export type MapEnvironment = Readonly<{
  [key: string]: string | undefined;
  MAP_TILE_API_KEY?: string;
  MAP_TILE_ATTRIBUTION?: string;
  MAP_TILE_PROVIDER_NAME?: string;
  MAP_TILE_PROVIDER_URL?: string;
  MAP_TILE_URL?: string;
}>;

export function getMapProviderSettings(environment: MapEnvironment): Readonly<{
  config: MapProviderConfig;
  kind: 'fake' | 'maplibre';
}> {
  const config: MapProviderConfig = {
    ...(environment.MAP_TILE_API_KEY ? { apiKey: environment.MAP_TILE_API_KEY } : {}),
    providerAttribution: environment.MAP_TILE_ATTRIBUTION ?? 'Map tiles',
    providerName: environment.MAP_TILE_PROVIDER_NAME ?? 'Configured tile provider',
    ...(environment.MAP_TILE_PROVIDER_URL
      ? { providerUrl: environment.MAP_TILE_PROVIDER_URL }
      : {}),
    styleUrl: environment.MAP_TILE_URL ?? 'https://example.invalid/style.json',
  };

  return {
    config,
    kind:
      environment.MAP_TILE_URL &&
      environment.MAP_TILE_PROVIDER_NAME &&
      environment.MAP_TILE_ATTRIBUTION
        ? 'maplibre'
        : 'fake',
  };
}
