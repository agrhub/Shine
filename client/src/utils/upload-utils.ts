export interface UploadedAsset {
  id: string;
  name: string;
  filePath: string;
  contentType?: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  url: string;
}

/**
 * Fetches all uploaded assets stored in the backend SQLite database.
 */
export async function fetchUploadedAssets(): Promise<UploadedAsset[]> {
  try {
    const res = await fetch('/api/uploads');
    if (!res.ok) return [];
    const data = await res.json();
    if (data.success && Array.isArray(data.uploads)) {
      return data.uploads;
    }
    return [];
  } catch (e) {
    console.error('Failed to fetch uploads from SQLite backend:', e);
    return [];
  }
}

/**
 * Uploads files directly to the Express backend via POST /api/uploads (multipart/form-data).
 * Express then uploads to S3/R2/B2, stores metadata in SQLite database, and returns relative URLs (/api/media/...).
 * Supports real-time upload progress callback.
 */
export async function uploadFilesToBackend(
  files: FileList | File[],
  onProgress?: (percentage: number) => void
): Promise<UploadedAsset[]> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) return [];

  const formData = new FormData();
  fileArray.forEach((file) => {
    formData.append('files', file);
  });

  return new Promise<UploadedAsset[]>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && Array.isArray(res.uploads)) {
            resolve(res.uploads);
          } else {
            reject(new Error(res.error || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(formData);
  });
}

/**
 * Convenience single-file wrapper.
 */
export async function uploadFile(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<UploadedAsset> {
  const results = await uploadFilesToBackend([file], onProgress);
  if (!results || results.length === 0) {
    throw new Error('No asset returned from upload');
  }
  return results[0];
}

/**
 * Deletes an uploaded asset from backend S3 storage and SQLite database.
 */
export async function deleteUploadedFile(filePath: string): Promise<boolean> {
  try {
    const res = await fetch('/api/uploads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to delete upload:', e);
    return false;
  }
}
