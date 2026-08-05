import {
  type MapAttribution,
  type MapMarker,
  type MapProvider,
  type MapProviderConfig,
  type MapViewport,
} from './types';

export class FakeMapProvider implements MapProvider {
  private container: HTMLElement | null = null;
  private list: HTMLOListElement | null = null;
  private markers: readonly MapMarker[] = [];
  private readonly listeners = new Set<(viewport: MapViewport) => void>();

  constructor(private readonly config: MapProviderConfig) {}

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    this.list = document.createElement('ol');
    this.list.dataset.mapProvider = 'fake';
    this.list.setAttribute('aria-label', 'Map markers');
    this.container.replaceChildren(this.list);
    this.renderMarkers();
  }

  destroy(): void {
    this.container?.replaceChildren();
    this.container = null;
    this.list = null;
    this.listeners.clear();
  }

  setMarkers(markers: readonly MapMarker[]): void {
    this.markers = markers;
    this.renderMarkers();
  }

  fitBounds(): void {}

  locateDot(): void {}

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

  private renderMarkers(): void {
    if (!this.list) return;
    this.list.replaceChildren(
      ...this.markers.map((marker) => {
        const item = document.createElement('li');
        item.dataset.markerId = marker.id;
        item.textContent = `${marker.label} (${marker.coordinates.latitude}, ${marker.coordinates.longitude})`;
        return item;
      }),
    );
  }
}

export function createFakeMapProvider(config: MapProviderConfig): MapProvider {
  return new FakeMapProvider(config);
}
