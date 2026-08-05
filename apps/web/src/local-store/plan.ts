import { localDatabaseVersion } from './favorites';

const databaseName = 'lake-local';
const planStoreName = 'plans';
const activePlanKey = 'active';
const maximumStops = 20;

export type PlanCoordinates = Readonly<{
  latitude: number;
  longitude: number;
}>;

export type PlanStartPoint = Readonly<{
  label: string;
  coordinates: PlanCoordinates;
}>;

export type PlanStop = Readonly<{
  attractionId: string;
  sortIndex: number;
  plannedDurationMin: number | null;
}>;

export type LocalPlan = Readonly<{
  id: string;
  date: string | null;
  dayStart: string;
  startPoint: PlanStartPoint | null;
  locale: 'de' | 'en';
  createdAt: string;
  updatedAt: string;
  stops: readonly PlanStop[];
}>;

export type PlanAddResult =
  | Readonly<{ status: 'added'; plan: LocalPlan }>
  | Readonly<{ status: 'duplicate'; plan: LocalPlan }>
  | Readonly<{ status: 'limit'; plan: LocalPlan }>;

export type SharedPlanCopy = Readonly<{
  date: string | null;
  locale: 'de' | 'en';
  startPoint: PlanStartPoint | null;
  stops: readonly Readonly<Pick<PlanStop, 'attractionId' | 'plannedDurationMin'>>[];
}>;

export type PlanStorageMode = 'persistent' | 'session';

export type PlansStore = Readonly<{
  add: (attractionId: string, plannedDurationMin?: number | null) => Promise<PlanAddResult>;
  copySharedPlan: (sharedPlan: SharedPlanCopy, mode: 'merge' | 'replace') => Promise<LocalPlan>;
  getActive: () => Promise<LocalPlan>;
  getSnapshots: () => Promise<readonly LocalPlan[]>;
  deleteSnapshot: (id: string) => Promise<void>;
  duplicateSnapshot: (id: string) => Promise<LocalPlan | null>;
  move: (attractionId: string, direction: 'up' | 'down') => Promise<LocalPlan>;
  remove: (attractionId: string) => Promise<LocalPlan>;
  restoreSnapshot: (id: string) => Promise<LocalPlan | null>;
  saveSnapshot: () => Promise<LocalPlan>;
  setDate: (date: string | null) => Promise<LocalPlan>;
  setDayStart: (dayStart: string) => Promise<LocalPlan>;
  setDuration: (attractionId: string, plannedDurationMin: number) => Promise<LocalPlan>;
  setStartPoint: (startPoint: PlanStartPoint | null) => Promise<LocalPlan>;
  getAvailability: () => Promise<PlanStorageMode>;
  getSnapshot: () => string;
  hydrate: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
}>;

type PlanStoreOptions = Readonly<{
  databaseName?: string;
  indexedDB?: IDBFactory | undefined;
}>;

const emptyPlan = (locale: 'de' | 'en' = 'en'): LocalPlan => {
  const now = new Date().toISOString();
  return {
    id: 'active',
    date: null,
    dayStart: '09:00',
    startPoint: null,
    locale,
    createdAt: now,
    updatedAt: now,
    stops: [],
  };
};

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

