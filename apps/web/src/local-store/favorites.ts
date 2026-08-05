import {
  createFavoriteRecord,
  migrateFavoriteRecord,
  type FavoriteRecord,
  type FavoriteStorageMode,
  type FavoritesStore,
} from '@lake/domain';

const databaseName = 'lake-local';
export const localDatabaseVersion = 2;
const objectStoreName = 'favorites';

type FavoritesStoreOptions = Readonly<{
  databaseName?: string;
  indexedDB?: IDBFactory | undefined;
}>;

function requestResult<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

class BrowserFavoritesStore implements FavoritesStore {
  private readonly databaseName: string;
  private readonly indexedDB: IDBFactory | undefined;
  private databasePromise: Promise<IDBDatabase> | null = null;
  private mode: FavoriteStorageMode | null = null;
  private records = new Map<string, FavoriteRecord>();
  private snapshot = 'unknown|';
  private readonly listeners = new Set<() => void>();

  constructor(options: FavoritesStoreOptions = {}) {
    this.databaseName = options.databaseName ?? databaseName;
    this.indexedDB = 'indexedDB' in options ? options.indexedDB : globalThis.indexedDB;
  }

  async add(attractionId: string, addedAt?: string): Promise<FavoriteRecord> {
    const record = createFavoriteRecord(attractionId, addedAt);
    const mode = await this.getAvailability();
    if (mode === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(objectStoreName, 'readwrite');
        transaction.objectStore(objectStoreName).put(record);
        await transactionComplete(transaction);
      } catch {
        this.switchToSession();
      }
    }
    this.records.set(record.attractionId, record);
    this.publish();
    return record;
  }

  async getAll(): Promise<readonly FavoriteRecord[]> {
    const mode = await this.getAvailability();
    if (mode === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(objectStoreName, 'readonly');
        const values = await requestResult(transaction.objectStore(objectStoreName).getAll());
        this.records = new Map(
          values
            .map((value) => migrateFavoriteRecord(value))
            .filter((value): value is FavoriteRecord => value !== null)
            .map((value) => [value.attractionId, value]),
        );
      } catch {
        this.switchToSession();
      }
    }
    this.publish();
    return [...this.records.values()].sort((first, second) =>
      first.addedAt.localeCompare(second.addedAt),
    );
  }

  async getAvailability(): Promise<FavoriteStorageMode> {
    if (this.mode) return this.mode;
    if (!this.indexedDB) {
      this.switchToSession();
      return 'session';
    }
    try {
      await this.openDatabase();
      this.mode = 'persistent';
      if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
        void navigator.storage.persist().catch(() => undefined);
      }
    } catch {
      this.switchToSession();
    }
    this.publish();
    return this.mode ?? 'session';
  }

  getSnapshot(): string {
    return this.snapshot;
  }

  async has(attractionId: string): Promise<boolean> {
    await this.hydrate();
    return this.records.has(attractionId);
  }

  async hydrate(): Promise<void> {
    await this.getAll();
  }

  async remove(attractionId: string): Promise<void> {
    const mode = await this.getAvailability();
    if (mode === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(objectStoreName, 'readwrite');
        transaction.objectStore(objectStoreName).delete(attractionId);
        await transactionComplete(transaction);
      } catch {
        this.switchToSession();
      }
    }
    this.records.delete(attractionId);
    this.publish();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (!this.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDB!.open(this.databaseName, localDatabaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(objectStoreName)) {
          database.createObjectStore(objectStoreName, { keyPath: 'attractionId' });
        }
        if (!database.objectStoreNames.contains('plans')) {
          database.createObjectStore('plans', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked.'));
    });
    return this.databasePromise;
  }

  private publish() {
    const ids = [...this.records.keys()].sort();
    this.snapshot = `${this.mode ?? 'unknown'}|${ids.join(',')}`;
    this.listeners.forEach((listener) => listener());
  }

  private switchToSession() {
    this.mode = 'session';
    this.databasePromise = null;
  }
}

let defaultStore: BrowserFavoritesStore | null = null;

export function createFavoritesStore(options: FavoritesStoreOptions = {}): FavoritesStore {
  return new BrowserFavoritesStore(options);
}

export function getFavoritesStore(): FavoritesStore {
  defaultStore ??= new BrowserFavoritesStore();
  return defaultStore;
}

export function parseFavoritesSnapshot(snapshot: string): Readonly<{
  ids: ReadonlySet<string>;
  mode: FavoriteStorageMode | 'unknown';
}> {
  const [mode, rawIds = ''] = snapshot.split('|');
  return {
    ids: new Set(rawIds ? rawIds.split(',') : []),
    mode: mode === 'persistent' || mode === 'session' ? mode : 'unknown',
  };
}