import { createFakeMapProvider } from './fake';
import { createMapLibreProvider } from './maplibre';
import type { MapProvider, MapProviderConfig } from './types';

export type MapProviderKind = 'fake' | 'maplibre';

export function createMapProvider(kind: MapProviderKind, config: MapProviderConfig): MapProvider {
  return kind === 'fake' ? createFakeMapProvider(config) : createMapLibreProvider(config);
}

export * from './types';
