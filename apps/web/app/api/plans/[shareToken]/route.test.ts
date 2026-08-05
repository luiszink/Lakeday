import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  planFindUnique: vi.fn(),
  planUpdate: vi.fn(),
  readWgs84Point: vi.fn(),
}));

vi.mock('@lake/db', () => ({
  Locale: { de: 'de', en: 'en' },
  isPublicHoliday: () => false,
  readWgs84Point: mocks.readWgs84Point,
}));

vi.mock('../../../../src/auth/database', () => ({
  database: {
    plan: { findUnique: mocks.planFindUnique, update: mocks.planUpdate },
  },
}));

import { GET } from './route';
import { resetPlanRateLimits } from '../../../../src/api/plan-rate-limit';

const shareToken = 'a'.repeat(22);
const attractionId = '00000000-0000-4000-8000-000000000101';

function request(headers: HeadersInit = {}) {
  return new Request(`http://localhost/api/plans/${shareToken}?locale=en`, { headers });
}

function context() {
  return { params: Promise.resolve({ shareToken }) };
}

describe('shared plan GET route', () => {
  beforeEach(() => {
    resetPlanRateLimits();
    mocks.planFindUnique.mockReset();
    mocks.planUpdate.mockReset().mockResolvedValue({});
    mocks.readWgs84Point.mockReset().mockResolvedValue({ latitude: 47.66, longitude: 9.17 });
  });

  it('returns a noindex 404 for unknown tokens without a database lookup', async () => {
    const response = await GET(new Request('http://localhost/api/plans/unknown'), {
      params: Promise.resolve({ shareToken: 'unknown' }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(mocks.planFindUnique).not.toHaveBeenCalled();
  });

  it('returns a current snapshot, bumps access time, and recomputes validation', async () => {
    mocks.planFindUnique.mockResolvedValue({
      id: 'plan-1',
      date: new Date('2026-08-12T00:00:00.000Z'),
      lastAccessedAt: new Date('2026-01-01T00:00:00.000Z'),
      locale: 'de',
      startPointLabel: 'Konstanz',
      startPointX: 9.17,
      startPointY: 47.66,
      stops: [
        {
          attractionId,
          plannedDurationMin: 60,
          sortIndex: 0,
          attraction: {
            closures: [],
            factProvenances: [],
            localizations: [{ name: 'Sea Life' }],
            municipality: 'Konstanz',
            openingSchedule: null,
            status: 'PUBLISHED',
            typicalDurationMax: 120,
            typicalDurationMin: 60,
          },
        },
      ],
    });

    const response = await GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(body).toMatchObject({
      locale: 'de',
      shareToken,
      stops: [{ attractionId, available: true, name: 'Sea Life', plannedDurationMin: 60 }],
      validation: { totals: { overallMinutes: 60, visitMinutes: 60 } },
    });
    expect(body.lastAccessedAt).toEqual(expect.any(String));
    expect(mocks.planUpdate).toHaveBeenCalledWith({
      data: { lastAccessedAt: expect.any(Date) },
      where: { id: 'plan-1' },
    });
  });

  it('keeps an unpublished stop in the snapshot as unavailable', async () => {
    mocks.planFindUnique.mockResolvedValue({
      id: 'plan-1',
      date: null,
      locale: 'en',
      startPointLabel: null,
      startPointX: null,
      startPointY: null,
      stops: [
        {
          attractionId,
          plannedDurationMin: null,
          sortIndex: 0,
          attraction: {
            closures: [],
            factProvenances: [],
            localizations: [{ name: 'Removed attraction' }],
            municipality: 'Konstanz',
            openingSchedule: null,
            status: 'ARCHIVED',
            typicalDurationMax: null,
            typicalDurationMin: null,
          },
        },
      ],
    });

    const response = await GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stops).toEqual([
      expect.objectContaining({ attractionId, available: false, name: 'Removed attraction' }),
    ]);
    expect(body.validation.timeline).toEqual([]);
    expect(mocks.readWgs84Point).not.toHaveBeenCalled();
  });

  it('returns 429 after the per-IP GET limit', async () => {
    mocks.planFindUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < 60; attempt += 1) {
      await GET(request({ 'x-forwarded-for': '203.0.113.5' }), context());
    }

    const response = await GET(request({ 'x-forwarded-for': '203.0.113.5' }), context());

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toEqual(expect.any(String));
  });
});