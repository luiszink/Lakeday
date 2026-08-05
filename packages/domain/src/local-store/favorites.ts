import { z } from 'zod';

export const favoriteRecordSchema = z
  .object({
    attractionId: z.string().uuid(),
    addedAt: z.string().datetime({ offset: true }),
    syncState: z.literal('local'),
  })
  .strict();

const legacyFavoriteRecordSchema = z
  .object({
    attractionId: z.string().uuid(),
    addedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type FavoriteRecord = Readonly<z.infer<typeof favoriteRecordSchema>>;
export type FavoriteStorageMode = 'persistent' | 'session';

export interface FavoritesStore {
  add(attractionId: string, addedAt?: string): Promise<FavoriteRecord>;
  getAll(): Promise<readonly FavoriteRecord[]>;
  getAvailability(): Promise<FavoriteStorageMode>;
  getSnapshot(): string;
  has(attractionId: string): Promise<boolean>;
  hydrate(): Promise<void>;
  remove(attractionId: string): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export function createFavoriteRecord(attractionId: string, addedAt = new Date().toISOString()) {
  return favoriteRecordSchema.parse({ attractionId, addedAt, syncState: 'local' });
}

export function migrateFavoriteRecord(value: unknown): FavoriteRecord | null {
  const current = favoriteRecordSchema.safeParse(value);
  if (current.success) return current.data;

  const legacy = legacyFavoriteRecordSchema.safeParse(value);
  return legacy.success ? { ...legacy.data, syncState: 'local' } : null;
}