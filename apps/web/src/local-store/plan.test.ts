import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { createPlansStore } from './plan';

const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';

describe('plans-store', () => {
  it('persists stops and supports duplicate-safe reorder operations', async () => {
    const databaseName = `lake-plans-test-${Date.now()}`;
    const store = createPlansStore({ databaseName });

    expect((await store.add(firstId, 60)).status).toBe('added');
    expect((await store.add(firstId)).status).toBe('duplicate');
    await store.add(secondId);
    await store.move(secondId, 'up');

    const reloadedStore = createPlansStore({ databaseName });
    expect((await reloadedStore.getActive()).stops.map((stop) => stop.attractionId)).toEqual([
      secondId,
      firstId,
    ]);
    expect((await reloadedStore.getActive()).stops[1]?.plannedDurationMin).toBe(60);
  });

  it('enforces the twenty-stop cap and supports session fallback', async () => {
    const store = createPlansStore({ indexedDB: undefined });
    for (let index = 0; index < 20; index += 1) {
      await store.add(`00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`);
    }

    expect((await store.add('00000000-0000-4000-8000-000000000999')).status).toBe('limit');
    expect(await store.getAvailability()).toBe('session');
    expect((await store.getActive()).stops).toHaveLength(20);
  });

  it('persists plan metadata, duration overrides, removal and snapshots', async () => {
    const store = createPlansStore({ databaseName: `lake-plans-metadata-${Date.now()}` });
    await store.add(firstId);

    await store.setDate('2026-08-12');
    await store.setDayStart('08:30');
    await store.setStartPoint({
      coordinates: { latitude: 47.66, longitude: 9.17 },
      label: 'Konstanz',
    });
    await store.setDuration(firstId, 90);
    const saved = await store.saveSnapshot();
    await store.remove(firstId);

    expect(saved.date).toBe('2026-08-12');
    expect(saved.dayStart).toBe('08:30');
    expect(saved.startPoint?.label).toBe('Konstanz');
    expect(saved.stops[0]?.plannedDurationMin).toBe(90);
    expect((await store.getSnapshots()).map((snapshot) => snapshot.id)).toContain(saved.id);
    expect((await store.getActive()).stops).toEqual([]);

    const duplicate = await store.duplicateSnapshot(saved.id);
    expect(duplicate?.id).not.toBe(saved.id);
    await store.restoreSnapshot(saved.id);
    expect((await store.getActive()).stops[0]?.attractionId).toBe(firstId);
    await store.deleteSnapshot(saved.id);
    expect((await store.getSnapshots()).map((snapshot) => snapshot.id)).not.toContain(saved.id);
  });
});