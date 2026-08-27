import type {
  UserEntity,
  CharacterEntity,
  CharacterEpisodeEntity,
  CharacterWardrobeVariant,
  LocationAsset,
  PropAsset,
  ShotFrame,
  SceneEntity,
  SeriesEntity,
  EpisodeEntity,
  EpisodeRenderVersion,
  SystemSettingEntity,
  ApiKeyEntity,
  GenerationLogEntity,
  SocialPlatform,
  SocialAccountEntity,
  AIModelType,
  AIAccountStatus,
  AIAccountType,
  IAIAccount,
  FlowAccountEntity,
  TimelineSnapshotEntity,
  CreditTransactionEntity,
  AssetEntity,
  WorkerHeartbeatEntity,
  WorkerJobEntity,
  ClusterMetricsSummary,
} from '@/types.js';

// Re-export all centralized types for backwards-compatibility
export * from '@/types.js';

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

  // Worker Telemetry & Cluster Monitoring
  recordWorkerHeartbeat(heartbeat: WorkerHeartbeatEntity): Promise<void>;
  getWorkerNodes(): Promise<WorkerHeartbeatEntity[]>;
  recordWorkerJob(job: WorkerJobEntity): Promise<void>;
  getWorkerJobs(filter?: { status?: string; limit?: number }): Promise<WorkerJobEntity[]>;
  getClusterMetrics(): Promise<ClusterMetricsSummary>;
}
