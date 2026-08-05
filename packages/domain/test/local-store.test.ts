import { describe, expect, it } from 'vitest';

import { migrateFavoriteRecord } from '../src/local-store/favorites.js';

const attractionId = '00000000-0000-4000-8000-000000000001';
const addedAt = '2026-08-05T12:00:00.000Z';

describe('favorite record migration', () => {
  it('upgrades a v1 record to the v1.1 sync-ready shape', () => {
    expect(migrateFavoriteRecord({ attractionId, addedAt })).toEqual({
      attractionId,
      addedAt,
      syncState: 'local',
    });
  });

  it('rejects malformed records instead of persisting them', () => {
    expect(migrateFavoriteRecord({ attractionId, addedAt, syncState: 'remote' })).toBeNull();
  });
});