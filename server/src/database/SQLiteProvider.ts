import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { IDatabaseProvider, UserEntity, SeriesEntity, EpisodeEntity, FlowAccountEntity } from './IDatabaseProvider.js';

export class SQLiteProvider implements IDatabaseProvider {
  private db: any = null;
  private isFallback = false;

  // In-memory fallback stores if native bindings are unavailable
  private usersStore: UserEntity[] = [];
  private seriesStore: SeriesEntity[] = [];
  private episodesStore: EpisodeEntity[] = [];
  private flowStore: FlowAccountEntity[] = [];
  private timelineSnapshotsStore: any[] = [];
  private systemSettingsStore: Map<string, any> = new Map();

  constructor() {
    try {
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'shine.db');
      this.db = new Database(dbPath);
    } catch (err: any) {
      console.warn('[SQLiteProvider] Native better-sqlite3 bindings unavailable (using in-memory fallback store).');
      this.isFallback = true;
    }
  }

  async initialize(): Promise<void> {
    if (this.isFallback || !this.db) {
      this.seedFallback();
      return;
    }

    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          name TEXT,
          avatar_url TEXT,
          tier TEXT DEFAULT 'FREE',
          credits INTEGER DEFAULT 100,
          theme TEXT DEFAULT 'dark',
          language TEXT DEFAULT 'en',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS series (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          genre TEXT NOT NULL,
          tone TEXT,
          visual_style TEXT,
          target_audience TEXT,
          episode_count INTEGER DEFAULT 20,
          status TEXT DEFAULT 'DRAFT',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS episodes (
          id TEXT PRIMARY KEY,
          series_id TEXT NOT NULL,
          episode_number INTEGER NOT NULL,
          title TEXT,
          synopsis TEXT,
          duration INTEGER DEFAULT 90,
          status TEXT DEFAULT 'DRAFT',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(series_id) REFERENCES series(id)
        );

        CREATE TABLE IF NOT EXISTS flow_accounts (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          session_token TEXT NOT NULL,
          access_token TEXT,
          project_id TEXT,
          status TEXT DEFAULT 'ACTIVE',
          credits_remaining INTEGER DEFAULT 100,
          last_synced_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS timeline_snapshots (
          id TEXT PRIMARY KEY,
          episode_id TEXT NOT NULL,
          version_number INTEGER NOT NULL,
          label TEXT,
          author_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_avatar TEXT,
          change_summary TEXT,
          timeline_data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(episode_id) REFERENCES episodes(id)
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const countUser = (this.db.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c;
      if (countUser === 0) {
        this.db.prepare(`
          INSERT INTO users (id, email, name, tier, credits)
          VALUES ('usr_default', 'creator@shine.ai', 'Creator Alpha', 'PRO', 1000)
        `).run();

        this.db.prepare(`
          INSERT INTO series (id, user_id, title, genre, tone, visual_style, target_audience, episode_count, status)
          VALUES 
            ('srs_01', 'usr_default', 'The Hidden Heiress Reclaims the Empire', 'Revenge', 'Tense & High Stakes', 'Cinematic 9:16', 'Young Adults', 24, 'PUBLISHED'),
            ('srs_02', 'usr_default', 'Shadow CEO: Double Identity', 'Suspense', 'Mysterious', 'Neo-Noir Dark', 'Gen-Z', 30, 'DRAFT')
        `).run();

        this.db.prepare(`
          INSERT INTO episodes (id, series_id, episode_number, title, synopsis, status)
          VALUES 
            ('ep_01', 'srs_01', 1, 'Episode 1: The Banquet Betrayal', 'A grand banquet turns into a corporate takeover when the exiled daughter returns.', 'PUBLISHED'),
            ('ep_02', 'srs_01', 2, 'Episode 2: Unmasking the Imposter', 'The CEO reveals the fraudulent stock transfer in front of the board.', 'DRAFT')
        `).run();

        this.db.prepare(`
          INSERT INTO flow_accounts (id, email, session_token, access_token, project_id, status, credits_remaining, last_synced_at)
          VALUES 
            ('flow_01', 'pool_account_1@labs.google', 'flowST_mock_session_token_alpha', 'ya29.flow_mock_access_token_alpha', 'proj_pinhole_alpha', 'ACTIVE', 100, CURRENT_TIMESTAMP)
        `).run();
      }
    } catch (err: any) {
      console.warn('[SQLiteProvider] Native DB init error, switching to fallback:', err.message);
      this.isFallback = true;
      this.seedFallback();
    }
  }

  private seedFallback() {
    const now = new Date().toISOString();
    if (this.usersStore.length === 0) {
      this.usersStore.push({
        id: 'usr_default',
        email: 'creator@shine.ai',
        name: 'Creator Alpha',
        tier: 'PRO',
        credits: 1000,
        created_at: now,
      });
      this.seriesStore.push(
        { id: 'srs_01', user_id: 'usr_default', title: 'The Hidden Heiress Reclaims the Empire', genre: 'Revenge', tone: 'Tense & High Stakes', visual_style: 'Cinematic 9:16', target_audience: 'Young Adults', episode_count: 24, status: 'PUBLISHED', created_at: now },
        { id: 'srs_02', user_id: 'usr_default', title: 'Shadow CEO: Double Identity', genre: 'Suspense', tone: 'Mysterious', visual_style: 'Neo-Noir Dark', target_audience: 'Gen-Z', episode_count: 30, status: 'DRAFT', created_at: now }
      );
      this.episodesStore.push(
        { id: 'ep_01', series_id: 'srs_01', episode_number: 1, title: 'Episode 1: The Banquet Betrayal', synopsis: 'A grand banquet turns into a corporate takeover when the exiled daughter returns.', duration: 90, status: 'PUBLISHED', created_at: now },
        { id: 'ep_02', series_id: 'srs_01', episode_number: 2, title: 'Episode 2: Unmasking the Imposter', synopsis: 'The CEO reveals the fraudulent stock transfer in front of the board.', duration: 90, status: 'DRAFT', created_at: now }
      );
      this.flowStore.push({
        id: 'flow_01',
        email: 'pool_account_1@labs.google',
        session_token: 'flowST_mock_session_token_alpha',
        access_token: 'ya29.flow_mock_access_token_alpha',
        project_id: 'proj_pinhole_alpha',
        status: 'ACTIVE',
        credits_remaining: 100,
        last_synced_at: now,
      });
    }
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    if (this.isFallback) {
      user.theme = user.theme || 'dark';
      user.language = user.language || 'en';
      this.usersStore.push(user);
      return user;
    }
    try {
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, tier, credits, theme, language)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.email,
        user.password_hash || '',
        user.name,
        user.tier,
        user.credits,
        user.theme || 'dark',
        user.language || 'en'
      );
    } catch {
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, tier, credits)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user.id, user.email, user.password_hash || '', user.name, user.tier, user.credits);
    }
    return (await this.getUserById(user.id))!;
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    if (this.isFallback) {
      return this.usersStore.find((u) => u.email === email) || null;
    }
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    return row || null;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    if (this.isFallback) {
      return this.usersStore.find((u) => u.id === id) || null;
    }
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return row || null;
  }

  async updateUserPreferences(userId: string, prefs: { theme?: string; language?: string }): Promise<UserEntity | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const newTheme = prefs.theme || user.theme || 'dark';
    const newLang = prefs.language || user.language || 'en';

    if (this.isFallback) {
      user.theme = newTheme;
      user.language = newLang;
      return user;
    }

    try {
      this.db.prepare('UPDATE users SET theme = ?, language = ? WHERE id = ?').run(newTheme, newLang, userId);
    } catch {}

    return (await this.getUserById(userId))!;
  }

  async updateUser(user: UserEntity): Promise<UserEntity> {
    if (this.isFallback) {
      const idx = this.usersStore.findIndex((u) => u.id === user.id);
      if (idx !== -1) {
        this.usersStore[idx] = { ...this.usersStore[idx], ...user };
        return this.usersStore[idx];
      }
      this.usersStore.push(user);
      return user;
    }

    try {
      this.db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, avatar = ?, theme = ?, language = ?, credits = ?, tier = ?
        WHERE id = ?
      `).run(
        user.name,
        user.email,
        user.avatar || '',
        user.theme || 'dark',
        user.language || 'en',
        user.credits,
        user.tier,
        user.id
      );
    } catch {
      this.db.prepare(`
        UPDATE users 
        SET name = ?, email = ?
        WHERE id = ?
      `).run(user.name, user.email, user.id);
    }

    return (await this.getUserById(user.id)) || user;
  }

  async createSeries(series: SeriesEntity): Promise<SeriesEntity> {
    if (this.isFallback) {
      this.seriesStore.push(series);
      return series;
    }
    this.db.prepare(`
      INSERT INTO series (id, user_id, title, genre, tone, visual_style, target_audience, episode_count, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(series.id, series.user_id, series.title, series.genre, series.tone || 'Dramatic', series.visual_style || 'Cinematic', series.target_audience || 'General', series.episode_count, series.status);
    return (await this.getSeriesById(series.id))!;
  }

  async getSeriesList(userId?: string, search?: string, status?: string): Promise<SeriesEntity[]> {
    if (this.isFallback) {
      let res = [...this.seriesStore];
      if (search) res = res.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
      if (status) res = res.filter((s) => s.status === status);
      return res;
    }
    let query = 'SELECT * FROM series WHERE 1=1';
    const params: any[] = [];
    if (userId) {
      query += ' AND (user_id = ? OR user_id = "usr_default")';
      params.push(userId);
    }
    if (search) {
      query += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    return this.db.prepare(query).all(...params) as SeriesEntity[];
  }

  async getSeriesById(id: string): Promise<SeriesEntity | null> {
    if (this.isFallback) {
      return this.seriesStore.find((s) => s.id === id) || null;
    }
    const row = this.db.prepare('SELECT * FROM series WHERE id = ?').get(id) as any;
    return row || null;
  }

  async updateSeries(id: string, updates: Partial<SeriesEntity>): Promise<SeriesEntity | null> {
    if (this.isFallback) {
      const idx = this.seriesStore.findIndex(s => s.id === id);
      if (idx >= 0) {
        this.seriesStore[idx] = { ...this.seriesStore[idx], ...updates, updated_at: new Date().toISOString() };
        return this.seriesStore[idx];
      }
      return null;
    }
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) return this.getSeriesById(id);
    values.push(id);
    this.db.prepare(`UPDATE series SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getSeriesById(id);
  }

  async deleteSeries(id: string): Promise<boolean> {
    if (this.isFallback) {
      this.episodesStore = this.episodesStore.filter(e => e.series_id !== id);
      const prevLen = this.seriesStore.length;
      this.seriesStore = this.seriesStore.filter(s => s.id !== id);
      return this.seriesStore.length < prevLen;
    }
    this.db.prepare('DELETE FROM episodes WHERE series_id = ?').run(id);
    const res = this.db.prepare('DELETE FROM series WHERE id = ?').run(id);
    return res.changes > 0;
  }

  async createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity> {
    if (this.isFallback) {
      this.episodesStore.push(episode);
      return episode;
    }
    this.db.prepare(`
      INSERT INTO episodes (id, series_id, episode_number, title, synopsis, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(episode.id, episode.series_id, episode.episode_number, episode.title, episode.synopsis || '', episode.status);
    return episode;
  }

  async getEpisodesBySeriesId(seriesId: string): Promise<EpisodeEntity[]> {
    if (this.isFallback) {
      return this.episodesStore.filter((e) => e.series_id === seriesId);
    }
    return this.db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number ASC').all(seriesId) as EpisodeEntity[];
  }

  async getEpisodeById(id: string): Promise<EpisodeEntity | null> {
    if (this.isFallback) {
      return this.episodesStore.find((e) => e.id === id) || null;
    }
    const ep = this.db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as EpisodeEntity | undefined;
    return ep || null;
  }

  async updateEpisode(id: string, updates: Partial<EpisodeEntity>): Promise<EpisodeEntity | null> {
    if (this.isFallback) {
      const idx = this.episodesStore.findIndex((e) => e.id === id);
      if (idx >= 0) {
        this.episodesStore[idx] = { ...this.episodesStore[idx], ...updates };
        return this.episodesStore[idx];
      }
      return null;
    }
    const current = this.db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as EpisodeEntity | undefined;
    if (!current) return null;
    const updated = { ...current, ...updates };
    this.db.prepare(`
      UPDATE episodes SET title = ?, synopsis = ?, status = ? WHERE id = ?
    `).run(updated.title, updated.synopsis || '', updated.status, id);
    return updated;
  }

  async getFlowAccounts(status?: string): Promise<FlowAccountEntity[]> {
    if (this.isFallback) {
      if (status) return this.flowStore.filter((f) => f.status === status);
      return this.flowStore;
    }
    if (status) {
      return this.db.prepare('SELECT * FROM flow_accounts WHERE status = ? ORDER BY credits_remaining DESC').all(status) as FlowAccountEntity[];
    }
    return this.db.prepare('SELECT * FROM flow_accounts ORDER BY created_at DESC').all() as FlowAccountEntity[];
  }

  async upsertFlowAccount(account: FlowAccountEntity): Promise<FlowAccountEntity> {
    if (this.isFallback) {
      const idx = this.flowStore.findIndex((f) => f.email === account.email);
      if (idx >= 0) this.flowStore[idx] = account;
      else this.flowStore.push(account);
      return account;
    }
    this.db.prepare(`
      INSERT INTO flow_accounts (id, email, session_token, access_token, project_id, status, credits_remaining, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        session_token = excluded.session_token,
        access_token = excluded.access_token,
        project_id = excluded.project_id,
        status = excluded.status,
        last_synced_at = CURRENT_TIMESTAMP
    `).run(account.id, account.email, account.session_token, account.access_token || '', account.project_id || '', account.status, account.credits_remaining);
    return account;
  }

  async saveTimeline(
    episodeId: string,
    timelineData: any,
    author: { id: string; name: string; avatar?: string },
    changeSummary = 'Timeline updated'
  ): Promise<{ versionId: string; versionNumber: number; updatedAt: string }> {
    const versionId = `ver_${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    const history = await this.getTimelineHistory(episodeId, 1, 0);
    const versionNumber = history.total + 1;
    const label = `v1.${versionNumber} - ${changeSummary}`;
    const serializedData = typeof timelineData === 'string' ? timelineData : JSON.stringify(timelineData);

    if (this.isFallback) {
      this.timelineSnapshotsStore.unshift({
        id: versionId,
        episode_id: episodeId,
        version_number: versionNumber,
        label,
        author_id: author.id || 'usr_default',
        author_name: author.name || 'Editor',
        author_avatar: author.avatar || '',
        change_summary: changeSummary,
        timeline_data: serializedData,
        created_at: now,
      });
      return { versionId, versionNumber, updatedAt: now };
    }

    this.db.prepare(`
      INSERT INTO timeline_snapshots (id, episode_id, version_number, label, author_id, author_name, author_avatar, change_summary, timeline_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      versionId,
      episodeId,
      versionNumber,
      label,
      author.id || 'usr_default',
      author.name || 'Editor',
      author.avatar || '',
      changeSummary,
      serializedData,
      now
    );

    return { versionId, versionNumber, updatedAt: now };
  }

  async getLatestTimeline(episodeId: string): Promise<any | null> {
    if (this.isFallback) {
      const snap = this.timelineSnapshotsStore.find((s) => s.episode_id === episodeId);
      if (!snap) return null;
      try {
        return JSON.parse(snap.timeline_data);
      } catch {
        return snap.timeline_data;
      }
    }

    const row = this.db.prepare(
      'SELECT * FROM timeline_snapshots WHERE episode_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(episodeId) as any;

    if (!row) return null;
    try {
      return JSON.parse(row.timeline_data);
    } catch {
      return row.timeline_data;
    }
  }

  async getTimelineHistory(episodeId: string, limit = 20, offset = 0): Promise<{ total: number; history: any[] }> {
    if (this.isFallback) {
      const snaps = this.timelineSnapshotsStore.filter((s) => s.episode_id === episodeId);
      const paged = snaps.slice(offset, offset + limit).map((s) => ({
        versionId: s.id,
        versionNumber: s.version_number,
        label: s.label,
        author: {
          userId: s.author_id,
          name: s.author_name,
          avatar: s.author_avatar,
        },
        changeSummary: s.change_summary,
        createdAt: s.created_at,
      }));
      return { total: snaps.length, history: paged };
    }

    const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM timeline_snapshots WHERE episode_id = ?').get(episodeId) as any;
    const total = totalRow?.count || 0;

    const rows = this.db.prepare(
      'SELECT * FROM timeline_snapshots WHERE episode_id = ? ORDER BY version_number DESC LIMIT ? OFFSET ?'
    ).all(episodeId, limit, offset) as any[];

    const history = rows.map((r) => ({
      versionId: r.id,
      versionNumber: r.version_number,
      label: r.label,
      author: {
        userId: r.author_id,
        name: r.author_name,
        avatar: r.author_avatar,
      },
      changeSummary: r.change_summary,
      createdAt: r.created_at,
    }));

    return { total, history };
  }

  async getTimelineVersion(episodeId: string, versionId: string): Promise<any | null> {
    if (this.isFallback) {
      const snap = this.timelineSnapshotsStore.find((s) => s.episode_id === episodeId && s.id === versionId);
      if (!snap) return null;
      let data = {};
      try { data = JSON.parse(snap.timeline_data); } catch { data = snap.timeline_data; }
      return {
        versionId: snap.id,
        versionNumber: snap.version_number,
        author: { userId: snap.author_id, name: snap.author_name },
        changeSummary: snap.change_summary,
        createdAt: snap.created_at,
        timelineData: data,
      };
    }

    const row = this.db.prepare('SELECT * FROM timeline_snapshots WHERE episode_id = ? AND id = ?').get(episodeId, versionId) as any;
    if (!row) return null;
    let data = {};
    try { data = JSON.parse(row.timeline_data); } catch { data = row.timeline_data; }
    return {
      versionId: row.id,
      versionNumber: row.version_number,
      author: { userId: row.author_id, name: row.author_name },
      changeSummary: row.change_summary,
      createdAt: row.created_at,
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
    if (this.isFallback) {
      return this.systemSettingsStore.has(key) ? this.systemSettingsStore.get(key) : null;
    }
    try {
      const row = this.db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as any;
      if (!row) return null;
      return JSON.parse(row.value);
    } catch {
      return this.systemSettingsStore.has(key) ? this.systemSettingsStore.get(key) : null;
    }
  }

  async saveSystemSetting<T = any>(key: string, value: T): Promise<void> {
    this.systemSettingsStore.set(key, value);
    if (this.isFallback) return;

    try {
      this.db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(key, JSON.stringify(value));
    } catch {}
  }
}
