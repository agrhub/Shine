import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import { IDatabaseProvider, UserEntity, SeriesEntity, EpisodeEntity, FlowAccountEntity, CreditTransactionEntity } from './IDatabaseProvider.js';

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: String,
  name: String,
  tier: { type: String, default: 'FREE' },
  credits: { type: Number, default: 100 },
  theme: { type: String, default: 'dark' },
  language: { type: String, default: 'en' },
  created_at: { type: Date, default: Date.now }
});

const SeriesSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  title: { type: String, required: true },
  genre: { type: String, required: true },
  tone: String,
  synopsis: String,
  description: String,
  visual_style: String,
  target_audience: String,
  country: String,
  ratio: String,
  viral_hook: String,
  master_plan: { type: mongoose.Schema.Types.Mixed },
  characters: [mongoose.Schema.Types.Mixed],
  episode_count: { type: Number, default: 20 },
  status: { type: String, default: 'DRAFT' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const EpisodeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  series_id: { type: String, required: true },
  episode_number: { type: Number, required: true },
  title: String,
  synopsis: String,
  scene_core: String,
  conflict_escalation: String,
  phase: String,
  scenes: [mongoose.Schema.Types.Mixed],
  languageTracks: [mongoose.Schema.Types.Mixed],
  activeLanguageCode: { type: String, default: 'vi-VN' },
  script: String,
  duration: { type: Number, default: 90 },
  status: { type: String, default: 'DRAFT' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  strict: false,
});

const FlowAccountSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  session_token: { type: String, required: true },
  access_token: String,
  project_id: String,
  status: { type: String, default: 'ACTIVE' },
  credits_remaining: { type: Number, default: 100 },
  last_synced_at: { type: Date, default: Date.now }
});

const TimelineSnapshotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  episode_id: { type: String, required: true, index: true },
  version_number: { type: Number, required: true },
  label: String,
  author_id: { type: String, required: true },
  author_name: { type: String, required: true },
  author_avatar: String,
  change_summary: String,
  timeline_data: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const SystemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  updated_at: { type: Date, default: Date.now }
});

const CreditTransactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  activity: { type: String, required: true },
  details: String,
  amount: { type: Number, required: true },
  balance_after: { type: Number, required: true },
  status: { type: String, default: 'Success' },
  created_at: { type: Date, default: Date.now }
});

const SocialAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  platform: { type: String, required: true },
  channelId: { type: String, required: true },
  channelName: { type: String, required: true },
  channelAvatarUrl: { type: String },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  scopes: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

const AssetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, default: 'usr_default' },
  name: { type: String, required: true },
  type: { type: String, required: true },
  ext: String,
  size: String,
  sizeBytes: Number,
  categoryLabel: String,
  categoryColor: String,
  s3Key: String,
  url: { type: String, required: true },
  thumbnail: String,
  seriesId: String,
  episodeId: String,
  sceneId: String,
  characterId: String,
  prompt: String,
  provider: String,
  aspect: String,
  isVideo: Boolean,
  isAudio: Boolean,
  synthIdVerified: Boolean,
  synthIdHash: String,
  synthIdMetadata: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now }
});

const AIAccountSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  avatarUrl: { type: String },
  accountType: { type: String, required: true },
  status: { type: String, default: 'READY' },
  flowST: { type: String },
  flowAT: { type: String },
  flowATExpiresAt: { type: Date },
  projectId: { type: String },
  credits: { type: Number, default: 0 },
  errorMessage: { type: String },
  lastFingerprint: { type: Map, of: String },
  serviceKeys: { type: Map, of: String },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const SeriesModel = mongoose.models.Series || mongoose.model('Series', SeriesSchema);
