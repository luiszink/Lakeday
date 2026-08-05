import { describe, expect, it } from 'vitest';

import { attractionListQuerySchema } from '../api/attractions';
import { filterSpecSchema } from './index';

describe('filter query schema', () => {
  it('accepts the deterministic sort modes', () => {
    expect(attractionListQuerySchema.parse({ sort: 'distance' }).sort).toBe('distance');
    expect(attractionListQuerySchema.parse({ sort: 'relevance' }).sort).toBe('relevance');
  });

  it('normalizes comma-separated values and boolean must filters', () => {
    const result = attractionListQuerySchema.parse({
      cat: 'museum,museum,castle_palace',
      dogs: '1',
      limit: '20',
      locale: 'de',
      wheelchair: '1',
    });

    expect(result.cat).toEqual(['museum', 'castle_palace']);
    expect(result.dogs).toBe(true);
    expect(result.wheelchair).toBe(true);
  });

  it('rejects unsupported radius values and oversized filter lists', () => {
    expect(() => filterSpecSchema.parse({ r: '3' })).toThrow();
    expect(() =>
      filterSpecSchema.parse({ region: Array.from({ length: 31 }, (_, i) => `r${i}`).join(',') }),
    ).toThrow();
  });

  it('rounds a location and requires the radius pair', () => {
    const result = filterSpecSchema.parse({ near: '47.6605,9.1751', r: '5' });

    expect(result.near).toEqual({ latitude: 47.661, longitude: 9.175 });
    expect(() => filterSpecSchema.parse({ near: '47.6605,9.1751' })).toThrow();
  });

  it('accepts open-now and open-on-date values', () => {
    expect(filterSpecSchema.parse({ open: 'now' }).open).toBe('now');
    expect(filterSpecSchema.parse({ open: 'date:2026-05-25' }).open).toBe('date:2026-05-25');
    expect(() => filterSpecSchema.parse({ open: 'date:tomorrow' })).toThrow();
    expect(() => filterSpecSchema.parse({ open: 'date:2026-02-30' })).toThrow();
  });
});
