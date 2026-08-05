import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export type ImageStorage = Readonly<{
  put: (key: string, body: Buffer, contentType: string) => Promise<void>;
  publicUrl: (key: string) => string;
}>;

export class MemoryImageStorage implements ImageStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }

  publicUrl(key: string) {
    return `https://memory.invalid/${key}`;
  }
}

class S3ImageStorage implements ImageStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
  ) {}

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Body: body,
        Bucket: this.bucket,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
        Key: key,
      }),
    );
  }

  publicUrl(key: string) {
    return `${this.publicBaseUrl}/${key}`;
  }
}

export function createImageStorage(): ImageStorage {
  if (process.env.NODE_ENV === 'test' || process.env.IMAGE_STORAGE_DRIVER === 'memory') {
    return new MemoryImageStorage();
  }

  const bucket = process.env.IMAGE_STORAGE_BUCKET?.trim();
  const region = process.env.IMAGE_STORAGE_REGION?.trim() || 'eu-central-1';
  const publicBaseUrl = process.env.IMAGE_STORAGE_PUBLIC_BASE_URL?.trim().replace(/\/$/u, '');
  if (!bucket || !publicBaseUrl) {
    throw new Error('Image storage is not configured.');
  }

  const endpoint = process.env.IMAGE_STORAGE_ENDPOINT?.trim();
  const client = new S3Client({
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: process.env.IMAGE_STORAGE_FORCE_PATH_STYLE === 'true',
    region,
    ...(process.env.IMAGE_STORAGE_ACCESS_KEY_ID && process.env.IMAGE_STORAGE_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.IMAGE_STORAGE_ACCESS_KEY_ID,
            secretAccessKey: process.env.IMAGE_STORAGE_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  return new S3ImageStorage(client, bucket, publicBaseUrl);
}
