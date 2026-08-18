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
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get port() {
    return process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || 'shine_jwt_secret_key_2026';
  },
  get jwtRefreshSecret() {
    return process.env.REFRESH_SECRET || 'shine_refresh_token_secret_key_2026';
  },
  get dbProvider() {
    return process.env.DB_PROVIDER || 'sqlite';
  },
  get mongoUri() {
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/shine_db';
  },
  get geminiApiKey() {
    return process.env.GEMINI_API_KEY || '';
  },
  get gcpProjectId() {
    return process.env.GCP_PROJECT_ID || '';
  },
  get geminiModelText() {
    return process.env.GEMINI_MODEL_TEXT || 'gemini-3.1-flash-lite';
  },
  get geminiModelImage() {
    return process.env.GEMINI_MODEL_IMAGE || 'gemini-3.1-flash-lite-image';
  },
  get geminiModelVideo() {
    return process.env.GEMINI_MODEL_VIDEO || 'veo-3.1-generate-001';
  },
  get geminiModelVoice() {
    return process.env.GEMINI_MODEL_TTS || 'gemini-3.1-flash-tts-preview';
  },
  get geminiModelMusic() {
    return process.env.GEMINI_MODEL_MUSIC || 'lyria-3-clip-preview';
  },
  get geminiModelAgent() {
    return process.env.GEMINI_MODEL_AGENT || 'gemini-3.1-flash-lite';
  },
  get geminiTemperature() {
    return Number(process.env.GEMINI_TEMPERATURE) || 0.7;
  },
  get geminiMaxTokens() {
    return Number(process.env.GEMINI_MAX_TOKENS) || 8192;
  },
  get parallelApiKey() {
    return process.env.PARALLEL_API_KEY || '';
  },
  get parallelConcurrency() {
    return Number(process.env.PARALLEL_CONCURRENCY) || 8;
  },
  get parallelEndpoint() {
    return process.env.PARALLEL_ENDPOINT || 'https://api.parallel.ai/v1';
  },
  get clickhouse() {
    return {
      host: process.env.CLICKHOUSE_HOST || 'oq0lfoamri.us-east1.gcp.clickhouse.cloud',
      port: Number(process.env.CLICKHOUSE_PORT) || 8443,
      user: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
      database: process.env.CLICKHOUSE_DB || 'microcine',
    };
  },
  get grafana() {
    return {
      url: process.env.GRAFANA_URL || 'https://bronzeholly2284.grafana.net',
      mcpEndpoint: process.env.GRAFANA_MCP_ENDPOINT || 'https://mcp.grafana.com/mcp',
      apiKey: process.env.GRAFANA_API_KEY || '',
    };
  },
  get pexels() {
    return {
      url: process.env.PEXELS_URL || 'https://api.pexels.com',
      apiKey: process.env.PEXELS_API_KEY || '',
    };
  },
  get deepgram() {
    return {
      url: process.env.DEEPGRAM_URL || 'https://api.deepgram.com/v1',
      apiKey: process.env.DEEPGRAM_API_KEY || '',
      model: process.env.DEEPGRAM_MODEL || 'deepgram-aura',
    };
  },
  get elevenlabs() {
    return {
      url: process.env.ELEVENLABS_URL || 'https://api.elevenlabs.io',
      apiKey: process.env.ELEVENLABS_API_KEY || '',
      model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
    };
  },
  get smtp() {
    const host = process.env.SMTP_HOST || 'smtp.example.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const senderEmail = process.env.SMTP_USER || process.env.SENDER_EMAIL || 'antstudio@agrhub.com';
    const senderName = process.env.SMTP_NAME || process.env.SENDER_NAME || 'Shine';
    const password = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
    const ssl = process.env.SMTP_SECURE === 'true' || port === 465;
    const enabled = Boolean(password || process.env.SMTP_HOST);

    return {
      host,
      smtpHost: host,
      port,
      smtpPort: port,
      ssl,
      senderEmail,
      senderName,
      password,
      enabled,
    };
  },
  get captcha() {
    return {
      method: process.env.CAPTCHA_METHOD || 'yescaptcha',
      apiKey: process.env.YESCAPTCHA_API_KEY || process.env.CAPTCHA_API_KEY || '',
      baseUrl: process.env.CAPTCHA_BASE_URL || 'https://api.yescaptcha.com',
    };
  },
  get defaultCreditRates() {
    return {
      scriptGeneration: Number(process.env.RATE_SCRIPT_GENERATION) || 15,
      characterAnchors: Number(process.env.RATE_CHARACTER_ANCHORS) || 10,
      sceneImage: Number(process.env.RATE_SCENE_IMAGE) || 15,
      videoGeneration: Number(process.env.RATE_VIDEO_GENERATION) || 50,
      voiceoverTts: Number(process.env.RATE_VOICEOVER_TTS) || 10,
      bgmMusic: Number(process.env.RATE_BGM_MUSIC) || 10,
      videoRender: Number(process.env.RATE_VIDEO_RENDER) || 30,
      cliffhangerHook: Number(process.env.RATE_CLIFFHANGER_HOOK) || 5,
      subtitleTranslate: Number(process.env.RATE_SUBTITLE_TRANSLATE) || 5,
    };
  },
  get appUrl() {
    return process.env.APP_URL || 'http://localhost:3000';
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
  },
  get adminEmail() {
    return process.env.ADMIN_EMAIL || 'admin@shinestudio.app';
  },
  get synthIdSecret() {
    return process.env.SYNTHID_SECRET_KEY || 'shine_synthid_google_deepmind_cryptographic_anchor_2026';
  },
  get oauth() {
    return {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
      },
      youtube: {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/youtube/callback',
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/facebook/callback',
      },
      tiktok: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/tiktok/callback',
      },
    };
  },
  get notifications() {
    return {
      slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
      discordWebhook: process.env.DISCORD_WEBHOOK_URL || '',
      emailAlerts: true,
    };
  },
  get ibmConfluent() {
    return {
      bootstrapServers: process.env.IBM_BOOTSTRAP_SERVERS || 'pkc-619z3.us-east1.gcp.confluent.cloud:9092',
      restEndpoint: process.env.IBM_REST_ENDPOINT || 'https://pkc-619z3.us-east1.gcp.confluent.cloud:443',
      apiKey: process.env.IBM_API_KEY || '',
    };
  },
  get replit() {
    return {
      apiKey: process.env.REPLIT_API_KEY || '',
    };
  },
  get pixabay() {
    return {
      apiKey: process.env.PIXABAY_API_KEY || '',
    };
  },
  get freesound() {
    return {
      apiKey: process.env.FREESOUND_API_KEY || '',
      clientId: process.env.FREESOUND_CLIENT_ID || '',
    };
  },
  get parallel() {
    return {
      apiKey: process.env.PARALLEL_API_KEY || '',
      endpoint: process.env.PARALLEL_MCP_SERVER || 'https://task-mcp.parallel.ai/v1',
    };
  },
  s3: storageConfig,
  isStorageConfigured,
};
