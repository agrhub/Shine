import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { IDatabaseProvider, UserEntity, SeriesEntity, EpisodeEntity, FlowAccountEntity, CreditTransactionEntity } from './IDatabaseProvider.js';

export class SQLiteProvider implements IDatabaseProvider {
  private db: any = null;
  private isFallback = false;

  // In-memory fallback stores if native bindings are unavailable
  private usersStore: UserEntity[] = [];
  private creditTxStore: CreditTransactionEntity[] = [];
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
          role TEXT DEFAULT 'user',
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
          visual_style TEXT,
          visual_style_prompt TEXT,
          target_audience TEXT,
          country TEXT DEFAULT 'Vietnam',
          language TEXT DEFAULT 'vi-VN',
          ratio TEXT DEFAULT '9:16',
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
          scenes TEXT,
          script TEXT,
          thumbnail_url TEXT,
          cover_image TEXT,
          language_tracks TEXT,
          scene_core TEXT,
          conflict_escalation TEXT,
          cliffhanger_hook TEXT,
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

        CREATE TABLE IF NOT EXISTS credit_transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          activity TEXT NOT NULL,
          details TEXT,
          amount INTEGER NOT NULL,
          balance_after INTEGER NOT NULL,
          status TEXT DEFAULT 'Success',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        );
      `);

      const userColumns = [
        "role TEXT DEFAULT 'user'",
        'avatar TEXT',
        'avatar_url TEXT',
        'api_key TEXT',
        'api_key_rotated_at TEXT',
        'two_factor_enabled INTEGER DEFAULT 0',
        'integrations TEXT',
        'connected_channels TEXT'
      ];
      for (const colDef of userColumns) {
        try {
          this.db.prepare(`ALTER TABLE users ADD COLUMN ${colDef}`).run();
        } catch {
          // column already exists
        }
      }

      const seriesColumns = [
        "language TEXT DEFAULT 'vi-VN'",
        "country TEXT DEFAULT 'Vietnam'",
        "ratio TEXT DEFAULT '9:16'",
        "visual_style_prompt TEXT",
        "characters TEXT",
        "locations TEXT",
        "props TEXT",
        "master_plan TEXT"
      ];
      for (const colDef of seriesColumns) {
        try {
          this.db.prepare(`ALTER TABLE series ADD COLUMN ${colDef}`).run();
        } catch {
          // column already exists
        }
      }

      const episodeColumns = [
        'scenes TEXT',
        'script TEXT',
        'screenplay TEXT',
        'locations TEXT',
        'props TEXT',
        'thumbnail_url TEXT',
        'cover_image TEXT',
        'language_tracks TEXT',
        'scene_core TEXT',
        'conflict_escalation TEXT',
        'cliffhanger_hook TEXT',
      ];
      for (const colDef of episodeColumns) {
        try {
          this.db.prepare(`ALTER TABLE episodes ADD COLUMN ${colDef}`).run();
        } catch {
          // column already exists
        }
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
      
    }
  }

  async createUser(user: UserEntity): Promise<UserEntity> {
    if (this.isFallback) {
      user.role = user.role || 'user';
      user.theme = user.theme || 'dark';
      user.language = user.language || 'en';
      this.usersStore.push(user);
      return user;
    }
    try {
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, tier, credits, theme, language)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.email,
        user.password_hash || '',
        user.name,
        user.role || 'user',
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

  async countUsers(): Promise<number> {
    if (this.isFallback) return this.usersStore.length;
    try {
      const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
      return Number(row?.count || 0);
    } catch {
      return 0;
    }
  }

  private mapUserRow(row: any): UserEntity | null {
    if (!row) return null;
    let integrations: any[] = [];
    if (row.integrations) {
      try {
        integrations = typeof row.integrations === 'string' ? JSON.parse(row.integrations) : row.integrations;
      } catch {}
    }
    let connectedChannels: any[] = [];
    if (row.connected_channels) {
      try {
        connectedChannels = typeof row.connected_channels === 'string' ? JSON.parse(row.connected_channels) : row.connected_channels;
      } catch {}
    }
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      avatar: row.avatar || row.avatar_url || '',
      role: row.role || 'user',
      tier: row.tier || 'FREE',
      credits: Number(row.credits ?? 100),
      theme: row.theme || 'dark',
      language: row.language || 'en',
      api_key: row.api_key || '',
      api_key_rotated_at: row.api_key_rotated_at || '',
      two_factor_enabled: row.two_factor_enabled === 1 || row.two_factor_enabled === 'true' || row.two_factor_enabled === true,
      integrations,
      connected_channels: connectedChannels,
      created_at: row.created_at,
    };
  }

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    if (this.isFallback) {
      return this.usersStore.find((u) => u.email === email) || null;
    }
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    return this.mapUserRow(row);
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    if (this.isFallback) {
      return this.usersStore.find((u) => u.id === id) || null;
    }
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return this.mapUserRow(row);
  }

  async getUsers(): Promise<UserEntity[]> {
    if (this.isFallback) return [...this.usersStore];
    try {
      const rows = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[];
      return rows.map((r) => this.mapUserRow(r)!).filter(Boolean);
    } catch {
      return [];
    }
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

    const avatar = user.avatar || '';
    const integrationsJson = user.integrations ? (typeof user.integrations === 'string' ? user.integrations : JSON.stringify(user.integrations)) : '[]';
    const connectedChannelsJson = (user as any).connected_channels ? (typeof (user as any).connected_channels === 'string' ? (user as any).connected_channels : JSON.stringify((user as any).connected_channels)) : '[]';
    const twoFactor = user.two_factor_enabled ? 1 : 0;

    try {
      this.db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, avatar = ?, avatar_url = ?, theme = ?, language = ?, credits = ?, tier = ?,
            role = ?, api_key = ?, api_key_rotated_at = ?, two_factor_enabled = ?, integrations = ?, connected_channels = ?
        WHERE id = ?
      `).run(
        user.name,
        user.email,
        avatar,
        avatar,
        user.theme || 'dark',
        user.language || 'en',
        user.credits ?? 100,
        user.tier || 'FREE',
        user.role || 'user',
        user.api_key || '',
        user.api_key_rotated_at || '',
        twoFactor,
        integrationsJson,
        connectedChannelsJson,
        user.id
      );
    } catch (e: any) {
      try {
        this.db.prepare(`
          UPDATE users 
          SET name = ?, email = ?, avatar = ?, avatar_url = ?
          WHERE id = ?
        `).run(user.name, user.email, avatar, avatar, user.id);
      } catch {
        this.db.prepare(`
          UPDATE users 
          SET name = ?, email = ?
          WHERE id = ?
        `).run(user.name, user.email, user.id);
      }
    }

    return (await this.getUserById(user.id)) || user;
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
    if (this.isFallback) {
      const list = userId ? this.creditTxStore.filter((t) => t.user_id === userId) : this.creditTxStore;
      return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, limit);
    }
    try {
      if (userId) {
        return this.db.prepare('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as CreditTransactionEntity[];
      }
      return this.db.prepare('SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT ?').all(limit) as CreditTransactionEntity[];
    } catch {
      return [];
    }
  }

  async recordCreditTransaction(tx: CreditTransactionEntity): Promise<CreditTransactionEntity> {
    if (this.isFallback) {
      this.creditTxStore.unshift(tx);
      return tx;
    }
    try {
      this.db.prepare(`
        INSERT INTO credit_transactions (id, user_id, activity, details, amount, balance_after, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        tx.id,
        tx.user_id,
        tx.activity,
        tx.details || '',
        tx.amount,
        tx.balance_after,
        tx.status || 'Success',
        tx.created_at || new Date().toISOString()
      );
    } catch {}
    return tx;
  }

  async createSeries(series: SeriesEntity): Promise<SeriesEntity> {
    if (this.isFallback) {
      this.seriesStore.push(series);
      return series;
    }
    this.db.prepare(`
      INSERT INTO series (id, user_id, title, genre, visual_style, visual_style_prompt, target_audience, episode_count, country, language, ratio, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      series.id,
      series.user_id,
      series.title,
      series.genre,
      series.visual_style || 'realistic',
      series.visual_style_prompt || '',
      series.target_audience || 'General',
      series.episode_count,
      series.country || 'Vietnam',
      series.language || 'vi-VN',
      series.ratio || '9:16',
      series.status
    );
    return (await this.getSeriesById(series.id))!;
  }

  private formatSeriesRow(row: any): SeriesEntity | null {
    if (!row) return null;
    let characters = row.characters;
    if (typeof characters === 'string') {
      try { characters = JSON.parse(characters); } catch {}
    }
    let locations = row.locations;
    if (typeof locations === 'string') {
      try { locations = JSON.parse(locations); } catch {}
    }
    let props = row.props;
    if (typeof props === 'string') {
      try { props = JSON.parse(props); } catch {}
    }
    let masterPlan = row.master_plan;
    if (typeof masterPlan === 'string') {
      try { masterPlan = JSON.parse(masterPlan); } catch {}
    }
    return {
      ...row,
      characters: Array.isArray(characters) ? characters : [],
      locations: Array.isArray(locations) ? locations : [],
      props: Array.isArray(props) ? props : [],
      master_plan: masterPlan || undefined,
    };
  }

  async getSeriesById(id: string): Promise<SeriesEntity | null> {
    if (this.isFallback) {
      return this.seriesStore.find((s) => s.id === id) || null;
    }
    const row = this.db.prepare('SELECT * FROM series WHERE id = ?').get(id) as any;
    return this.formatSeriesRow(row);
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
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(r => this.formatSeriesRow(r)!).filter(Boolean);
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
      if (typeof val === 'object' && val !== null) {
        values.push(JSON.stringify(val));
      } else {
        values.push(val);
      }
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

  private formatEpisodeRow(row: any): EpisodeEntity {
    if (!row) return row;
    let scenes = row.scenes;
    if (typeof scenes === 'string') {
      try { scenes = JSON.parse(scenes); } catch {}
    }
    let locations = row.locations;
    if (typeof locations === 'string') {
      try { locations = JSON.parse(locations); } catch {}
    }
    let props = row.props;
    if (typeof props === 'string') {
      try { props = JSON.parse(props); } catch {}
    }
    let languageTracks = row.language_tracks || row.languageTracks;
    if (typeof languageTracks === 'string') {
      try { languageTracks = JSON.parse(languageTracks); } catch {}
    }
    return {
      ...row,
      scenes: Array.isArray(scenes) ? scenes : [],
      locations: Array.isArray(locations) ? locations : [],
      props: Array.isArray(props) ? props : [],
      languageTracks: Array.isArray(languageTracks) ? languageTracks : [],
      thumbnail_url: row.thumbnail_url || row.cover_image || '',
      cover_image: row.cover_image || row.thumbnail_url || '',
    };
  }

  async createEpisode(episode: EpisodeEntity): Promise<EpisodeEntity> {
    if (this.isFallback) {
      this.episodesStore.push(episode);
      return episode;
    }
    this.db.prepare(`
      INSERT INTO episodes (id, series_id, episode_number, title, synopsis, duration, scenes, script, thumbnail_url, cover_image, language_tracks, scene_core, conflict_escalation, cliffhanger_hook, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      episode.id,
      episode.series_id,
      episode.episode_number,
      episode.title,
      episode.synopsis || '',
      episode.duration || 90,
      typeof episode.scenes === 'object' ? JSON.stringify(episode.scenes) : (episode.scenes || '[]'),
      episode.script || '',
      episode.thumbnail_url || episode.cover_image || '',
      episode.cover_image || episode.thumbnail_url || '',
      typeof episode.languageTracks === 'object' ? JSON.stringify(episode.languageTracks) : (episode.languageTracks || '[]'),
      episode.scene_core || '',
      episode.conflict_escalation || '',
      episode.cliffhanger_hook || '',
      episode.status || 'DRAFT'
    );
    return episode;
  }

  async getEpisodesBySeriesId(seriesId: string): Promise<EpisodeEntity[]> {
    if (this.isFallback) {
      return this.episodesStore.filter((e) => e.series_id === seriesId);
    }
    const rows = this.db.prepare('SELECT * FROM episodes WHERE series_id = ? ORDER BY episode_number ASC').all(seriesId) as any[];
    return rows.map((r) => this.formatEpisodeRow(r));
  }

  async getEpisodeById(id: string): Promise<EpisodeEntity | null> {
    if (this.isFallback) {
      return this.episodesStore.find((e) => e.id === id) || null;
    }
    const ep = this.db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as any;
    return ep ? this.formatEpisodeRow(ep) : null;
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
    const current = this.db.prepare('SELECT * FROM episodes WHERE id = ?').get(id) as any;
    if (!current) return null;

    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'scenes' || key === 'locations' || key === 'props') {
        fields.push(`${key} = ?`);
        values.push(typeof val === 'object' ? JSON.stringify(val) : val);
      } else if (key === 'languageTracks' || key === 'language_tracks') {
        fields.push('language_tracks = ?');
        values.push(typeof val === 'object' ? JSON.stringify(val) : val);
      } else if (key === 'thumbnail_url' || key === 'cover_image') {
        fields.push('thumbnail_url = ?', 'cover_image = ?');
        values.push(val, val);
      } else if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE episodes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    return this.getEpisodeById(id);
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

  async deleteFlowAccount(idOrEmail: string): Promise<boolean> {
    this.flowStore = this.flowStore.filter((f) => f.id !== idOrEmail && f.email !== idOrEmail);
    if (this.isFallback) return true;
    try {
      this.db.prepare('DELETE FROM flow_accounts WHERE id = ? OR email = ?').run(idOrEmail, idOrEmail);
      return true;
    } catch {
      return true;
    }
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

  private assetsStore: any[] = [];

  async saveAsset(asset: any): Promise<any> {
    const idx = this.assetsStore.findIndex((a) => a.id === asset.id);
    if (idx !== -1) {
      this.assetsStore[idx] = { ...this.assetsStore[idx], ...asset };
      return this.assetsStore[idx];
    } else {
      this.assetsStore.unshift(asset);
      return asset;
    }
  }

  async getAssets(filter?: { userId?: string; seriesId?: string; type?: string; characterId?: string; search?: string }): Promise<any[]> {
    let filtered = [...this.assetsStore];
    if (filter?.userId) filtered = filtered.filter(a => a.userId === filter.userId || a.user_id === filter.userId);
    if (filter?.seriesId) filtered = filtered.filter(a => a.seriesId === filter.seriesId);
    if (filter?.type && filter.type !== 'all') filtered = filtered.filter(a => a.type?.toLowerCase() === filter.type?.toLowerCase());
    if (filter?.characterId) filtered = filtered.filter(a => a.characterId === filter.characterId);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(a => a.name?.toLowerCase().includes(q) || a.categoryLabel?.toLowerCase().includes(q) || a.prompt?.toLowerCase().includes(q));
    }
    return filtered;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const prevLen = this.assetsStore.length;
    this.assetsStore = this.assetsStore.filter((a) => a.id !== id);
    return this.assetsStore.length < prevLen;
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
