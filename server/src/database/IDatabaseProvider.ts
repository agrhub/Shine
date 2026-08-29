import type {
  UserEntity,
  CharacterSeriesEntity,
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
  PipelineJobEntity,
} from '@/types.js';

// Re-export all centralized types for backwards-compatibility
export * from '@/types.js';

export interface IDatabaseProvider {
  initialize(): Promise<void>;

  // Authentication & Users
  createUser(user: UserEntity): Promise<UserEntity>;
  getUserByEmail(email: string): Promise<UserEntity | null>;
  getUserById(id: string): Promise<UserEntity | null>;
  countUsers(): Promise<number>;
  updateUser(user: UserEntity): Promise<UserEntity>;
  updateUserPreferences(user_id: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null>;

  // Credits & Deductions
  deductCredits(user_id: string, amount: number, activity: string, details?: string): Promise<{ success: boolean; balance: number; transaction?: CreditTransactionEntity; error?: string }>;
  getCreditHistory(user_id?: string, limit?: number): Promise<CreditTransactionEntity[]>;
  recordCreditTransaction(tx: CreditTransactionEntity): Promise<CreditTransactionEntity>;

  // Series
  createSeries(series: SeriesEntity): Promise<SeriesEntity>;
  getSeriesList(user_id?: string, search?: string, status?: string): Promise<SeriesEntity[]>;
  getSeriesById(id: string): Promise<SeriesEntity | null>;
  updateSeries(id: string, updates: Partial<SeriesEntity>): Promise<SeriesEntity | null>;
  deleteSeries(id: string): Promise<boolean>;

  // Episodes
  createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity>;
  getEpisodesBySeriesId(series_id: string): Promise<EpisodeEntity[]>;
  getEpisodeById(id: string): Promise<EpisodeEntity | null>;
  updateEpisode(id: string, updates: Partial<EpisodeEntity>): Promise<EpisodeEntity | null>;

  // Timeline & History Snapshots (Zero-Render Preview & Restore)
  saveTimeline(episode_id: string, timeline_data: any, author: { id: string; name: string; avatar?: string }, change_summary?: string): Promise<{ version_id: string; version_number: number; updated_at: string }>;
  getLatestTimeline(episode_id: string): Promise<any | null>;
  getTimelineHistory(episode_id: string, limit?: number, offset?: number): Promise<{ total: number; history: any[] }>;
  getTimelineVersion(episode_id: string, version_id: string): Promise<any | null>;
  restoreTimelineVersion(episode_id: string, version_id: string, author: { id: string; name: string; avatar?: string }, reason?: string): Promise<any>;

  // Flow Accounts
  getFlowAccounts(status?: string): Promise<FlowAccountEntity[]>;
  upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity>;
  deleteFlowAccount(idOrEmail: string): Promise<boolean>;

  // Assets Library & Storage
  saveAsset(asset: AssetEntity): Promise<AssetEntity>;
  getAssets(filter?: { user_id?: string; series_id?: string; type?: string; character_id?: string; search?: string }): Promise<AssetEntity[]>;
  deleteAsset(id: string): Promise<boolean>;

  // Pipeline Background Jobs
  savePipelineJob(job: PipelineJobEntity): Promise<PipelineJobEntity>;
  getPipelineJobById(job_id: string): Promise<PipelineJobEntity | null>;
  getPipelineJobs(filter?: { user_id?: string; series_id?: string; episode_id?: string; status?: string; limit?: number }): Promise<PipelineJobEntity[]>;
  updatePipelineJob(job_id: string, patch: Partial<PipelineJobEntity>): Promise<PipelineJobEntity | null>;
  findActivePipelineJob(series_id: string, episode_id: string, type?: string): Promise<PipelineJobEntity | null>;

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
