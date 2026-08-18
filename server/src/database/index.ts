import '../config/env.js';
import { IDatabaseProvider } from './IDatabaseProvider.js';
import { SQLiteProvider } from './SQLiteProvider.js';
import { MongoDBProvider } from './MongoDBProvider.js';

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
    } else {
      instance = new SQLiteProvider();
    }

    try {
      await instance.initialize();
      activeProvider = instance;
    } catch (err: any) {
      if (providerType === 'mongodb' || providerType === 'mongo') {
        console.warn('[DatabaseFactory] MongoDB connection failed, falling back to SQLite:', err.message);
        const fallback = new SQLiteProvider();
        await fallback.initialize();
        activeProvider = fallback;
      } else {
        throw err;
      }
    }

    return activeProvider;
  })();

  return initPromise;
}

export * from './IDatabaseProvider.js';
export * from './MongoDBProvider.js';
