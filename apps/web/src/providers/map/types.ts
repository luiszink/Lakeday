export type MapCoordinate = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type MapBounds = Readonly<{
  north: number;
  east: number;
  south: number;
  west: number;
}>;

export type MapMarker = Readonly<{
  id: string;
  label: string;
  coordinates: MapCoordinate;
}>;

export type MapClusterConfig = Readonly<{
  enabled: boolean;
  maxZoom?: number;
  minPoints?: number;
}>;

export type MapViewport = Readonly<{
  bounds: MapBounds;
  center: MapCoordinate;
  zoom: number;
}>;

export type MapAttribution = Readonly<{
  openStreetMapUrl: string;
  providerName: string;
  providerUrl?: string;
  text: string;
}>;

export type MapProviderConfig = Readonly<{
  apiKey?: string;
  providerAttribution: string;
  providerName: string;
  providerUrl?: string;
  styleUrl: string;
}>;

export type MapProviderErrorCode = 'PROVIDER_UNAVAILABLE' | 'NOT_INITIALIZED';

export class MapProviderError extends Error {
  constructor(
    readonly code: MapProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MapProviderError';
  }
}

export interface MapProvider {
  destroy(): void;
  fitBounds(bounds: MapBounds): void;
  focusMarker(markerId: string): void;
  getAttribution(): MapAttribution;
  init(container: HTMLElement): Promise<void>;
  locateDot(coordinates: MapCoordinate | null): void;
  onError(listener: () => void): () => void;
  onViewportChange(listener: (viewport: MapViewport) => void): () => void;
  setMarkers(markers: readonly MapMarker[], clusterConfig?: MapClusterConfig): void;
}

export type MapProviderFactory = (config: MapProviderConfig) => MapProvider;
