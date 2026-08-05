import { beforeEach, describe, expect, it } from 'vitest';

import { FakeMapProvider } from './fake';
import type { MapProviderConfig } from './types';

const config: MapProviderConfig = {
  providerAttribution: 'Test tiles',
  providerName: 'Test provider',
  styleUrl: 'https://example.test/style.json',
};

class TestElement {
  ariaLabel = '';
  className = '';
  dataset: Record<string, string> = {};
  textContent = '';
  children: TestElement[] = [];

  replaceChildren(...children: TestElement[]) {
    this.children = children;
  }

  setAttribute() {}
}

const testDocument = {
  createElement: () => new TestElement(),
};

describe('FakeMapProvider', () => {
  beforeEach(() => {
    globalThis.document = testDocument as unknown as Document;
  });

  it('renders marker data as an accessible DOM list', async () => {
    const container = new TestElement();
    const provider = new FakeMapProvider(config);

    await provider.init(container as unknown as HTMLElement);
    provider.setMarkers([
      { id: 'mainau', label: 'Mainau Island', coordinates: { latitude: 47.7, longitude: 9.19 } },
    ]);

    expect(container.children[0]!.dataset.mapProvider).toBe('fake');
    expect(container.children[0]!.children[0]!.textContent).toContain('Mainau Island');
    expect(provider.getAttribution().text).toBe('Test tiles');
  });
});
