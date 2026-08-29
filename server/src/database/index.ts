import '../config/env.js';
import { IDatabaseProvider } from './IDatabaseProvider.js';
import { SQLiteProvider } from './SQLiteProvider.js';
import { MongoDBProvider } from './MongoDBProvider.js';
import { FirestoreProvider } from './FirestoreProvider.js';
import { MapDBProvider } from './MapDBProvider.js';

let activeProvider: IDatabaseProvider | null = null;
let initPromise: Promise<IDatabaseProvider> | null = null;

export async function getDatabaseProvider(): Promise<IDatabaseProvider> {
  if (activeProvider) return activeProvider;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const providerType = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();
    console.log(`[DatabaseFactory] Selected DB Provider: ${providerType.toUpperCase()}`);

    let instance: IDatabaseProvider;

    if (providerType === 'mongodb' || providerType === 'mongo') {
      instance = new MongoDBProvider();
    } else if (providerType === 'firestore' || providerType === 'gcp') {
      instance = new FirestoreProvider();
    } else if (providerType === 'mapdb' || providerType === 'memory' || providerType === 'map') {
      instance = new MapDBProvider();
    } else {
      instance = new SQLiteProvider();
    }

    try {
      await instance.initialize();
      activeProvider = instance;
    } catch (err: any) {
      if (providerType === 'mongodb' || providerType === 'mongo' || providerType === 'firestore') {
        console.warn(`[DatabaseFactory] ${providerType.toUpperCase()} connection failed, falling back to SQLite / MapDB:`, err.message);
        try {
          const fallback = new SQLiteProvider();
          await fallback.initialize();
          activeProvider = fallback;
        } catch {
          const mapFallback = new MapDBProvider();
          await mapFallback.initialize();
          activeProvider = mapFallback;
        }
      } else {
        // SQLite fallback to MapDB
        console.warn('[DatabaseFactory] SQLite initialization failed, falling back to MapDB:', err.message);
        const mapFallback = new MapDBProvider();
        await mapFallback.initialize();
        activeProvider = mapFallback;
      }
    }

    return activeProvider!;
  })();

  return initPromise!;
}

export * from './IDatabaseProvider.js';
export * from './MongoDBProvider.js';
export * from './SQLiteProvider.js';
export * from './FirestoreProvider.js';
export * from './MapDBProvider.js';
