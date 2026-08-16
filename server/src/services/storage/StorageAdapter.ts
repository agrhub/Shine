/**
 * Standardized Storage Adapter interface for vue-editor / openvideo.
 * Supports multi-cloud storage (AWS S3, Cloudflare R2, Backblaze B2, Local Disk).
 */
export interface IStorageAdapter {
  destroy(): void;

  /**
   * Uploads a file buffer or string to storage.
   */
  uploadFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string
  ): Promise<{ key: string; url: string }>;

  /**
   * Retrieves direct or presigned URL for a file key.
   */
  getFileUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Deletes a single file by key.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Deletes multiple files matching a prefix/folder.
   */
  deleteFolder(prefix: string): Promise<void>;

  /**
   * Checks if a file key exists.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Lists files matching an optional prefix.
   */
  listFiles(
    prefix?: string
  ): Promise<Array<{ key: string; url: string; size?: number; lastModified?: Date }>>;

  /**
   * Retrieves readable stream for streaming files (video/audio).
   */
  getFileStream(key: string): Promise<any>;

  /**
   * Gets presigned upload URL for direct client upload.
   */
  getUploadUrl(key: string, contentType?: string, expiresIn?: number): Promise<string>;
}
