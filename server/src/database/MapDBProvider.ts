import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import {
  IDatabaseProvider,
  UserEntity,
  SeriesEntity,
  EpisodeEntity,
  FlowAccountEntity,
  CreditTransactionEntity,
  AssetEntity,
  WorkerHeartbeatEntity,
  WorkerJobEntity,
  ClusterMetricsSummary,
  IProject,
  TimelineSnapshotVersion,
  TimelineSnapshotHistoryItem,
  RestoreTimelineResult,
} from './IDatabaseProvider.js';
import { Logger } from '../utils/logger.js';
import { normalizePureTimeline } from '../utils/timeline.js';

export class MapDBProvider implements IDatabaseProvider {
  private filePath: string;
  private users: Map<string, UserEntity> = new Map();
  private creditTransactions: CreditTransactionEntity[] = [];
  private series: Map<string, SeriesEntity> = new Map();
  private episodes: Map<string, EpisodeEntity> = new Map();
  private timelines: Map<string, any> = new Map();
  private timelineVersions: Map<string, any[]> = new Map();
  private flowAccounts: Map<string, FlowAccountEntity> = new Map();
  private assets: Map<string, AssetEntity> = new Map();
  private systemSettings: Map<string, any> = new Map();
  private workerHeartbeats: Map<string, WorkerHeartbeatEntity> = new Map();
  private workerJobs: Map<string, WorkerJobEntity> = new Map();

  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(customPath?: string) {
    const dataDir = process.env.MAPDB_DIR || path.resolve(process.cwd(), 'server', 'data');
    this.filePath = customPath || process.env.MAPDB_PATH || path.join(dataDir, 'mapdb.json');
  }

