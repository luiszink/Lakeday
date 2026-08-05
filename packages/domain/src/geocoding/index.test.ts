import { describe, expect, it } from 'vitest';

import { geocodeQuerySchema, isInsideLakeConstanceScope, roundWgs84Coordinate } from './index.js';

describe('geocoding rules', () => {
  it('rounds coordinates to roughly a 100 metre grid', () => {
    expect(roundWgs84Coordinate({ latitude: 47.65984, longitude: 9.17512 })).toEqual({
      latitude: 47.66,
      longitude: 9.175,
    });
  });

  it('accepts the whole product scope and rejects distant places', () => {
    expect(isInsideLakeConstanceScope({ latitude: 47.66, longitude: 9.17 })).toBe(true);
    expect(isInsideLakeConstanceScope({ latitude: 48.14, longitude: 11.58 })).toBe(false);
  });

  it('requires a useful, bounded query', () => {
    expect(geocodeQuerySchema.safeParse({ locale: 'de', q: 'Konstanz' }).success).toBe(true);
    expect(geocodeQuerySchema.safeParse({ locale: 'de', q: 'K' }).success).toBe(false);
    expect(geocodeQuerySchema.safeParse({ locale: 'de', q: 'x'.repeat(121) }).success).toBe(false);
  });
});
