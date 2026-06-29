import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DepotPickup } from '@/components/depot/HandoverDialog';

// ---------- Schema ---------------------------------------------------------

interface DepotOfflineDB extends DBSchema {
  pickups: {
    key: string; // fixed key 'today' so put always replaces the single cache entry
    value: { key: string; rows: DepotPickup[]; cachedAt: number };
  };
  pendingActions: {
    key: number; // auto-increment
    value: {
      id?: number;
      type: 'handover' | 'return';
      rpcName: string;
      args: Record<string, unknown>;
      createdAt: number;
    };
  };
}

const DB_NAME = 'depot-offline';
const DB_VERSION = 1;
const CACHE_KEY = 'today';

// ---------- Open -----------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<DepotOfflineDB>> | null = null;

function getDb(): Promise<IDBPDatabase<DepotOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DepotOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pickups')) {
          db.createObjectStore('pickups', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      },
    });
  }
  return dbPromise;
}

// ---------- Pickups cache --------------------------------------------------

export async function cachePickups(rows: DepotPickup[]): Promise<void> {
  const db = await getDb();
  await db.put('pickups', { key: CACHE_KEY, rows, cachedAt: Date.now() });
}

export async function getCachedPickups(): Promise<DepotPickup[]> {
  const db = await getDb();
  const entry = await db.get('pickups', CACHE_KEY);
  return entry?.rows ?? [];
}

// ---------- Pending actions queue -----------------------------------------

export interface PendingAction {
  id?: number;
  type: 'handover' | 'return';
  rpcName: string;
  args: Record<string, unknown>;
  createdAt: number;
}

export async function queueAction(action: PendingAction): Promise<void> {
  const db = await getDb();
  await db.add('pendingActions', action);
}

export async function getPendingActions(): Promise<Required<PendingAction>[]> {
  const db = await getDb();
  // idb returns the auto-generated id on the stored object
  return (await db.getAll('pendingActions')) as Required<PendingAction>[];
}

export async function deletePendingAction(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('pendingActions', id);
}

export async function countPendingActions(): Promise<number> {
  const db = await getDb();
  return db.count('pendingActions');
}
