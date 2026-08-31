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
import { B2Client } from '@backblaze-labs/b2-sdk';
import { createS3ClientConfig } from '@backblaze-labs/b2-sdk/s3';
import { IStorageAdapter } from './StorageAdapter.js';
import { config } from '../../config/env.js';

export class B2StorageAdapter implements IStorageAdapter {
  private b2Client: B2Client | null = null;
  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private isInitialized = false;
  private authPromise: Promise<void> | null = null;
  private static instance: B2StorageAdapter | null = null;

  public static getInstance(): B2StorageAdapter {
    if (!this.instance) {
      this.instance = new B2StorageAdapter();
    }
    return this.instance;
  }

  public static resetInstance(): void {
    if (B2StorageAdapter.instance) {
      B2StorageAdapter.instance.destroy();
    }
  }

  public destroy(): void {
    this.b2Client = null;
    this.s3Client = null;
    this.isInitialized = false;
    this.authPromise = null;
    B2StorageAdapter.instance = null;
  }

  private async ensureAuthorized(): Promise<void> {
    if (this.isInitialized && this.s3Client) return;

    if (!this.authPromise) {
      this.authPromise = (async () => {
        const applicationKeyId =
          config.s3.accessKeyId ||
          process.env.B2_APPLICATION_KEY_ID ||
          process.env.B2_KEY_ID ||
          '';
        const applicationKey =
          config.s3.secretAccessKey ||
          process.env.B2_APPLICATION_KEY ||
          process.env.B2_APP_KEY ||
          '';
        const bucketName =
          config.s3.bucket ||
          process.env.B2_BUCKET_NAME ||
          process.env.B2_BUCKET ||
          '';
        const region = config.s3.region || process.env.B2_REGION || 'us-east-005';

        if (!applicationKeyId || !applicationKey || !bucketName) {
          throw new Error('Backblaze B2 credentials are not properly configured in env.');
        }

        this.bucketName = bucketName;
        this.b2Client = new B2Client({
          applicationKeyId,
          applicationKey,
        });

        await this.b2Client.authorize();

        const s3Config = createS3ClientConfig({
          accountInfo: this.b2Client.accountInfo,
          applicationKeyId,
          applicationKey,
          region,
        });

        this.s3Client = new S3Client(s3Config);
        this.isInitialized = true;
        console.log(
          `[B2StorageAdapter] ✅ Backblaze B2 Client authorized successfully via @backblaze-labs/b2-sdk (Region: ${s3Config.region}, Endpoint: ${s3Config.endpoint})`
        );
      })().catch((err) => {
        this.authPromise = null;
        throw err;
      });
    }

    await this.authPromise;
  }

  public async uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ key: string; url: string }> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    let data: Buffer;
    if (typeof body === 'string') data = Buffer.from(body, 'utf-8');
    else if (Buffer.isBuffer(body)) data = body;
    else data = Buffer.from(body);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    const url = `/api/media/${key}`;
    return { key, url };
  }

  public async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  public async deleteFile(key: string): Promise<void> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  public async deleteFolder(prefix: string): Promise<void> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const listResponse = await this.s3Client.send(listCommand);
    if (!listResponse.Contents || listResponse.Contents.length === 0) return;

    const objectsToDelete = listResponse.Contents.map((obj) => ({ Key: obj.Key }));
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: this.bucketName,
      Delete: { Objects: objectsToDelete },
    });

    await this.s3Client.send(deleteCommand);
  }

  public async exists(key: string): Promise<boolean> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (e: any) {
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
      throw e;
    }
  }

  public async listFiles(
    prefix?: string
  ): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);
    const contents = response.Contents || [];

    return contents.map((obj) => ({
      key: obj.Key!,
      url: `/api/media/${obj.Key}`,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  }

  public async getFileStream(
    key: string,
    options?: { start?: number; end?: number } | string
  ): Promise<any> {
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    let rangeHeader: string | undefined;
    if (typeof options === 'string') {
      rangeHeader = options || undefined;
    } else if (typeof options === 'object' && options !== null && options.start !== undefined) {
      const end = options.end !== undefined ? options.end : '';
      rangeHeader = `bytes=${options.start}-${end}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key.replace(/^\/+/, ''),
      Range: rangeHeader,
    });

    const response = await this.s3Client.send(command);

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
    await this.ensureAuthorized();
    if (!this.s3Client) throw new Error('B2 S3 Client not initialized');

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
