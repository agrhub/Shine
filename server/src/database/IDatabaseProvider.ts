export interface UserEntity {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'owner' | 'creator' | 'user' | string;
  api_key?: string;
  api_key_rotated_at?: string;
  two_factor_enabled?: boolean;
  integrations?: { id: string; name: string; icon: string; connected: boolean }[];
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  credits: number;
  theme?: string;
  language?: string;
  created_at?: string;
}

export interface SeriesEntity {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  tone?: string;
  synopsis?: string;
  description?: string;
  visual_style?: string;
  target_audience?: string;
  episode_count: number;
  country?: string;
  ratio?: string;
  viral_hook?: string;
  master_plan?: any;
  characters?: any[];
  status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';
  created_at?: string;
  updated_at?: string;
}

export interface EpisodeEntity {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  synopsis?: string;
  scene_core?: string;
  conflict_escalation?: string;
  cliffhanger_hook?: string;
  phase?: string;
  scenes?: any[];
  script?: string;
  duration: number;
  status: 'DRAFT' | 'RENDER' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  languageTracks?: any[];
  activeLanguageCode?: string;
  videoUrlsByLang?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
}

export enum SocialPlatform {
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
}

export interface SocialAccountEntity {
  id?: string;
  userId: string;
  platform: SocialPlatform | string;
  channelId: string;
  channelName: string;
  channelAvatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string | Date;
  scopes?: string[];
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export enum AIModelType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MUSIC = 'music',
  VOICE = 'voice',
}

export enum AIAccountStatus {
  READY = 'READY',
  UNAUTHORIZED = 'UNAUTHORIZED',
  ERROR = 'ERROR',
  ACTIVE = 'ACTIVE',
}

export enum AIAccountType {
  GOOGLE_FLOW = 'google-flow',
  GOOGLE_VERTEX = 'google-vertex',
  API_KEY = 'api-key',
  ANTIGRAVITY = 'antigravity',
  STANDARD = 'standard',
  OPENAI = 'openai',
  CUSTOM = 'custom',
  GOOGLE_CLOUD = 'google-cloud',
}

export interface IAIAccount {
  id?: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  accountType: string;
  status: AIAccountStatus | string;
  flowST?: string;
  flowAT?: string;
  flowATExpiresAt?: Date;
  projectId?: string;
  credits?: number;
  errorMessage?: string;
  lastFingerprint?: Map<string, string>;
  serviceKeys?: Map<string, string>;
  isActive: boolean;
  save(...args: any[]): Promise<any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FlowAccountEntity {
  id: string;
  email: string;
  session_token: string;
  access_token?: string;
  project_id?: string;
  status: string;
  credits_remaining: number;
  last_synced_at?: string;
}

export interface TimelineSnapshotEntity {
  id: string;
  episode_id: string;
  version_number: number;
  label: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  change_summary?: string;
  timeline_data: string;
  created_at?: string;
}

export interface CreditTransactionEntity {
  id: string;
  user_id: string;
  activity: string;
  details?: string;
  amount: number;
  balance_after: number;
  status: 'Success' | 'Failed';
  created_at?: string;
}

export interface AssetEntity {
  id: string;
  user_id?: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'text' | 'render' | string;
  ext?: string;
  size?: string;
  sizeBytes?: number;
  categoryLabel?: string;
  categoryColor?: string;
  s3Key?: string;
  url: string;
  thumbnail?: string;
  seriesId?: string;
  episodeId?: string;
  sceneId?: string;
  characterId?: string;
  prompt?: string;
  provider?: string;
  aspect?: string;
  isVideo?: boolean;
  isAudio?: boolean;
  synthIdVerified?: boolean;
  synthIdHash?: string;
  synthIdMetadata?: any;
  metadata?: any;
  created_at?: string;
}

export interface IDatabaseProvider {
  initialize(): Promise<void>;

  // Users
  createUser(user: UserEntity): Promise<UserEntity>;
  getUserByEmail(email: string): Promise<UserEntity | null>;
  getUserById(id: string): Promise<UserEntity | null>;
  countUsers(): Promise<number>;
  updateUser(user: UserEntity): Promise<UserEntity>;
  updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null>;

  // Credits & Deductions
  deductCredits(userId: string, amount: number, activity: string, details?: string): Promise<{ success: boolean; balance: number; transaction?: CreditTransactionEntity; error?: string }>;
  getCreditHistory(userId?: string, limit?: number): Promise<CreditTransactionEntity[]>;
  recordCreditTransaction(tx: CreditTransactionEntity): Promise<CreditTransactionEntity>;

  // Series
  createSeries(series: SeriesEntity): Promise<SeriesEntity>;
  getSeriesList(userId?: string, search?: string, status?: string): Promise<SeriesEntity[]>;
  getSeriesById(id: string): Promise<SeriesEntity | null>;
  updateSeries(id: string, updates: Partial<SeriesEntity>): Promise<SeriesEntity | null>;
  deleteSeries(id: string): Promise<boolean>;

  // Episodes
  createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity>;
  getEpisodesBySeriesId(seriesId: string): Promise<EpisodeEntity[]>;
  getEpisodeById(id: string): Promise<EpisodeEntity | null>;
  updateEpisode(id: string, updates: Partial<EpisodeEntity>): Promise<EpisodeEntity | null>;

  // Timeline & History Snapshots (Zero-Render Preview & Restore)
  saveTimeline(episodeId: string, timelineData: any, author: { id: string; name: string; avatar?: string }, changeSummary?: string): Promise<{ versionId: string; versionNumber: number; updatedAt: string }>;
  getLatestTimeline(episodeId: string): Promise<any | null>;
  getTimelineHistory(episodeId: string, limit?: number, offset?: number): Promise<{ total: number; history: any[] }>;
  getTimelineVersion(episodeId: string, versionId: string): Promise<any | null>;
  restoreTimelineVersion(episodeId: string, versionId: string, author: { id: string; name: string; avatar?: string }, reason?: string): Promise<any>;

  // Flow Accounts
  getFlowAccounts(status?: string): Promise<FlowAccountEntity[]>;
  upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity>;
  deleteFlowAccount(idOrEmail: string): Promise<boolean>;

  // Assets Library & Storage
  saveAsset(asset: AssetEntity): Promise<AssetEntity>;
  getAssets(filter?: { userId?: string; seriesId?: string; type?: string; characterId?: string; search?: string }): Promise<AssetEntity[]>;
  deleteAsset(id: string): Promise<boolean>;

  // System Settings
  getSystemSetting<T = any>(key: string): Promise<T | null>;
  saveSystemSetting<T = any>(key: string, value: T): Promise<void>;
}

