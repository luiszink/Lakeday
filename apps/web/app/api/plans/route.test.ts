import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  attractionFindMany: vi.fn(),
  planCreate: vi.fn(),
}));

vi.mock('../../../src/auth/database', () => ({
  database: {
    attraction: { findMany: mocks.attractionFindMany },
    plan: { create: mocks.planCreate },
  },
}));

import { POST } from './route';
import { resetPlanRateLimits } from '../../../src/api/plan-rate-limit';

const attractionId = '00000000-0000-4000-8000-000000000101';

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request('http://localhost/api/plans', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
    method: 'POST',
  });
}

describe('plans POST route', () => {
  beforeEach(() => {
    resetPlanRateLimits();
    mocks.attractionFindMany.mockReset().mockResolvedValue([{ id: attractionId }]);
    mocks.planCreate.mockReset().mockResolvedValue({ shareToken: 'token-value' });
  });

  it('creates a rounded immutable share snapshot', async () => {
    const response = await POST(
      request({
        date: '2026-08-12',
        locale: 'de',
        startPoint: {
          coordinates: { latitude: 47.6619, longitude: 9.1738 },
          label: 'Konstanz',
        },
        stops: [{ attractionId, plannedDurationMin: 90 }],
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      shareToken: 'token-value',
      url: 'http://localhost/de/plan/token-value',
    });
    expect(mocks.planCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shareToken: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/u),
          startPointX: 9.174,
          startPointY: 47.662,
        }),
      }),
    );
  });

  it('rejects unpublished stops before creating a share', async () => {
    mocks.attractionFindMany.mockResolvedValue([]);
    const response = await POST(request({ locale: 'en', stops: [{ attractionId }] }));

    expect(response.status).toBe(400);
    expect(mocks.planCreate).not.toHaveBeenCalled();
  });

  it('enforces the payload size cap', async () => {
    const response = await POST(
      request({ locale: 'en', stops: [{ attractionId }], padding: 'x'.repeat(33_000) }),
    );

    expect(response.status).toBe(413);
    expect(mocks.planCreate).not.toHaveBeenCalled();
  });

  it('returns 429 after the per-IP POST limit', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await POST(request({ locale: 'en', stops: [{ attractionId }] }, { 'x-forwarded-for': '203.0.113.6' }));
    }

    const response = await POST(
      request({ locale: 'en', stops: [{ attractionId }] }, { 'x-forwarded-for': '203.0.113.6' }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toEqual(expect.any(String));
  });
});