  public async initialize(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data.users) this.users = new Map(Object.entries(data.users));
        if (Array.isArray(data.creditTransactions)) this.creditTransactions = data.creditTransactions;
        if (data.series) this.series = new Map(Object.entries(data.series));
        if (data.episodes) this.episodes = new Map(Object.entries(data.episodes));
        if (data.timelines) this.timelines = new Map(Object.entries(data.timelines));
        if (data.timelineVersions) this.timelineVersions = new Map(Object.entries(data.timelineVersions));
        if (data.flowAccounts) this.flowAccounts = new Map(Object.entries(data.flowAccounts));
        if (data.assets) this.assets = new Map(Object.entries(data.assets));
        if (data.systemSettings) this.systemSettings = new Map(Object.entries(data.systemSettings));
        if (data.workerHeartbeats) this.workerHeartbeats = new Map(Object.entries(data.workerHeartbeats));
        if (data.workerJobs) this.workerJobs = new Map(Object.entries(data.workerJobs));
        Logger.info(`[MapDBProvider] Loaded database from ${this.filePath} (${this.users.size} users, ${this.series.size} series, ${this.episodes.size} episodes)`);
      } catch (err: any) {
        Logger.warn(`[MapDBProvider] Failed to parse existing data from ${this.filePath}, starting fresh: ${err.message}`);
      }
    } else {
      Logger.info(`[MapDBProvider] Initialized new MapDB store at ${this.filePath}`);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistToDisk().catch(err => {
        Logger.warn(`[MapDBProvider] Error persisting to disk: ${err.message}`);
      });
    }, 200);
  }

  private async persistToDisk(): Promise<void> {
    const data = {
      users: Object.fromEntries(this.users),
      creditTransactions: this.creditTransactions,
      series: Object.fromEntries(this.series),
      episodes: Object.fromEntries(this.episodes),
      timelines: Object.fromEntries(this.timelines),
      timelineVersions: Object.fromEntries(this.timelineVersions),
      flowAccounts: Object.fromEntries(this.flowAccounts),
      assets: Object.fromEntries(this.assets),
      systemSettings: Object.fromEntries(this.systemSettings),
      workerHeartbeats: Object.fromEntries(this.workerHeartbeats),
      workerJobs: Object.fromEntries(this.workerJobs),
    };
    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // ==================== Users ====================
  public async createUser(user: UserEntity): Promise<UserEntity> {
    const id = user.id || `usr_${nanoid(10)}`;
    const created: UserEntity = {
      ...user,
      id,
      credits: user.credits !== undefined ? user.credits : 100,
      tier: user.tier || 'FREE',
      role: user.role || 'user',
      created_at: user.created_at || new Date().toISOString(),
    };
    this.users.set(id, created);
    this.scheduleSave();
    return created;
  }

  public async getUserByEmail(email: string): Promise<UserEntity | null> {
    if (!email) return null;
    const lower = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email && u.email.toLowerCase().trim() === lower) {
        return { ...u };
      }
    }
    return null;
  }

  public async getUserById(id: string): Promise<UserEntity | null> {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  public async countUsers(): Promise<number> {
    return this.users.size;
  }

  public async updateUser(user: UserEntity): Promise<UserEntity> {
    const existing = this.users.get(user.id);
    if (!existing) {
      this.users.set(user.id, { ...user });
      this.scheduleSave();
      return { ...user };
    }
    const updated = { ...existing, ...user };
    this.users.set(user.id, updated);
    this.scheduleSave();
    return updated;
  }

  public async updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    if (prefs.theme) user.theme = prefs.theme;
    if (prefs.language) user.language = prefs.language;
    this.users.set(userId, user);
    this.scheduleSave();
    return { ...user };
  }

  // ==================== Credits & Deductions ====================
  public async deductCredits(
    userId: string,
    amount: number,
    activity: string,
    details?: string
  ): Promise<{ success: boolean; balance: number; transaction?: CreditTransactionEntity; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, balance: 0, error: 'User not found' };
    }
    if ((user.credits || 0) < amount) {
      return { success: false, balance: user.credits || 0, error: 'Insufficient credits' };
    }

    user.credits = (user.credits || 0) - amount;
    this.users.set(userId, user);

    const tx: CreditTransactionEntity = {
      id: `tx_${nanoid(12)}`,
      user_id: userId,
      amount: -amount,
      balance_after: user.credits,
      activity,
      details,
      status: 'Success',
      created_at: new Date().toISOString(),
    };
    this.creditTransactions.unshift(tx);
    this.scheduleSave();

    return { success: true, balance: user.credits, transaction: tx };
  }

  public async getCreditHistory(userId?: string, limit = 50): Promise<CreditTransactionEntity[]> {
    let list = this.creditTransactions;
    if (userId) {
      list = list.filter(t => t.user_id === userId);
    }
    return list.slice(0, limit);
  }

  public async recordCreditTransaction(tx: CreditTransactionEntity): Promise<CreditTransactionEntity> {
    const item: CreditTransactionEntity = {
      ...tx,
      id: tx.id || `tx_${nanoid(12)}`,
      created_at: tx.created_at || new Date().toISOString(),
    };
    this.creditTransactions.unshift(item);
    this.scheduleSave();
    return item;
  }

  // ==================== Series ====================
  public async createSeries(series: SeriesEntity): Promise<SeriesEntity> {
    const id = series.id || `ser_${nanoid(10)}`;
    const now = new Date().toISOString();
    const created: SeriesEntity = {
      ...series,
      id,
      status: series.status || 'DRAFT',
      created_at: series.created_at || now,
      updated_at: now,
    };
    this.series.set(id, created);
    this.scheduleSave();
    return created;
  }

  public async getSeriesList(userId?: string, search?: string, status?: string): Promise<SeriesEntity[]> {
    let list = Array.from(this.series.values());
    if (userId) {
      list = list.filter(s => s.user_id === userId);
    }
    if (status) {
      list = list.filter(s => s.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.synopsis && s.synopsis.toLowerCase().includes(q)) ||
        (s.genre && s.genre.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
  }

  public async getSeriesById(id: string): Promise<SeriesEntity | null> {
    const s = this.series.get(id);
    return s ? { ...s } : null;
  }

  public async updateSeries(id: string, updates: Partial<SeriesEntity>): Promise<SeriesEntity | null> {
    const s = this.series.get(id);
    if (!s) return null;
    const updated: SeriesEntity = {
      ...s,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.series.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  public async deleteSeries(id: string): Promise<boolean> {
    const existed = this.series.delete(id);
    if (existed) {
      // Cascade delete episodes
      for (const [epId, ep] of this.episodes.entries()) {
        if (ep.series_id === id) {
          this.episodes.delete(epId);
          this.timelines.delete(epId);
          this.timelineVersions.delete(epId);
        }
      }
      this.scheduleSave();
    }
    return existed;
  }

  // ==================== Episodes ====================
  public async createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity> {
    const id = episode.id || `ep_${nanoid(10)}`;
    const now = new Date().toISOString();
    const created: EpisodeEntity = {
      ...episode,
      id,
      status: episode.status || 'DRAFT',
      created_at: episode.created_at || now,
      updated_at: now,
    };
    this.episodes.set(id, created);
    this.scheduleSave();
    return created;
  }

  public async getEpisodesBySeriesId(seriesId: string): Promise<EpisodeEntity[]> {
    const list = Array.from(this.episodes.values()).filter(e => e.series_id === seriesId);
    return list.sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
  }

  public async getEpisodeById(id: string): Promise<EpisodeEntity | null> {
    const e = this.episodes.get(id);
    return e ? { ...e } : null;
  }

  public async updateEpisode(id: string, updates: Partial<EpisodeEntity>): Promise<EpisodeEntity | null> {
    const e = this.episodes.get(id);
    if (!e) return null;
    const updated: EpisodeEntity = {
      ...e,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.episodes.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  // ==================== Timeline & Versions ====================
  public async saveTimeline(
    episode_id: string,
    timeline_data: IProject,
    author: { id: string; name: string; avatar?: string },
    change_summary?: string
  ): Promise<{ version_id: string; version_number: number; updated_at: string }> {
    const now = new Date().toISOString();
    const version_id = `ver_${nanoid(10)}`;

    const history = this.timelineVersions.get(episode_id) || [];
    const version_number = history.length + 1;
    const pureTimeline = normalizePureTimeline(timeline_data);

    const versionDoc = {
      id: version_id,
      episode_id,
      version_number,
      timeline_data: pureTimeline,
      author,
      change_summary: change_summary || 'Timeline state update',
      created_at: now,
    };

    history.unshift(versionDoc);
    this.timelineVersions.set(episode_id, history);

    const latestDoc = {
      episode_id,
      version_id,
      version_number,
      timeline_data: pureTimeline,
      updated_at: now,
    };
    this.timelines.set(episode_id, latestDoc);

    this.scheduleSave();
    return { version_id, version_number, updated_at: now };
  }

  public async getLatestTimeline(episode_id: string): Promise<IProject | null> {
    const t = this.timelines.get(episode_id);
    if (!t) return null;
    return normalizePureTimeline(t.timeline_data || t);
  }

  public async getTimelineHistory(episode_id: string, limit = 20, offset = 0): Promise<{ total: number; history: TimelineSnapshotHistoryItem[] }> {
    const all = this.timelineVersions.get(episode_id) || [];
    const sliced: TimelineSnapshotHistoryItem[] = all.slice(offset, offset + limit).map(v => ({
      version_id: v.id,
      version_number: v.version_number,
      label: v.label,
      author: v.author,
      change_summary: v.change_summary,
      created_at: v.created_at,
    }));
    return { total: all.length, history: sliced };
  }

  public async getTimelineVersion(episode_id: string, version_id: string): Promise<TimelineSnapshotVersion | null> {
    const all = this.timelineVersions.get(episode_id) || [];
    const match = all.find(v => v.id === version_id);
    if (!match) return null;
    return {
      version_id: match.id,
      version_number: match.version_number,
      author: match.author,
      change_summary: match.change_summary,
      created_at: match.created_at,
      timeline_data: normalizePureTimeline(match.timeline_data || match.timelineData),
    };
  }

  public async restoreTimelineVersion(
    episode_id: string,
    version_id: string,
    author: { id: string; name: string; avatar?: string },
    reason?: string
  ): Promise<RestoreTimelineResult> {
    const version = await this.getTimelineVersion(episode_id, version_id);
    if (!version) throw new Error(`Version ${version_id} not found`);

    const result = await this.saveTimeline(
      episode_id,
      version.timeline_data,
      author,
      `Restored from version ${version.version_number}: ${reason || ''}`
    );
    return {
      success: true,
      restored_from_version_id: version_id,
      new_version_id: result.version_id,
      new_version_number: result.version_number,
      active_timeline: version.timeline_data,
      created_at: result.updated_at,
    };
  }

  // ==================== Flow Accounts ====================
  public async getFlowAccounts(status?: string): Promise<FlowAccountEntity[]> {
    let list = Array.from(this.flowAccounts.values());
    if (status) {
      list = list.filter(a => a.status === status);
    }
    const map = new Map<string, FlowAccountEntity>();
    for (const acc of list) {
      const emailKey = (acc.email || '').trim().toLowerCase();
      if (!emailKey) continue;
      const existing = map.get(emailKey);
      if (!existing || new Date(acc.last_synced_at || 0).getTime() > new Date(existing.last_synced_at || 0).getTime()) {
        map.set(emailKey, acc);
      }
    }
    return Array.from(map.values());
  }

  public async upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity> {
    const email = (account.email || '').trim();
    const existing = Array.from(this.flowAccounts.values()).find(a => a.email?.toLowerCase() === email.toLowerCase()) || (account.id ? this.flowAccounts.get(account.id) : null);
    const id = existing?.id || account.id || `fa_${nanoid(8)}`;
    const updated: FlowAccountEntity = {
      ...(existing || {}),
      ...account,
      id,
      email,
      last_synced_at: new Date().toISOString(),
    };
    this.flowAccounts.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  public async deleteFlowAccount(idOrEmail: string): Promise<boolean> {
    let key = idOrEmail;
    if (!this.flowAccounts.has(key)) {
      for (const [id, acc] of this.flowAccounts.entries()) {
        if (acc.email === idOrEmail) {
          key = id;
          break;
        }
      }
    }
    const existed = this.flowAccounts.delete(key);
    if (existed) this.scheduleSave();
    return existed;
  }

  // ==================== Assets ====================
  public async saveAsset(asset: AssetEntity): Promise<AssetEntity> {
    const id = asset.id || `ast_${nanoid(10)}`;
    const created: AssetEntity = {
      ...asset,
      id,
      created_at: asset.created_at || new Date().toISOString(),
    };
    this.assets.set(id, created);
    this.scheduleSave();
    return created;
  }

  public async getAssets(filter?: {
    user_id?: string;
    series_id?: string;
    type?: string;
    character_id?: string;
    search?: string;
  }): Promise<AssetEntity[]> {
    let list = Array.from(this.assets.values());
    if (filter?.user_id) list = list.filter(a => a.user_id === filter.user_id);
    if (filter?.series_id) list = list.filter(a => a.series_id === filter.series_id);
    if (filter?.type) list = list.filter(a => a.type === filter.type);
    if (filter?.character_id) list = list.filter(a => a.character_id === filter.character_id);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(a =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.prompt && a.prompt.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  public async deleteAsset(id: string): Promise<boolean> {
    const existed = this.assets.delete(id);
    if (existed) this.scheduleSave();
    return existed;
  }

  // ==================== System Settings ====================
  public async getSystemSetting<T = any>(key: string): Promise<T | null> {
    const val = this.systemSettings.get(key);
    return val !== undefined ? (val as T) : null;
  }

  public async saveSystemSetting<T = any>(key: string, value: T): Promise<void> {
    this.systemSettings.set(key, value);
    this.scheduleSave();
  }

  // ==================== Worker Telemetry & Monitoring ====================
  public async recordWorkerHeartbeat(heartbeat: WorkerHeartbeatEntity): Promise<void> {
    const id = heartbeat.worker_id || `worker_${nanoid(8)}`;
    this.workerHeartbeats.set(id, {
      ...heartbeat,
      worker_id: id,
      last_heartbeat: heartbeat.last_heartbeat || new Date().toISOString(),
    });
    this.scheduleSave();
  }

  public async getWorkerNodes(): Promise<WorkerHeartbeatEntity[]> {
    const now = Date.now();
    return Array.from(this.workerHeartbeats.values()).map(w => {
      // Mark offline if no heartbeat for > 2 minutes
      const last = w.last_heartbeat || 0;
      const ageMs = now - new Date(last).getTime();
      const status = ageMs > 120000 ? 'OFFLINE' : w.status;
      return { ...w, status };
    });
  }

  public async recordWorkerJob(job: WorkerJobEntity): Promise<void> {
    const id = job.job_id || `job_${nanoid(10)}`;
    const existing = this.workerJobs.get(id) || {};
    const updated: WorkerJobEntity = {
      ...existing,
      ...job,
      job_id: id,
      submitted_at: job.submitted_at || (existing as any).submitted_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.workerJobs.set(id, updated);
    this.scheduleSave();
  }

  public async getWorkerJobs(filter?: { status?: string; limit?: number }): Promise<WorkerJobEntity[]> {
    let list = Array.from(this.workerJobs.values());
    if (filter?.status) {
      const targetStatus = filter.status.toUpperCase();
      list = list.filter(j => j.status?.toUpperCase() === targetStatus);
    }
    list.sort((a, b) => new Date(b.updated_at || b.submitted_at || 0).getTime() - new Date(a.updated_at || a.submitted_at || 0).getTime());
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list;
  }

  public async getClusterMetrics(): Promise<ClusterMetricsSummary> {
    const workers = await this.getWorkerNodes();
    const activeWorkers = workers.filter(w => w.status === 'ONLINE' || w.status === 'BUSY' || w.status === 'IDLE');
    const jobs = Array.from(this.workerJobs.values());
    const activeJobs = jobs.filter(j => j.status === 'RENDERING' || j.status === 'COMPOSITING');
    const queuedJobs = jobs.filter(j => j.status === 'QUEUED');
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');
    const failedJobs = jobs.filter(j => j.status === 'FAILED');

    const avgCpu = activeWorkers.length > 0
      ? Math.round(activeWorkers.reduce((acc, w) => acc + (w.cpu_usage_pct || 0), 0) / activeWorkers.length)
      : 0;

    return {
      active_instances: activeWorkers.length || (workers.length > 0 ? 0 : 1),
      gpu_load_pct: avgCpu || (activeJobs.length > 0 ? 68.5 : 12.0),
      active_jobs_count: activeJobs.length,
      queued_jobs_count: queuedJobs.length,
      completed_jobs_count: completedJobs.length,
      failed_jobs_count: failedJobs.length,
      monthly_cost_usd: 0.00,
      monthly_budget_cap: 50.00,
      service_name: 'shine-render-worker',
      region: process.env.GCP_REGION || 'us-central1',
      status: activeWorkers.length > 0 ? 'ONLINE' : (workers.length > 0 ? 'DEGRADED' : 'ONLINE'),
      workers: workers,
      active_jobs: activeJobs.concat(queuedJobs),
    };
  }

  // ==================== Pipeline Background Jobs ====================
  private pipelineJobs: Map<string, any> = new Map();

  public async savePipelineJob(job: any): Promise<any> {
    const item = {
      ...job,
      created_at: job.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.pipelineJobs.set(job.id, item);
    this.scheduleSave();
    return item;
  }

  public async getPipelineJobById(job_id: string): Promise<any | null> {
    return this.pipelineJobs.get(job_id) || null;
  }

  public async getPipelineJobs(filter?: { user_id?: string; series_id?: string; episode_id?: string; status?: string; limit?: number }): Promise<any[]> {
    let list = Array.from(this.pipelineJobs.values());
    if (filter?.user_id) list = list.filter(j => j.user_id === filter.user_id);
    if (filter?.series_id) list = list.filter(j => j.series_id === filter.series_id);
    if (filter?.episode_id) list = list.filter(j => j.episode_id === filter.episode_id);
    if (filter?.status) list = list.filter(j => j.status?.toLowerCase() === filter.status?.toLowerCase());
    list.sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime());
    if (filter?.limit) list = list.slice(0, filter.limit);
    return list;
  }

  public async updatePipelineJob(job_id: string, patch: Partial<any>): Promise<any | null> {
    const existing = await this.getPipelineJobById(job_id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.pipelineJobs.set(job_id, updated);
    this.scheduleSave();
    return updated;
  }

  public async deletePipelineJob(job_id: string): Promise<boolean> {
    const deleted = this.pipelineJobs.delete(job_id);
    if (deleted) this.scheduleSave();
    return deleted;
  }

  public async findActivePipelineJob(series_id: string, episode_id: string, type?: string): Promise<any | null> {
    const jobs = await this.getPipelineJobs({ series_id, episode_id });
    return jobs.find(j => (j.status === 'running' || j.status === 'queued') && (!type || j.type === type)) || null;
  }
}
