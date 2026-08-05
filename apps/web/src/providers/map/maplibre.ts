import {
  MapProviderError,
  type MapAttribution,
  type MapBounds,
  type MapClusterConfig,
  type MapCoordinate,
  type MapMarker,
  type MapProvider,
  type MapProviderConfig,
  type MapViewport,
} from './types';

type MapLibreMap = {
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
  getBounds: () => {
    getEast: () => number;
    getNorth: () => number;
    getSouth: () => number;
    getWest: () => number;
  };
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  on: (event: 'moveend', listener: () => void) => void;
  remove: () => void;
};

type MapLibreMarker = {
  addTo: (map: MapLibreMap) => MapLibreMarker;
  remove: () => void;
  setLngLat: (coordinates: [number, number]) => MapLibreMarker;
};

type MapLibreModule = {
  Map: new (
    options: Readonly<{ container: HTMLElement; style: string; attributionControl: boolean }>,
  ) => MapLibreMap;
  Marker: new (options: Readonly<{ element: HTMLElement }>) => MapLibreMarker;
};

export type MapLibreLoader = () => Promise<MapLibreModule>;

export function createMapLibreLoader(): MapLibreLoader {
  return async () => {
    try {
      const loaded = (await import('maplibre-gl')) as unknown as
        MapLibreModule | { default: MapLibreModule };
      return 'default' in loaded ? loaded.default : loaded;
    } catch {
      throw new MapProviderError('PROVIDER_UNAVAILABLE', 'MapLibre is not available.');
    }
  };
}

export class MapLibreAdapter implements MapProvider {
  private map: MapLibreMap | null = null;
  private module: MapLibreModule | null = null;
  private clusterConfig: MapClusterConfig | undefined;
  private readonly markers = new Map<string, MapLibreMarker>();
  private locationMarker: MapLibreMarker | null = null;
  private readonly listeners = new Set<(viewport: MapViewport) => void>();

  constructor(
    private readonly config: MapProviderConfig,
    private readonly load: MapLibreLoader = createMapLibreLoader(),
  ) {}

  async init(container: HTMLElement): Promise<void> {
    this.module = await this.load();
    this.map = new this.module.Map({
      attributionControl: false,
      container,
      style: this.styleUrl(),
    });
    this.map.on('moveend', () => this.emitViewport());
  }

  destroy(): void {
    this.markers.forEach((marker) => marker.remove());
    this.locationMarker?.remove();
    this.markers.clear();
    this.locationMarker = null;
    this.map?.remove();
    this.map = null;
    this.module = null;
    this.listeners.clear();
  }

  setMarkers(markers: readonly MapMarker[], _clusterConfig?: MapClusterConfig): void {
    if (!this.map)
      throw new MapProviderError('NOT_INITIALIZED', 'Map provider is not initialized.');
    if (!this.module) throw new MapProviderError('PROVIDER_UNAVAILABLE', 'MapLibre is not loaded.');
    const module = this.module;
    this.clusterConfig = _clusterConfig;
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    const map = this.map;
    markers.forEach((marker) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.ariaLabel = marker.label;
      element.dataset.markerId = marker.id;
      const mapMarker = new module.Marker({ element })
        .setLngLat([marker.coordinates.longitude, marker.coordinates.latitude])
        .addTo(map);
      this.markers.set(marker.id, mapMarker);
    });
  }

  fitBounds(bounds: MapBounds): void {
    if (!this.map)
      throw new MapProviderError('NOT_INITIALIZED', 'Map provider is not initialized.');
    this.map.fitBounds([
      [bounds.west, bounds.south],
      [bounds.east, bounds.north],
    ]);
  }

  locateDot(coordinates: MapCoordinate | null): void {
    if (!this.map)
      throw new MapProviderError('NOT_INITIALIZED', 'Map provider is not initialized.');
    if (!coordinates) {
      this.locationMarker?.remove();
      this.locationMarker = null;
      return;
    }
    if (!this.module) throw new MapProviderError('PROVIDER_UNAVAILABLE', 'MapLibre is not loaded.');
    this.locationMarker?.remove();
    const element = document.createElement('span');
    element.ariaLabel = 'Current location';
    element.className = 'map-location-dot';
    this.locationMarker = new this.module.Marker({ element })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(this.map);
  }

  onViewportChange(listener: (viewport: MapViewport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAttribution(): MapAttribution {
    return {
      openStreetMapUrl: 'https://www.openstreetmap.org/copyright',
      providerName: this.config.providerName,
      ...(this.config.providerUrl ? { providerUrl: this.config.providerUrl } : {}),
      text: this.config.providerAttribution,
    };
  }

  private styleUrl(): string {
    if (!this.config.apiKey) return this.config.styleUrl;
    const url = new URL(this.config.styleUrl);
    url.searchParams.set('key', this.config.apiKey);
    return url.toString();
  }

  private emitViewport(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    const center = this.map.getCenter();
    const viewport = {
      bounds: {
        east: bounds.getEast(),
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        west: bounds.getWest(),
      },
      center: { latitude: center.lat, longitude: center.lng },
      zoom: this.map.getZoom(),
    } satisfies MapViewport;
    this.listeners.forEach((listener) => listener(viewport));
  }
}

export function createMapLibreProvider(config: MapProviderConfig): MapProvider {
  return new MapLibreAdapter(config);
}
