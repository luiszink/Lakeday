import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { MAX_IMAGE_BYTES, processUploadedImage } from './process-image';

async function imageFile() {
  const body = await sharp({
    create: {
      background: { b: 80, g: 140, r: 220 },
      channels: 3,
      height: 12,
      width: 18,
    },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { ImageDescription: 'private GPS-adjacent metadata' } } })
    .toBuffer();
  return new File([body], 'source.jpg', { type: 'image/jpeg' });
}

describe('processUploadedImage', () => {
  it('converts images to webp and strips metadata', async () => {
    const result = await processUploadedImage(await imageFile());
    const metadata = await sharp(result.body).metadata();

    expect(result.contentType).toBe('image/webp');
    expect(metadata.format).toBe('webp');
    expect(metadata.exif).toBeUndefined();
  });

  it('rejects unsupported MIME types', async () => {
    await expect(
      processUploadedImage(
        new File([Buffer.from('not an image')], 'source.gif', { type: 'image/gif' }),
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
  });

  it('rejects files above the upload limit', async () => {
    const file = new File([Buffer.alloc(MAX_IMAGE_BYTES + 1)], 'large.jpg', { type: 'image/jpeg' });
    await expect(processUploadedImage(file)).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });
});
