import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageAdapter } from './StorageAdapter.js';
import { config } from '@/config/env.js';

export class S3StorageAdapter implements IStorageAdapter {
  private client: S3Client | null = null;
  private bucket: string = '';
  private static instance: S3StorageAdapter | null = null;

  public static getInstance(): S3StorageAdapter {
    if (!this.instance) {
      this.instance = new S3StorageAdapter();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    S3StorageAdapter.instance = null;
  }

  public destroy(): void {
    this.client = null;
    S3StorageAdapter.instance = null;
  }

  constructor() {
    const bucket = config.s3.bucket;
    const accessKeyId = config.s3.accessKeyId;
    const secretAccessKey = config.s3.secretAccessKey;
    const accountId = config.s3.accountId;
    let region = config.s3.region || 'auto';
    let endpoint = config.s3.endpoint;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 / R2 / B2 storage is not properly configured.');
    }

    // Auto-detect Backblaze B2 endpoint if accessKeyId starts with '00' (B2 Key ID format)
    if (!endpoint && (accessKeyId.startsWith('00') || config.s3.provider === 'b2')) {
      region = region === 'auto' ? 'us-west-004' : region;
      endpoint = `https://s3.${region}.backblazeb2.com`;
    } else if (!endpoint && accountId) {
      // Auto-detect Cloudflare R2 endpoint if accountId is provided
      endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  public async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ key: string; url: string }> {
    if (!this.client) throw new Error('S3 client not initialized');

    let data: Buffer;
    if (typeof body === 'string') data = Buffer.from(body, 'utf-8');
    else if (Buffer.isBuffer(body)) data = body;
    else data = Buffer.from(body);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });

    await this.client.send(command);
    const url = `/api/media/${key}`;
    return { key, url };
  }

  public async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) throw new Error('S3 client not initialized');
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  public async deleteFile(key: string): Promise<void> {
    if (!this.client) throw new Error('S3 client not initialized');
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  public async deleteFolder(prefix: string): Promise<void> {
    if (!this.client) throw new Error('S3 client not initialized');
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const listResponse = await this.client.send(listCommand);
    if (!listResponse.Contents || listResponse.Contents.length === 0) return;

    const objectsToDelete = listResponse.Contents.map((obj) => ({ Key: obj.Key }));
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: { Objects: objectsToDelete },
    });

    await this.client.send(deleteCommand);
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.client) throw new Error('S3 client not initialized');
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (e: any) {
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  }

  public async listFiles(
    prefix?: string
  ): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>> {
    if (!this.client) throw new Error('S3 client not initialized');
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });

    const response = await this.client.send(command);
    const contents = response.Contents || [];

    return contents.map((obj) => ({
      key: obj.Key!,
      url: `/api/media/${obj.Key}`,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  public async getFileMetadata(key: string): Promise<{ size?: number; contentType?: string } | null> {
    if (!this.client) return null;
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key.replace(/^\/+/, ''),
      });
      const res = await this.client.send(command);
      return {
        size: Number(res.ContentLength || 0),
        contentType: res.ContentType,
      };
    } catch {
      return null;
    }
  }

  public async getFileStream(
    key: string,
    options?: { start?: number; end?: number } | string
  ): Promise<any> {
    if (!this.client) throw new Error('S3 client not initialized');

    let rangeHeader: string | undefined;
    if (typeof options === 'string') {
      rangeHeader = options || undefined;
    } else if (typeof options === 'object' && options !== null && options.start !== undefined) {
      const end = options.end !== undefined ? options.end : '';
      rangeHeader = `bytes=${options.start}-${end}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key.replace(/^\/+/, ''),
      Range: rangeHeader,
    });
    const response = await this.client.send(command);

    return {
      stream: response.Body,
      status: response.ContentRange ? 206 : (response.$metadata.httpStatusCode || 200),
      headers: {
        'content-range': response.ContentRange,
        'content-length': response.ContentLength ? String(response.ContentLength) : undefined,
        'content-type': response.ContentType,
        'accept-ranges': 'bytes',
      },
    };
  }

  public async getUploadUrl(
    key: string,
    contentType: string = 'application/octet-stream',
    expiresIn: number = 3600
  ): Promise<string> {
    if (!this.client) throw new Error('S3 client not initialized');
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return await getSignedUrl(this.client, command, { expiresIn });
  }
}
