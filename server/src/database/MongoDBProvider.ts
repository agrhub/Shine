import mongoose from 'mongoose';
import { IDatabaseProvider, UserEntity, SeriesEntity, EpisodeEntity, FlowAccountEntity } from './IDatabaseProvider.js';

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
  cliffhanger_hook: String,
  phase: String,
  scenes: [mongoose.Schema.Types.Mixed],
  script: String,
  duration: { type: Number, default: 90 },
  status: { type: String, default: 'DRAFT' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
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

const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
const SeriesModel = mongoose.models.Series || mongoose.model('Series', SeriesSchema);
const EpisodeModel = mongoose.models.Episode || mongoose.model('Episode', EpisodeSchema);
const FlowAccountModel = mongoose.models.FlowAccount || mongoose.model('FlowAccount', FlowAccountSchema);
const TimelineSnapshotModel = mongoose.models.TimelineSnapshot || mongoose.model('TimelineSnapshot', TimelineSnapshotSchema);
const SystemSettingModel = mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);

export class MongoDBProvider implements IDatabaseProvider {
  private mongoUri: string;

  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shine_db';
  }

  async initialize(): Promise<void> {
    if (mongoose.connection.readyState < 1) {
      await mongoose.connect(this.mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[MongoDBProvider] Connected to MongoDB at:', this.mongoUri);
    }

    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      await UserModel.create({ id: 'usr_default', email: 'creator@shine.ai', name: 'Creator Alpha', tier: 'PRO', credits: 1000 });
      await SeriesModel.create([
        { id: 'srs_01', user_id: 'usr_default', title: 'The Hidden Heiress Reclaims the Empire', genre: 'Revenge', tone: 'Tense & High Stakes', visual_style: 'Cinematic 9:16', target_audience: 'Young Adults', episode_count: 24, status: 'PUBLISHED' },
        { id: 'srs_02', user_id: 'usr_default', title: 'Shadow CEO: Double Identity', genre: 'Suspense', tone: 'Mysterious', visual_style: 'Neo-Noir Dark', target_audience: 'Gen-Z', episode_count: 30, status: 'DRAFT' }
      ]);
      await EpisodeModel.create([
        { id: 'ep_01', series_id: 'srs_01', episode_number: 1, title: 'Episode 1: The Banquet Betrayal', synopsis: 'A grand banquet turns into a corporate takeover when the exiled daughter returns.', status: 'PUBLISHED' },
        { id: 'ep_02', series_id: 'srs_01', episode_number: 2, title: 'Episode 2: Unmasking the Imposter', synopsis: 'The CEO reveals the fraudulent stock transfer in front of the board.', status: 'DRAFT' }
      ]);
      await FlowAccountModel.create({ id: 'flow_01', email: 'pool_account_1@labs.google', session_token: 'flowST_mock_session_token_alpha', access_token: 'ya29.flow_mock_access_token_alpha', project_id: 'proj_pinhole_alpha', status: 'ACTIVE', credits_remaining: 100 });
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

  async updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null> {
    const updated = await UserModel.findOneAndUpdate({ id: userId }, { $set: prefs }, { new: true }).lean();
    return updated as any;
  }

  async updateUser(user: UserEntity): Promise<UserEntity> {
    const updated = await UserModel.findOneAndUpdate({ id: user.id }, { $set: user }, { new: true, upsert: true }).lean();
    return updated as any;
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
    const updated = await SeriesModel.findOneAndUpdate({ id }, { $set: { ...updates, updated_at: new Date() } }, { new: true }).lean();
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
    const updated = await EpisodeModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
    return updated as any;
  }

  async getFlowAccounts(status?: string): Promise<FlowAccountEntity[]> {
    const filter: any = {};
    if (status) filter.status = status;
    return (await FlowAccountModel.find(filter).sort({ credits_remaining: -1 }).lean()) as any;
  }

  async upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity> {
    const updated = await FlowAccountModel.findOneAndUpdate({ email: account.email }, account, { upsert: true, new: true }).lean();
    return updated as any;
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

  async getSystemSetting<T = any>(key: string): Promise<T | null> {
    const doc = await SystemSettingModel.findOne({ key }).lean();
    return doc ? (doc as any).value : null;
  }

  async saveSystemSetting<T = any>(key: string, value: T): Promise<void> {
    await SystemSettingModel.findOneAndUpdate(
      { key },
      { $set: { key, value, updated_at: new Date() } },
      { upsert: true, new: true }
    );
  }
}
