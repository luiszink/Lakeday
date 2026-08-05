import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { createFavoritesStore } from './favorites';

const attractionId = '00000000-0000-4000-8000-000000000001';
const otherAttractionId = '00000000-0000-4000-8000-000000000002';

describe('favorites-store', () => {
  it('persists favorites in IndexedDB and exposes a sync-ready record', async () => {
    const databaseName = `lake-favorites-test-persistent-${Date.now()}`;
    const store = createFavoritesStore({ databaseName });
    const added = await store.add(attractionId, '2026-08-05T12:00:00.000Z');
    const reloadedStore = createFavoritesStore({ databaseName });

    expect(await store.getAvailability()).toBe('persistent');
    expect(added).toEqual({
      attractionId,
      addedAt: '2026-08-05T12:00:00.000Z',
      syncState: 'local',
    });
    expect(await reloadedStore.has(attractionId)).toBe(true);

    await reloadedStore.remove(attractionId);
    expect(await reloadedStore.getAll()).toEqual([]);
  });

  it('falls back to session memory when IndexedDB is unavailable', async () => {
    const store = createFavoritesStore({ indexedDB: undefined });

    await store.add(otherAttractionId);

    expect(await store.getAvailability()).toBe('session');
    expect(await store.has(otherAttractionId)).toBe(true);
    expect(store.getSnapshot()).toContain('session|');
  });
});