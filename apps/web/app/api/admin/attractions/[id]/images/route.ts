import { imageUploadMetadataSchema } from '@lake/domain';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { requireRole } from '../../../../../../src/auth/admin-guard';
import { hasSameOrigin } from '../../../../../../src/auth/csrf';
import { database } from '../../../../../../src/auth/database';
import {
  processUploadedImage,
  ImageProcessingError,
} from '../../../../../../src/media/process-image';
import { createImageStorage } from '../../../../../../src/media/storage';

export const runtime = 'nodejs';

const maxRequestBytes = 11 * 1024 * 1024;
type RouteContext = { params: Promise<{ id: string }> };

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : null;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, context: RouteContext) {
  if (!(await requireRole('EDITOR'))) return errorResponse('FORBIDDEN', 'Forbidden.', 403);
  if (!hasSameOrigin(request)) {
    return errorResponse('CSRF_REJECTED', 'Invalid request origin.', 403);
  }
  if (Number(request.headers.get('content-length') ?? 0) > maxRequestBytes) {
    return errorResponse('PAYLOAD_TOO_LARGE', 'Image upload is too large.', 413);
  }

  const id = (await context.params).id;
  const attraction = await database.attraction.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!attraction) return errorResponse('NOT_FOUND', 'Attraction not found.', 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'A multipart image upload is required.', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse('VALIDATION_ERROR', 'An image file is required.', 400);
  }

  const parsed = imageUploadMetadataSchema.safeParse({
    altDe: field(form, 'altDe'),
    altEn: field(form, 'altEn'),
    attributionText: field(form, 'attributionText'),
    licenceId: field(form, 'licenceId'),
    sortOrder: field(form, 'sortOrder') ?? '0',
    sourceUrl: field(form, 'sourceUrl') || null,
  });
  if (!parsed.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Image licence and attribution metadata are required.',
      400,
    );
  }

  const licence = await database.licence.findUnique({
    where: { id: parsed.data.licenceId },
    select: { id: true },
  });
  if (!licence) return errorResponse('LICENCE_NOT_FOUND', 'Licence not found.', 422);

  let processed;
  try {
    processed = await processUploadedImage(file);
  } catch (error) {
    if (error instanceof ImageProcessingError) {
      const status = error.code === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return errorResponse(error.code, error.message, status);
    }
    return errorResponse('INVALID_IMAGE', 'Unable to process image.', 400);
  }

  const key = `attractions/${attraction.id}/${randomUUID()}.webp`;
  try {
    const storage = createImageStorage();
    await storage.put(key, processed.body, processed.contentType);
    const image = await database.attractionImage.create({
      data: {
        altDe: parsed.data.altDe,
        altEn: parsed.data.altEn,
        attributionText: parsed.data.attributionText,
        attractionId: attraction.id,
        licenceId: licence.id,
        sortOrder: parsed.data.sortOrder,
        sourceUrl: parsed.data.sourceUrl,
        storagePath: storage.publicUrl(key),
      },
      include: { licence: { select: { spdxOrName: true } } },
    });
    return NextResponse.json(
      {
        image: {
          altDe: image.altDe,
          altEn: image.altEn,
          attributionText: image.attributionText,
          id: image.id,
          licence: image.licence.spdxOrName,
          sourceUrl: image.sourceUrl,
          storagePath: image.storagePath,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Admin image upload failed', error);
    return errorResponse('STORAGE_FAILED', 'Unable to store image.', 503);
  }
}
