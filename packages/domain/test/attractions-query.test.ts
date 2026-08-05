import { describe, expect, it } from 'vitest';

import { attractionListQuerySchema } from '../src/api/attractions.js';

const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';

describe('attraction list query', () => {
  it('parses and deduplicates up to 100 requested attraction IDs', () => {
    const result = attractionListQuerySchema.safeParse({
      ids: `${firstId},${secondId},${firstId}`,
      limit: '100',
      locale: 'en',
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ids).toEqual([firstId, secondId]);
  });

  it('rejects malformed requested IDs', () => {
    const result = attractionListQuerySchema.safeParse({ ids: 'not-an-id', locale: 'en' });

    expect(result.success).toBe(false);
  });
});