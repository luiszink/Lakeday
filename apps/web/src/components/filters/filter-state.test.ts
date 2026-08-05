import { describe, expect, it } from 'vitest';

import {
  countActiveFilters,
  readFilterState,
  toggleFilterValue,
  writeFilterState,
} from './filter-state';

describe('filter URL state', () => {
  it('round-trips multi-value, boolean, and radius filters', () => {
    const state = readFilterState(
      'cat=museum,playground&wheelchair=1&near=47.661,9.175&r=5&view=list',
    );

    expect(writeFilterState(state)).toBe(
      'cat=museum%2Cplayground&near=47.661%2C9.175&r=5&wheelchair=1',
    );
    expect(countActiveFilters(state)).toBe(4);
  });

  it('toggles one value without disturbing other dimensions', () => {
    const state = readFilterState('cat=museum,playground&price=free');

    expect(toggleFilterValue(state, 'cat', 'museum')).toEqual({ cat: 'playground', price: 'free' });
    expect(toggleFilterValue(state, 'cat', 'castle_palace')).toEqual({
      cat: 'museum,playground,castle_palace',
      price: 'free',
    });
  });
});
