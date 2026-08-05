import { describe, expect, it } from 'vitest';

import { MapLibreAdapter, type MapLibreLoader } from './maplibre';
import type { MapProviderConfig } from './types';

const config: MapProviderConfig = {
  apiKey: 'test-key',
  providerAttribution: 'Test tiles',
  providerName: 'Test provider',
  providerUrl: 'https://example.test',
  styleUrl: 'https://tiles.example.test/style.json',
};

class TestElement {
  ariaLabel = '';
  className = '';
  dataset: Record<string, string> = {};
  type = '';
}

class TestMarker {
  static instances: TestMarker[] = [];
  coordinates: [number, number] | null = null;
  removed = false;

  constructor(readonly options: { element: TestElement }) {
    TestMarker.instances.push(this);
  }

  setLngLat(coordinates: [number, number]): TestMarker {
    this.coordinates = coordinates;
    return this;
  }

  addTo(): TestMarker {
    return this;
  }

  remove(): void {
    this.removed = true;
  }
}

class TestMap {
  static instance: TestMap | null = null;
  readonly bounds = { east: 10, north: 48, south: 47, west: 8 };
  readonly center = { lat: 47.5, lng: 9 };
  readonly zoom = 8;
  fitBoundsValue: [[number, number], [number, number]] | null = null;
  moveEndListener: (() => void) | null = null;
  errorListener: (() => void) | null = null;
  style = '';

  constructor(options: { style: string }) {
    this.style = options.style;
    TestMap.instance = this;
  }

  fitBounds(bounds: [[number, number], [number, number]]): void {
    this.fitBoundsValue = bounds;
  }

  getBounds() {
    return {
      getEast: () => this.bounds.east,
      getNorth: () => this.bounds.north,
      getSouth: () => this.bounds.south,
      getWest: () => this.bounds.west,
    };
  }

  getCenter() {
    return this.center;
  }

  getZoom(): number {
    return this.zoom;
  }

  on(event: 'moveend' | 'error', listener: () => void): void {
    if (event === 'moveend') this.moveEndListener = listener;
    else this.errorListener = listener;
  }

  remove(): void {}
}

const loader: MapLibreLoader = async () => ({
  Map: TestMap as never,
  Marker: TestMarker as never,
});

describe('MapLibreAdapter', () => {
  it('maps provider config, markers, bounds, and viewport events', async () => {
    globalThis.document = { createElement: () => new TestElement() } as unknown as Document;
    TestMarker.instances = [];
    const provider = new MapLibreAdapter(config, loader);
    const container = new TestElement();
    const viewports: unknown[] = [];

    await provider.init(container as unknown as HTMLElement);
    provider.setMarkers([
      { id: 'mainau', label: 'Mainau Island', coordinates: { latitude: 47.7, longitude: 9.19 } },
    ]);
    provider.fitBounds({ east: 10, north: 48, south: 47, west: 8 });
    provider.onViewportChange((viewport) => viewports.push(viewport));
    TestMap.instance!.moveEndListener!();

    expect(TestMap.instance!.style).toBe('https://tiles.example.test/style.json?key=test-key');
    expect(TestMarker.instances[0]!.coordinates).toEqual([9.19, 47.7]);
    expect(TestMap.instance!.fitBoundsValue).toEqual([
      [8, 47],
      [10, 48],
    ]);
    expect(viewports).toHaveLength(1);
    expect(provider.getAttribution()).toMatchObject({
      openStreetMapUrl: 'https://www.openstreetmap.org/copyright',
      providerName: 'Test provider',
    });
  });
});