export const EpisodeModel = mongoose.models.Episode || mongoose.model('Episode', EpisodeSchema);
export const FlowAccountModel = mongoose.models.FlowAccount || mongoose.model('FlowAccount', FlowAccountSchema);
export const TimelineSnapshotModel = mongoose.models.TimelineSnapshot || mongoose.model('TimelineSnapshot', TimelineSnapshotSchema);
export const SystemSettingModel = mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);
export const CreditTransactionModel = mongoose.models.CreditTransaction || mongoose.model('CreditTransaction', CreditTransactionSchema);
export const SocialAccountModel = mongoose.models.SocialAccount || mongoose.model('SocialAccount', SocialAccountSchema);
export const AssetModel = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);
export const AIAccountModel = mongoose.models.AIAccount || mongoose.model('AIAccount', AIAccountSchema);
export const AIAccount = AIAccountModel;
export const SocialAccount = SocialAccountModel;
export const Asset = AssetModel;

import { EnvConfig } from '@/config/env.js';

import dns from 'dns';

export class MongoDBProvider implements IDatabaseProvider {
  private mongoUri: string;

  constructor() {
    this.mongoUri = EnvConfig.mongoUri;
  }

  async initialize(): Promise<void> {
    if (mongoose.connection.readyState < 1) {
      try {
        // Fix Node.js Windows SRV lookup issue (querySrv ECONNREFUSED)
        if (this.mongoUri.startsWith('mongodb+srv://')) {
          try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
          } catch {}
        }

        console.log('[MongoDBProvider] url:', this.mongoUri);
        await mongoose.connect(this.mongoUri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log('[MongoDBProvider] Connected to MongoDB at:', this.mongoUri);
      } catch (err: any) {
        // Disconnect immediately to stop Mongoose buffering
        try { await mongoose.disconnect(); } catch {}
        throw err;
      }
    }
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    const created = await UserModel.create(user);
    return created.toObject() as any;
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return (await UserModel.findOne({ email }).lean()) as any;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return (await UserModel.findOne({ id }).lean()) as any;
  }

  async countUsers(): Promise<number> {
    return await UserModel.countDocuments();
  }

  async updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null> {
    const updated = await UserModel.findOneAndUpdate({ id: userId }, { $set: prefs }, { returnDocument: 'after' }).lean();
    return updated as any;
  }

  async updateUser(user: UserEntity): Promise<UserEntity> {
    const updated = await UserModel.findOneAndUpdate({ id: user.id }, { $set: user }, { returnDocument: 'after', upsert: true }).lean();
    return updated as any;
  }

