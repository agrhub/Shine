export interface UserEntity {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  avatar?: string;
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
  status: string;
  created_at?: string;
  updated_at?: string;
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

export interface IDatabaseProvider {
  initialize(): Promise<void>;

  // Users
  createUser(user: UserEntity): Promise<UserEntity>;
  getUserByEmail(email: string): Promise<UserEntity | null>;
  getUserById(id: string): Promise<UserEntity | null>;
  updateUser(user: UserEntity): Promise<UserEntity>;
  updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null>;

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

  // System Settings
  getSystemSetting<T = any>(key: string): Promise<T | null>;
  saveSystemSetting<T = any>(key: string, value: T): Promise<void>;
}
