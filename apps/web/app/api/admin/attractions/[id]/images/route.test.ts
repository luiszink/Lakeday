import { beforeEach, describe, expect, it, vi } from 'vitest';

const { database } = vi.hoisted(() => ({
  database: {
    attraction: { findUnique: vi.fn() },
    attractionImage: { create: vi.fn() },
    licence: { findUnique: vi.fn() },
  },
}));

vi.mock('../../../../../../src/auth/admin-guard', () => ({
  requireRole: vi.fn().mockResolvedValue({ role: 'EDITOR' }),
}));
vi.mock('../../../../../../src/auth/csrf', () => ({ hasSameOrigin: vi.fn(() => true) }));
vi.mock('../../../../../../src/auth/database', () => ({ database }));

import { POST } from './route';

function upload(file: File, fields: Record<string, string>) {
  const form = new FormData();
  form.set('file', file);
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request('http://localhost/api/admin/attractions/attraction-id/images', {
    body: form,
    method: 'POST',
    headers: { origin: 'http://localhost' },
  });
}

const validFields = {
  altDe: 'Ein Bild der Attraktion',
  altEn: 'An image of the attraction',
  attributionText: 'Photo: Example',
  licenceId: '11111111-1111-4111-8111-111111111111',
  sourceUrl: 'https://example.com/source',
};

describe('admin attraction image upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.attraction.findUnique.mockResolvedValue({ id: 'attraction-id' });
    database.licence.findUnique.mockResolvedValue({ id: validFields.licenceId });
  });

  it('requires licence and attribution metadata', async () => {
    const response = await POST(
      upload(new File([Buffer.from('image')], 'image.jpg', { type: 'image/jpeg' }), {
        altDe: validFields.altDe,
        altEn: validFields.altEn,
        licenceId: '',
        attributionText: '',
      }),
      { params: Promise.resolve({ id: 'attraction-id' }) },
    );

    expect(response.status).toBe(400);
    expect(database.licence.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unsupported file types before storage', async () => {
    const response = await POST(
      upload(
        new File([Buffer.from('not an image')], 'image.gif', { type: 'image/gif' }),
        validFields,
      ),
      { params: Promise.resolve({ id: 'attraction-id' }) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('UNSUPPORTED_TYPE');
    expect(database.attractionImage.create).not.toHaveBeenCalled();
  });
});
