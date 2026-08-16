import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }

  // Robustly resolve and sanitize GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const candidatePaths = [
      rawPath,
      path.resolve(process.cwd(), rawPath),
      path.resolve(process.cwd(), '../', rawPath),
      path.resolve(process.cwd(), '../../', rawPath),
      path.resolve(__dirname, '../../', rawPath),
      path.resolve(__dirname, '../../../', rawPath),
      path.resolve(__dirname, '../../../../', rawPath),
    ];

    let foundPath: string | undefined;
    for (const p of candidatePaths) {
      if (p && fs.existsSync(p) && fs.statSync(p).isFile()) {
        foundPath = path.resolve(p);
        break;
      }
    }

    if (foundPath) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = foundPath;
    } else {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  }
}

// Execute immediately upon import
loadEnv();

export const storageConfig = {
  get provider() {
    return (process.env.STORAGE_PROVIDER || process.env.S3_PROVIDER || '').toLowerCase();
  },
  get bucket() {
    return (
      process.env.S3_BUCKET_NAME ||
      process.env.S3_BUCKET ||
      process.env.R2_BUCKET_NAME ||
      process.env.B2_BUCKET_NAME ||
      process.env.B2_BUCKET ||
      ''
    );
  },
  get accessKeyId() {
    return (
      process.env.S3_ACCESS_KEY ||
      process.env.AWS_ACCESS_KEY_ID ||
      process.env.R2_ACCESS_KEY_ID ||
      process.env.B2_APPLICATION_KEY_ID ||
      process.env.B2_KEY_ID ||
      ''
    );
  },
  get secretAccessKey() {
    return (
      process.env.S3_SECRET_KEY ||
      process.env.AWS_SECRET_ACCESS_KEY ||
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.B2_APPLICATION_KEY ||
      process.env.B2_APP_KEY ||
      ''
    );
  },
  get accountId() {
    return process.env.S3_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
  },
  get cdn() {
    return process.env.S3_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DOMAIN || '';
  },
  get region() {
    return (
      process.env.S3_REGION ||
      process.env.AWS_REGION ||
      process.env.R2_REGION ||
      process.env.B2_REGION ||
      'us-east-005'
    );
  },
  get endpoint() {
    return (
      process.env.S3_ENDPOINT ||
      process.env.R2_ENDPOINT_URL ||
      process.env.B2_ENDPOINT ||
      ''
    );
  },
};

export const config = {
  s3: storageConfig,
};

export function isStorageConfigured(): boolean {
  const { bucket, accessKeyId, secretAccessKey } = config.s3;
  return !!(bucket && accessKeyId && secretAccessKey);
}

export const EnvConfig = {
  get port() {
    return process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  },
  get dbProvider() {
    return process.env.DB_PROVIDER || 'sqlite';
  },
  get mongoUri() {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/shine_db';
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY || process.env.VERTEX_AI_API_KEY || '';
  },
  get gcpProjectId() {
    return process.env.GCP_PROJECT_ID || '';
  },
  get geminiModelTextAnalysis() {
    return process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-2.5-flash';
  },
  get geminiModelImageGeneration() {
    return process.env.GEMINI_MODEL_IMAGE_GENERATION || 'imagen-3.0-generate-002';
  },
  get geminiModelVideoGeneration() {
    return process.env.GEMINI_MODEL_VIDEO_GENERATION || 'veo-3.1-t2v-fast_landscape';
  },
  get geminiModelVoice() {
    return process.env.GEMINI_MODEL_VOICE || 'gemini-2.5-flash';
  },
  get geminiModelMusic() {
    return process.env.GEMINI_MODEL_MUSIC || 'lyria-3-preview';
  },
  s3: storageConfig,
  isStorageConfigured,
};
