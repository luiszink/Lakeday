import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  attractionFindFirst: vi.fn(),
  reportCreate: vi.fn(),
}));

vi.mock('../../../src/auth/database', () => ({
  database: {
    attraction: { findFirst: mocks.attractionFindFirst },
    userReport: { create: mocks.reportCreate },
  },
}));

import { POST } from './route';

const attractionId = '00000000-0000-4000-8000-000000000101';

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request('http://localhost/api/reports', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('reports route', () => {
  beforeEach(() => {
    mocks.attractionFindFirst.mockReset();
    mocks.reportCreate.mockReset().mockResolvedValue({ id: 'report-id' });
  });

  it('validates the report contract', async () => {
    const response = await POST(request({ attractionId, category: 'WRONG_HOURS', locale: 'de' }));

    expect(response.status).toBe(404);
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });

  it('persists a report only for a published attraction', async () => {
    mocks.attractionFindFirst.mockResolvedValue({ id: attractionId });

    const response = await POST(
      request({
        attractionId,
        category: 'WRONG_HOURS',
        locale: 'de',
        message: 'Die Zeiten stimmen heute nicht.',
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ accepted: true, reportId: 'report-id' });
    expect(mocks.attractionFindFirst).toHaveBeenCalledWith({
      where: { id: attractionId, status: 'PUBLISHED' },
      select: { id: true },
    });
    expect(mocks.reportCreate).toHaveBeenCalledWith({
      data: {
        attractionId,
        category: 'WRONG_HOURS',
        locale: 'de',
        message: 'Die Zeiten stimmen heute nicht.',
      },
      select: { id: true },
    });
  });

  it('silently accepts honeypot submissions without persistence', async () => {
    const response = await POST(
      request({
        attractionId,
        category: 'OTHER',
        locale: 'en',
        honeypot: 'bot content',
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ accepted: true });
    expect(mocks.attractionFindFirst).not.toHaveBeenCalled();
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });

  it('rejects an oversized message before persistence', async () => {
    const response = await POST(
      request({
        attractionId,
        category: 'OTHER',
        locale: 'en',
        message: 'x'.repeat(1_001),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reportCreate).not.toHaveBeenCalled();
  });
});
