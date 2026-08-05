import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

type ProcessedImage = Readonly<{
  body: Buffer;
  contentType: 'image/webp';
}>;

export async function processUploadedImage(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new ImageProcessingError(
      'UNSUPPORTED_TYPE',
      'Only JPEG, PNG, and WebP images are allowed.',
    );
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageProcessingError('PAYLOAD_TOO_LARGE', 'Images must be 10 MB or smaller.');
  }

  try {
    const body = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ fit: 'inside', height: 1_600, width: 2_400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { body, contentType: 'image/webp' };
  } catch {
    throw new ImageProcessingError('INVALID_IMAGE', 'The uploaded file is not a valid image.');
  }
}

export class ImageProcessingError extends Error {
  constructor(
    readonly code: 'INVALID_IMAGE' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_TYPE',
    message: string,
  ) {
    super(message);
  }
}
