import axios from 'axios';
import { nanoid } from 'nanoid';
import { IStorageAdapter } from './StorageAdapter.js';
import { S3StorageAdapter } from './S3StorageAdapter.js';
import { B2StorageAdapter } from './B2StorageAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { config, isStorageConfigured } from '@/config/env.js';

export type StorageProviderType = 's3' | 'r2' | 'b2' | 'local';

export class StorageFactory {
  private static adapters: Map<string, Promise<IStorageAdapter>> = new Map();

  /**
   * Returns active storage adapter based on env variables or fallback.
   */
  public static async getActiveAdapter(): Promise<IStorageAdapter> {
    let provider: StorageProviderType = 'local';
    const envProvider = (config.s3.provider || '').toLowerCase();

    if (envProvider === 'b2') {
      provider = 'b2';
    } else if (envProvider === 'r2' || (config.s3.accountId && isStorageConfigured())) {
      provider = 'r2';
    } else if (envProvider === 's3' || isStorageConfigured()) {
      provider = 's3';
    } else {
      provider = 'local';
    }

    return this.getAdapter(provider);
  }

  /**
   * Returns singleton instance of requested adapter.
   */
  public static async getAdapter(provider: StorageProviderType): Promise<IStorageAdapter> {
    if (this.adapters.has(provider)) {
      return this.adapters.get(provider)!;
    }

    const adapterPromise = (async () => {
      let adapter: IStorageAdapter;

      if (provider === 'b2') {
        try {
          adapter = B2StorageAdapter.getInstance();
          console.log('[StorageFactory] Active Storage Provider: Backblaze B2 (B2StorageAdapter)');
        } catch (e) {
          console.warn('[StorageFactory] Backblaze B2 config failed, falling back to Local Storage:', e);
          adapter = LocalStorageAdapter.getInstance();
        }
      } else if (provider === 's3' || provider === 'r2') {
        try {
          adapter = S3StorageAdapter.getInstance();
          console.log(`[StorageFactory] Active Storage Provider: ${provider.toUpperCase()} (S3StorageAdapter)`);
        } catch (e) {
          console.warn(`[StorageFactory] Cloud ${provider.toUpperCase()} config failed, falling back to Local Storage:`, e);
          adapter = LocalStorageAdapter.getInstance();
        }
      } else {
        console.log('[StorageFactory] Active Storage Provider: Local Storage (LocalStorageAdapter)');
        adapter = LocalStorageAdapter.getInstance();
      }

      return adapter;
    })();

    this.adapters.set(provider, adapterPromise);
    return adapterPromise;
  }

  /**
   * High-level helper to ingest media (base64 Data URI or remote URL) and store it via active adapter.
   * Returns only key and size metadata.
   */
  public static async uploadMedia(
    sourceUrlOrData: string,
    folder: 'images' | 'videos' | 'audio' | 'music' = 'images',
    defaultExt: string = 'png',
    mimeType?: string
  ): Promise<{ key: string; size: number; contentType: string }> {
    let buffer: Buffer;
    let resolvedContentType: string = mimeType || 'application/octet-stream';
    let ext = defaultExt;

    if (sourceUrlOrData.startsWith('data:')) {
      const matches = sourceUrlOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || matches.length < 3) {
        throw new Error('Invalid Base64 Data URI string');
      }
      resolvedContentType = matches[1];
      if (resolvedContentType.includes('png')) ext = 'png';
      else if (resolvedContentType.includes('jpeg') || resolvedContentType.includes('jpg')) ext = 'jpg';
      else if (resolvedContentType.includes('webp')) ext = 'webp';
      else if (resolvedContentType.includes('mp4')) ext = 'mp4';
      else if (resolvedContentType.includes('webm')) ext = 'webm';
      else if (resolvedContentType.includes('wav')) ext = 'wav';
      else if (resolvedContentType.includes('mp3') || resolvedContentType.includes('mpeg')) ext = 'mp3';

      buffer = Buffer.from(matches[2], 'base64');
    } else if (sourceUrlOrData.startsWith('http://') || sourceUrlOrData.startsWith('https://')) {
      const response = await axios.get(sourceUrlOrData, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data);
      const headerType = response.headers['content-type'];
      if (headerType) {
        resolvedContentType = String(headerType);
      }
    } else {
      buffer = Buffer.from(sourceUrlOrData, 'base64');
    }

    const key = `assets/${folder}/${nanoid()}.${ext}`;
    const adapter = await this.getActiveAdapter();
    await adapter.uploadFile(key, buffer, resolvedContentType);

    return {
      key,
      size: buffer.length,
      contentType: resolvedContentType,
    };
  }

  /**
   * Directly upload raw Buffer to active storage adapter.
   */
  public static async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ key: string; size: number; contentType: string }> {
    const adapter = await this.getActiveAdapter();
    await adapter.uploadFile(key, buffer, contentType);
    return {
      key,
      size: buffer.length,
      contentType,
    };
  }

  /**
   * Get streaming readable stream from active storage adapter.
   */
  public static async getFileStream(key: string): Promise<any> {
    // Check if URL matches /api/assets/file/{storageKey}
    const match = key.match(/(?:\/api\/assets\/file\/)(.+)$/);
    if (match && match[1]) {
      key = decodeURIComponent(match[1]);
    }
    const adapter = await this.getActiveAdapter();
    return adapter.getFileStream(key);
  }

  /**
   * Resolves internal /api/assets/file/* format or raw storage key to a public S3 / Cloud Storage URL.
   */
  public static async resolvePublicUrl(urlOrKey: string): Promise<string> {
    if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;
    const adapter = await this.getActiveAdapter();

    // Check if URL matches /api/assets/file/{storageKey}
    const match = urlOrKey.match(/(?:\/api\/assets\/file\/)(.+)$/);
    if (match && match[1]) {
      const storageKey = decodeURIComponent(match[1]);
      return await adapter.getFileUrl(storageKey);
    }

    // If it's a raw storage key path like 'assets/...' or 'renders/...'
    if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://') && !urlOrKey.startsWith('data:') && !urlOrKey.startsWith('blob:')) {
      return await adapter.getFileUrl(urlOrKey);
    }

    return urlOrKey;
  }

  public static async reset(): Promise<void> {
    const currentAdapters = Array.from(this.adapters.values());
    this.adapters.clear();

    for (const adapterPromise of currentAdapters) {
      try {
        const adapter = await adapterPromise;
        adapter.destroy();
      } catch (err) {
        // Ignore destroy errors
      }
    }
  }
}
