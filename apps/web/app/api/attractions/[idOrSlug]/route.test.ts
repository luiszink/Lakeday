import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  readWgs84Point: vi.fn(),
}));

vi.mock('../../../../src/auth/database', () => ({
  database: {
    attraction: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
    },
  },
}));

vi.mock('@lake/db', async () => {
  const actual = await vi.importActual<typeof import('@lake/db')>('@lake/db');
  return { ...actual, readWgs84Point: mocks.readWgs84Point };
});

import { GET } from './route';

const attractionId = '00000000-0000-4000-8000-000000000101';

function detailAttraction(hoursUnknown = true) {
  return {
    id: attractionId,
    status: 'PUBLISHED',
    countryCode: 'CH',
    municipality: 'Kreuzlingen',
    regionCode: 'THURGAU_UFER',
    bookingRequirement: 'NONE',
    bookingUrl: null,
    dogPolicy: 'UNKNOWN',
    foodOnSite: false,
    cafeOnSite: false,
    heatSuitability: 'OK',
    indoorOutdoor: 'OUTDOOR',
    nearestStopDistanceM: null,
    nearestStopName: null,
    lastVerifiedAt: null,
    parkingAvailability: null,
    parkingNote: null,
    bicycleAccess: null,
    bicycleNote: null,
    picnicAllowed: false,
    officialWebsite: null,
    priceLevel: 'HIGH',
    rainSuitability: 'GOOD',
    seasons: ['ALL_YEAR'],
    strollerSuitable: 'UNKNOWN',
    typicalDurationMin: 90,
    typicalDurationMax: 120,
    toilets: null,
    transportModes: ['WALK'],
    visitorLanguages: ['DE', 'EN'],
    wheelchairAccess: 'UNKNOWN',
    wheelchairToilet: null,
    localizations: [
      {
        slug: 'fixture-chf-price',
        name: 'Test place',
        summary: 'A test place.',
        description: 'A detailed test place.',
        practicalNotes: null,
      },
    ],
    region: { code: 'THURGAU_UFER', nameDe: 'Thurgauer Ufer', nameEn: 'Thurgau shore' },
    categories: [
      {
        category: { code: 'NATURE', labelDe: 'Natur', labelEn: 'Nature' },
      },
    ],
    openingSchedule: {
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date('2026-12-31T00:00:00.000Z'),
      hoursUnknown,
      rules: [],
    },
    closures: [],
    prices: [
      {
        amount: 24,
        audience: 'ADULT',
        currency: 'CHF',
        note: null,
        validFrom: null,
        validTo: null,
      },
    ],
    images: [],
    factProvenances: [],
    aliasesMergedInto: [],
  };
}

function request(url: string) {
  return new Request(url);
}

describe('attraction detail route', () => {
  beforeEach(() => {
    mocks.findFirst.mockReset();
    mocks.findMany.mockReset().mockResolvedValue([]);
    mocks.readWgs84Point.mockReset().mockResolvedValue({ latitude: 47.64, longitude: 9.18 });
  });

  it('rejects invalid detail queries', async () => {
    const response = await GET(request('http://localhost/api/attractions/test?date=invalid'), {
      params: Promise.resolve({ idOrSlug: 'test' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it('only looks up published attractions and returns unknown hours for unknown schedules', async () => {
    mocks.findFirst.mockResolvedValueOnce(detailAttraction());

    const response = await GET(
      request('http://localhost/api/attractions/fixture-chf-price?locale=en&date=2026-08-05'),
      { params: Promise.resolve({ idOrSlug: 'fixture-chf-price' }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
    expect(body).toMatchObject({
      openDate: '2026-08-05',
      openState: 'UNKNOWN',
      prices: [{ amount: 24, currency: 'CHF' }],
      localization: { name: 'Test place', slug: 'fixture-chf-price' },
    });
  });

  it('redirects merged aliases to the localized canonical slug', async () => {
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      aliasesMergedFrom: [
        {
          mergedInto: {
            localizations: [{ slug: 'canonical-place' }],
          },
        },
      ],
    });

    const response = await GET(request('http://localhost/api/attractions/old-place?locale=de'), {
      params: Promise.resolve({ idOrSlug: 'old-place' }),
    });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/de/orte/canonical-place');
    expect(mocks.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
  });

  it('returns not found for draft or archived attractions', async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await GET(request('http://localhost/api/attractions/draft-place?locale=de'), {
      params: Promise.resolve({ idOrSlug: 'draft-place' }),
    });

    expect(response.status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
  });
});