  async deductCredits(userId: string, amount: number, activity: string, details?: string): Promise<{ success: boolean; balance: number; transaction?: CreditTransactionEntity; error?: string }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { success: false, balance: 0, error: 'User not found' };
    }

    const currentCredits = user.credits ?? 0;
    if (currentCredits < amount) {
      return { success: false, balance: currentCredits, error: `Insufficient credits. Required: ${amount}, Available: ${currentCredits}` };
    }

    const newBalance = currentCredits - amount;
    user.credits = newBalance;
    await this.updateUser(user);

    const tx: CreditTransactionEntity = {
      id: `tx_${nanoid(10)}`,
      user_id: userId,
      activity,
      details: details || '',
      amount: -amount,
      balance_after: newBalance,
      status: 'Success',
      created_at: new Date().toISOString(),
    };

    await this.recordCreditTransaction(tx);
    return { success: true, balance: newBalance, transaction: tx };
  }

  async getCreditHistory(userId?: string, limit = 50): Promise<CreditTransactionEntity[]> {
    const filter: any = {};
    if (userId) filter.user_id = userId;
    return (await CreditTransactionModel.find(filter).sort({ created_at: -1 }).limit(limit).lean()) as any;
  }

  async recordCreditTransaction(tx: CreditTransactionEntity): Promise<CreditTransactionEntity> {
    const created = await CreditTransactionModel.create(tx);
    return created.toObject() as any;
  }

  async createSeries(series: SeriesEntity): Promise<SeriesEntity> {
    const created = await SeriesModel.create(series);
    return created.toObject() as any;
  }

  async getSeriesList(userId?: string, search?: string, status?: string): Promise<SeriesEntity[]> {
    const filter: any = {};
    if (userId) filter.$or = [{ user_id: userId }, { user_id: 'usr_default' }];
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (status) filter.status = status;
    return (await SeriesModel.find(filter).sort({ created_at: -1 }).lean()) as any;
  }

  async getSeriesById(id: string): Promise<SeriesEntity | null> {
    return (await SeriesModel.findOne({ id }).lean()) as any;
  }

  async updateSeries(id: string, updates: Partial<SeriesEntity>): Promise<SeriesEntity | null> {
    const updated = await SeriesModel.findOneAndUpdate({ id }, { $set: { ...updates, updated_at: new Date() } }, { returnDocument: 'after' }).lean();
    return updated as any;
  }

  async deleteSeries(id: string): Promise<boolean> {
    await EpisodeModel.deleteMany({ series_id: id });
    const res = await SeriesModel.deleteOne({ id });
    return (res?.deletedCount || 0) > 0;
  }

  async createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity> {
    const created = await EpisodeModel.create(episode);
    return created.toObject() as any;
  }

  async getEpisodesBySeriesId(seriesId: string): Promise<EpisodeEntity[]> {
    return (await EpisodeModel.find({ series_id: seriesId }).sort({ episode_number: 1 }).lean()) as any;
  }

  async getEpisodeById(id: string): Promise<EpisodeEntity | null> {
    const ep = await EpisodeModel.findOne({ id }).lean();
    return ep as any;
  }

  async updateEpisode(id: string, updates: Partial<EpisodeEntity>): Promise<EpisodeEntity | null> {
    const updated = await EpisodeModel.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after' }).lean();
    return updated as any;
  }

  async getFlowAccounts(status?: string): Promise<FlowAccountEntity[]> {
    if (mongoose.connection.readyState < 1) return [];
    const filter: any = {};
    if (status) filter.status = status;
    return (await FlowAccountModel.find(filter).sort({ credits_remaining: -1 }).lean()) as any;
  }

  async upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity> {
    if (mongoose.connection.readyState < 1) return account;
    const updated = await FlowAccountModel.findOneAndUpdate({ email: account.email }, account, { upsert: true, returnDocument: 'after' }).lean();
    return updated as any;
  }

  async deleteFlowAccount(idOrEmail: string): Promise<boolean> {
    if (mongoose.connection.readyState < 1) return true;
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrEmail);
    const filter = isObjectId
      ? { $or: [{ _id: idOrEmail }, { id: idOrEmail }, { email: idOrEmail }] }
      : { $or: [{ id: idOrEmail }, { email: idOrEmail }] };
    await FlowAccountModel.deleteMany(filter);
    await AIAccountModel.deleteMany(filter);
    return true;
  }

  async saveTimeline(
    episodeId: string,
    timelineData: any,
    author: { id: string; name: string; avatar?: string },
    changeSummary = 'Timeline updated'
  ): Promise<{ versionId: string; versionNumber: number; updatedAt: string }> {
    const versionId = `ver_${Math.random().toString(36).substring(2, 10)}`;
    const history = await this.getTimelineHistory(episodeId, 1, 0);
    const versionNumber = history.total + 1;
    const label = `v1.${versionNumber} - ${changeSummary}`;
    const serializedData = typeof timelineData === 'string' ? timelineData : JSON.stringify(timelineData);

    const doc = await TimelineSnapshotModel.create({
      id: versionId,
      episode_id: episodeId,
      version_number: versionNumber,
      label,
      author_id: author.id || 'usr_default',
      author_name: author.name || 'Editor',
      author_avatar: author.avatar || '',
      change_summary: changeSummary,
      timeline_data: serializedData,
      created_at: new Date(),
    });

    return { versionId, versionNumber, updatedAt: doc.created_at.toISOString() };
  }

  async getLatestTimeline(episodeId: string): Promise<any | null> {
    const snap: any = await TimelineSnapshotModel.findOne({ episode_id: episodeId }).sort({ version_number: -1 }).lean();
    if (!snap) return null;
    try {
      return JSON.parse(snap.timeline_data);
    } catch {
      return snap.timeline_data;
    }
  }

  async getTimelineHistory(episodeId: string, limit = 20, offset = 0): Promise<{ total: number; history: any[] }> {
    const total = await TimelineSnapshotModel.countDocuments({ episode_id: episodeId });
    const docs: any[] = await TimelineSnapshotModel.find({ episode_id: episodeId })
      .sort({ version_number: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const history = docs.map((r) => ({
      versionId: r.id,
      versionNumber: r.version_number,
      label: r.label,
      author: {
        userId: r.author_id,
        name: r.author_name,
        avatar: r.author_avatar,
      },
      changeSummary: r.change_summary,
      createdAt: r.created_at?.toISOString ? r.created_at.toISOString() : r.created_at,
    }));

    return { total, history };
  }

  async getTimelineVersion(episodeId: string, versionId: string): Promise<any | null> {
    const doc: any = await TimelineSnapshotModel.findOne({ episode_id: episodeId, id: versionId }).lean();
    if (!doc) return null;
    let data = {};
    try { data = JSON.parse(doc.timeline_data); } catch { data = doc.timeline_data; }
    return {
      versionId: doc.id,
      versionNumber: doc.version_number,
      author: { userId: doc.author_id, name: doc.author_name },
      changeSummary: doc.change_summary,
      createdAt: doc.created_at?.toISOString ? doc.created_at.toISOString() : doc.created_at,
      timelineData: data,
    };
  }

  async restoreTimelineVersion(
    episodeId: string,
    versionId: string,
    author: { id: string; name: string; avatar?: string },
    reason = 'Restored version'
  ): Promise<any> {
    const version = await this.getTimelineVersion(episodeId, versionId);
    if (!version) throw new Error('Version snapshot not found');

    const saveRes = await this.saveTimeline(
      episodeId,
      version.timelineData,
      author,
      `Restored from ${version.versionId}: ${reason}`
    );

    return {
      success: true,
      restoredFromVersionId: versionId,
      newVersionId: saveRes.versionId,
      newVersionNumber: saveRes.versionNumber,
      activeTimeline: version.timelineData,
      createdAt: saveRes.updatedAt,
    };
  }

  async saveAsset(asset: any): Promise<any> {
    if (mongoose.connection.readyState < 1) return asset;
    const doc = await AssetModel.findOneAndUpdate(
      { id: asset.id },
      { $set: { ...asset, created_at: asset.created_at || new Date() } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return doc;
  }

  async getAssets(filter?: { userId?: string; seriesId?: string; type?: string; characterId?: string; search?: string }): Promise<any[]> {
    if (mongoose.connection.readyState < 1) return [];
    const query: any = {};
    if (filter?.userId) query.user_id = filter.userId;
    if (filter?.seriesId) query.seriesId = filter.seriesId;
    if (filter?.type && filter.type !== 'all') query.type = filter.type;
    if (filter?.characterId) query.characterId = filter.characterId;
    if (filter?.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { categoryLabel: { $regex: filter.search, $options: 'i' } },
        { prompt: { $regex: filter.search, $options: 'i' } },
      ];
    }
    const docs = await AssetModel.find(query).sort({ created_at: -1 }).lean();
    return docs;
  }

  async deleteAsset(id: string): Promise<boolean> {
    if (mongoose.connection.readyState < 1) return false;
    const res = await AssetModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async getSystemSetting<T = any>(key: string): Promise<T | null> {
    if (mongoose.connection.readyState < 1) return null;
    const doc = await SystemSettingModel.findOne({ key }).lean();
    return doc ? (doc as any).value : null;
  }

  async saveSystemSetting<T = any>(key: string, value: T): Promise<void> {
    if (mongoose.connection.readyState < 1) return;
    await SystemSettingModel.findOneAndUpdate(
      { key },
      { $set: { key, value, updated_at: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
  }
}