function newPlanId() {
  return globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

class BrowserPlansStore implements PlansStore {
  private readonly databaseName: string;
  private readonly indexedDB: IDBFactory | undefined;
  private databasePromise: Promise<IDBDatabase> | null = null;
  private mode: PlanStorageMode | null = null;
  private active: LocalPlan = emptyPlan();
  private snapshots: LocalPlan[] = [];
  private hydrated = false;
  private snapshot = 'unknown|0|';
  private readonly listeners = new Set<() => void>();

  constructor(options: PlanStoreOptions = {}) {
    this.databaseName = options.databaseName ?? databaseName;
    this.indexedDB = 'indexedDB' in options ? options.indexedDB : globalThis.indexedDB;
  }

  async add(attractionId: string, plannedDurationMin: number | null = null): Promise<PlanAddResult> {
    await this.hydrate();
    if (this.active.stops.some((stop) => stop.attractionId === attractionId)) {
      return { status: 'duplicate', plan: this.active };
    }
    if (this.active.stops.length >= maximumStops) return { status: 'limit', plan: this.active };
    const next = this.update({
      stops: [
        ...this.active.stops,
        { attractionId, plannedDurationMin, sortIndex: this.active.stops.length },
      ],
    });
    await this.persistActive(next);
    return { status: 'added', plan: next };
  }

  async copySharedPlan(sharedPlan: SharedPlanCopy, mode: 'merge' | 'replace') {
    await this.hydrate();
    const incomingStops = sharedPlan.stops.map((stop, sortIndex) => ({ ...stop, sortIndex }));
    const stops = mode === 'replace'
      ? incomingStops
      : [
          ...this.active.stops,
          ...incomingStops.filter(
            (incomingStop) => !this.active.stops.some((stop) => stop.attractionId === incomingStop.attractionId),
          ),
        ]
          .slice(0, maximumStops)
          .map((stop, sortIndex) => ({ ...stop, sortIndex }));
    const next = this.update({ date: sharedPlan.date, locale: sharedPlan.locale, startPoint: sharedPlan.startPoint, stops });
    await this.persistActive(next);
    return next;
  }

  async getActive() {
    await this.hydrate();
    return this.active;
  }

  async getSnapshots() {
    await this.hydrate();
    return this.snapshots;
  }

  async deleteSnapshot(id: string) {
    await this.hydrate();
    this.snapshots = this.snapshots.filter((snapshot) => snapshot.id !== id);
    if (await this.getAvailability() === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(planStoreName, 'readwrite');
        transaction.objectStore(planStoreName).delete(id);
        await transactionComplete(transaction);
      } catch {
        this.mode = 'session';
      }
    }
    this.publish();
  }

  async duplicateSnapshot(id: string) {
    await this.hydrate();
    const source = this.snapshots.find((snapshot) => snapshot.id === id);
    if (!source) return null;
    const duplicate = { ...source, id: newPlanId(), createdAt: new Date().toISOString() };
    this.snapshots = [duplicate, ...this.snapshots];
    await this.persistSnapshot(duplicate);
    this.publish();
    return duplicate;
  }

  async move(attractionId: string, direction: 'up' | 'down') {
    await this.hydrate();
    const index = this.active.stops.findIndex((stop) => stop.attractionId === attractionId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= this.active.stops.length) return this.active;
    const stops = [...this.active.stops];
    const currentStop = stops[index]!;
    const targetStop = stops[target]!;
    stops[index] = targetStop;
    stops[target] = currentStop;
    const next = this.update({ stops: stops.map((stop, sortIndex) => ({ ...stop, sortIndex })) });
    await this.persistActive(next);
    return next;
  }

  async remove(attractionId: string) {
    await this.hydrate();
    const next = this.update({
      stops: this.active.stops
        .filter((stop) => stop.attractionId !== attractionId)
        .map((stop, sortIndex) => ({ ...stop, sortIndex })),
    });
    await this.persistActive(next);
    return next;
  }

  async restoreSnapshot(id: string) {
    await this.hydrate();
    const source = this.snapshots.find((snapshot) => snapshot.id === id);
    if (!source) return null;
    const restored = { ...source, id: activePlanKey, updatedAt: new Date().toISOString() };
    await this.persistActive(restored);
    return restored;
  }

  async saveSnapshot() {
    await this.hydrate();
    const snapshot = { ...this.active, id: newPlanId(), createdAt: new Date().toISOString() };
    this.snapshots = [snapshot, ...this.snapshots];
    await this.persistSnapshot(snapshot);
    this.publish();
    return snapshot;
  }

  async setDate(date: string | null) {
    return this.updateActive({ date });
  }

  async setDayStart(dayStart: string) {
    return this.updateActive({ dayStart });
  }

  async setDuration(attractionId: string, plannedDurationMin: number) {
    await this.hydrate();
    const next = this.update({
      stops: this.active.stops.map((stop) =>
        stop.attractionId === attractionId ? { ...stop, plannedDurationMin } : stop,
      ),
    });
    await this.persistActive(next);
    return next;
  }

  async setStartPoint(startPoint: PlanStartPoint | null) {
    return this.updateActive({ startPoint });
  }

  async getAvailability() {
    if (this.mode) return this.mode;
    if (!this.indexedDB) {
      this.mode = 'session';
      this.publish();
      return this.mode;
    }
    try {
      await this.openDatabase();
      this.mode = 'persistent';
    } catch {
      this.mode = 'session';
      this.databasePromise = null;
    }
    this.publish();
    return this.mode;
  }

  getSnapshot() {
    return this.snapshot;
  }

  async hydrate() {
    if (this.hydrated) return;
    if ((await this.getAvailability()) === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(planStoreName, 'readonly');
        const records = await requestResult(transaction.objectStore(planStoreName).getAll());
        const active = records.find((record) => record.id === activePlanKey);
        this.active = active ?? this.active;
        this.snapshots = records.filter((record) => record.id !== activePlanKey);
      } catch {
        this.mode = 'session';
      }
    }
    this.hydrated = true;
    this.publish();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async updateActive(change: Partial<Pick<LocalPlan, 'date' | 'dayStart' | 'startPoint'>>) {
    await this.hydrate();
    const next = this.update(change);
    await this.persistActive(next);
    return next;
  }

  private update(change: Partial<Pick<LocalPlan, 'date' | 'dayStart' | 'locale' | 'startPoint' | 'stops'>>) {
    return { ...this.active, ...change, updatedAt: new Date().toISOString() };
  }

  private async persistActive(plan: LocalPlan) {
    this.active = plan;
    if (await this.getAvailability() === 'persistent') {
      try {
        const database = await this.openDatabase();
        const transaction = database.transaction(planStoreName, 'readwrite');
        transaction.objectStore(planStoreName).put(plan);
        await transactionComplete(transaction);
      } catch {
        this.mode = 'session';
      }
    }
    this.publish();
  }

  private async persistSnapshot(snapshot: LocalPlan) {
    if (await this.getAvailability() !== 'persistent') return;
    try {
      const database = await this.openDatabase();
      const transaction = database.transaction(planStoreName, 'readwrite');
      transaction.objectStore(planStoreName).put(snapshot);
      await transactionComplete(transaction);
    } catch {
      this.mode = 'session';
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    if (!this.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
    this.databasePromise = new Promise((resolve, reject) => {
      const request = this.indexedDB!.open(this.databaseName, localDatabaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('favorites')) {
          database.createObjectStore('favorites', { keyPath: 'attractionId' });
        }
        if (!database.objectStoreNames.contains(planStoreName)) {
          database.createObjectStore(planStoreName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable.'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked.'));
    });
    return this.databasePromise;
  }

  private publish() {
    const ids = this.active.stops.map((stop) => stop.attractionId).join(',');
    this.snapshot = `${this.mode ?? 'unknown'}|${this.active.stops.length}|${ids}`;
    this.listeners.forEach((listener) => listener());
  }
}

let defaultStore: BrowserPlansStore | null = null;

export function createPlansStore(options: PlanStoreOptions = {}): PlansStore {
  return new BrowserPlansStore(options);
}

export function getPlansStore(): PlansStore {
  defaultStore ??= new BrowserPlansStore();
  return defaultStore;
}

export const PLAN_MAXIMUM_STOPS = maximumStops;