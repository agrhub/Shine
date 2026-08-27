/**
 * Centralized Type Definitions for Shine Server
 * Strict schema with 100% snake_case field names and non-null fields to catch errors at compile-time.
 */

export interface CharacterWardrobeVariant {
  variant_id: string;
  name: string;
  clothing_and_accessories: string;
  image_url?: string;
  associated_scenes?: number[];
}

/**
 * Series-level Master Character Entity (authoritative definition for entire series)
 */
export interface CharacterEntity {
  id: string;
  series_id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'supporter' | 'lead' | 'extra' | string;
  age: number;
  gender: string;
  nationality: string;
  voice_id: string;
  identity: string;
  traits: string;
  visual_traits: string;
  physical_characteristics: string;
  appearance: string;
  clothing_and_accessories: string;
  speech_style: string;
  avatar?: string; // 9:16 Portrait (Series Face Anchor)
  lora_model: string;
  description: string;
  created_at?: string;
}

/**
 * Episode-level Character Reference (scoped strictly to this episode)
 */
export interface CharacterEpisodeEntity {
  id: string; // References CharacterEntity.id
  name: string;
  clothing_and_accessories: string;
  frame_description: string;
  wardrobe_variants: CharacterWardrobeVariant[];
}

export interface LocationAsset {
  id: string;
  name: string;
  physical_characteristics: string;
  time_of_day: string;
  image_url?: string;
  frame_description?: string;
  status: 'draft' | 'ready' | string;
  created_at?: string;
}

export interface PropAsset {
  id: string;
  name: string;
  physical_characteristics: string;
  image_url?: string;
  frame_description?: string;
  owner?: string;
  status: 'draft' | 'ready' | string;
  created_at?: string;
}

export interface ShotFrame {
  id: string;
  index: number;
  title: string;
  frame_visual: string;
  frame_audio?: string;
  frame_motion?: string;
  dialogue?: {
    speaker: string;
    text: string;
    tone?: string;
  };
  duration_seconds: number;
  linked_asset_ids: string[];
  image_url?: string;
  video_url?: string;
  status: 'draft' | 'image_ready' | 'video_ready';
  scene_context?: string;
  prop_details?: string;
  end_frame_prompt?: string;
  transition_effect?: string;
  video_effect?: string;
  storyboard_end_frame_url?: string;
}

export interface SceneEntity {
  id?: string;
  index: number;
  scene_number?: number;
  shot_number?: number;
  title?: string;
  heading?: string;
  location_id?: string;
  location_name?: string;
  location?: string;
  time_of_day?: string;
  description?: string;
  frame_description?: string;
  duration_seconds?: number;
  shots?: ShotFrame[];
  image_url?: string;
  storyboard_frame_url?: string;
  storyboard_end_frame_url?: string;
  video_url?: string;
  voiceover_url?: string;
  bgm_url?: string;
  status?: 'draft' | 'image_ready' | 'video_ready' | string;
  dialogue?: any;
  characters?: CharacterEpisodeEntity[] | string[];
  props?: string[];
  reference_assets?: any;
  action?: string;
  lighting_mood?: string;
  bgm_mood?: string;
  camera_movement?: string;
  character_costumes?: any[];
  visual_prompt?: string;
  end_frame_prompt?: string;
  scene_core?: string;
  conflict_escalation?: string;
  cliffhanger_hook?: string;
  scene_context?: string;
  prop_details?: string;
  transition_effect?: string;
  video_effect?: string;
  sfx_cues?: string[];
  captions_data?: any[];
  words?: any[];
  translations?: Record<string, {
    dialogue?: string;
    translated_dialogue?: string;
    voiceover_url?: string;
    voice_duration_us?: number;
    voice_duration_ms?: number;
    captions_data?: any[];
    words?: any[];
  }>;
  voice_duration_us?: number;
  voice_start_us?: number;
}

export interface SeriesEntity {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  synopsis: string;
  description?: string;
  visual_style: string;
  visual_style_prompt?: string;
  target_audience: string;
  episode_count: number;
  country: string;
  language: string;
  ratio: string;
  viral_hook: string;
  master_plan: any;
  characters: CharacterEntity[];
  locations: LocationAsset[];
  props: PropAsset[];
  chat_history?: any[];
  status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';
  created_at?: string;
  updated_at?: string;
}

export interface EpisodeRenderVersion {
  version_id: string;
  version_number: number;
  rendered_at: string;
  status: 'RENDER' | 'READY_TO_PUBLISH' | 'PUBLISHED';
  video_url: string;
  video_urls_by_lang: Record<string, string>;
  languages: string[];
  duration?: number;
  notes?: string;
}

export interface EpisodeEntity {
  id: string;
  series_id: string;
  episode_number: number;
  title: string;
  synopsis: string;
  screenplay?: string;
  scene_core?: string;
  conflict_escalation?: string;
  cliffhanger_hook?: string;
  phase?: string;
  scenes: SceneEntity[];
  characters: CharacterEpisodeEntity[];
  locations: LocationAsset[];
  props: PropAsset[];
  script?: string;
  cover_image?: string;
  duration: number;
  status: 'DRAFT' | 'RENDER' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  dubbing_settings?: any;
  caption_settings?: any;
  caption_languages?: string[];
  dubbing_languages?: string[];
  video_url?: string;
  video_urls?: Record<string, string>;
  render_versions?: EpisodeRenderVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface UserEntity {
  id: string;
  email: string;
  password_hash?: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'owner' | 'creator' | 'user' | string;
  api_key?: string;
  api_key_rotated_at?: string;
  two_factor_enabled?: boolean;
  integrations?: { id: string; name: string; icon: string; connected: boolean }[];
  connected_channels?: { id: string; provider: string; channelId: string; channelName: string; channelAvatar?: string; connectedAt: string; status: string }[];
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  credits: number;
  theme?: string;
  language?: string;
  created_at?: string;
}

export interface SystemSettingEntity {
  key: string;
  value: any;
  updated_at?: string;
}

export interface ApiKeyEntity {
  id: string;
  user_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  created_at?: string;
  last_used_at?: string;
}

export interface GenerationLogEntity {
  id: string;
  user_id: string;
  type: string;
  prompt: string;
  result_url?: string;
  credits_used: number;
  status: string;
  created_at?: string;
}

export enum SocialPlatform {
  YOUTUBE = 'youtube',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
}

export interface SocialAccountEntity {
  id?: string;
  user_id: string;
  platform: SocialPlatform | string;
  channel_id: string;
  channel_name: string;
  channel_avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string | Date;
  scopes?: string[];
  is_active?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
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
  avatar_url?: string;
  account_type: string;
  status: AIAccountStatus | string;
  flow_st?: string;
  flow_at?: string;
  flow_at_expires_at?: Date;
  project_id?: string;
  credits?: number;
  error_message?: string;
  last_fingerprint?: Map<string, string>;
  service_keys?: Map<string, string>;
  is_active: boolean;
  save(...args: any[]): Promise<any>;
  created_at?: Date;
  updated_at?: Date;
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
  size_bytes?: number;
  category_label?: string;
  category_color?: string;
  s3_key?: string;
  url: string;
  thumbnail?: string;
  series_id?: string;
  episode_id?: string;
  scene_id?: string;
  character_id?: string;
  prompt?: string;
  provider?: string;
  aspect?: string;
  is_video?: boolean;
  is_audio?: boolean;
  synth_id_verified?: boolean;
  synth_id_hash?: string;
  synth_id_metadata?: any;
  metadata?: any;
  created_at?: string;
}

export interface WorkerHeartbeatEntity {
  worker_id: string;
  worker_name: string;
  service_name: 'shine-render-worker' | 'demucs-worker' | string;
  region: string;
  status: 'ONLINE' | 'BUSY' | 'IDLE' | 'OFFLINE';
  cpu_usage_pct?: number;
  memory_usage_mb?: number;
  active_jobs_count?: number;
  completed_jobs_count?: number;
  failed_jobs_count?: number;
  last_heartbeat: string;
  metadata?: any;
}

export interface WorkerJobEntity {
  job_id: string;
  worker_id?: string;
  worker_name?: string;
  service_name: string;
  series_id?: string;
  series_title?: string;
  episode_id?: string;
  progress: number;
  status: 'QUEUED' | 'RENDERING' | 'COMPOSITING' | 'COMPLETED' | 'FAILED';
  download_url?: string;
  output_url?: string;
  error?: string;
  render_time_ms?: number;
  file_size?: number;
  submitted_at: string;
  updated_at: string;
}

export interface ClusterMetricsSummary {
  active_instances: number;
  gpu_load_pct: number;
  active_jobs_count: number;
  queued_jobs_count: number;
  completed_jobs_count: number;
  failed_jobs_count: number;
  monthly_cost_usd: number;
  monthly_budget_cap: number;
  service_name: string;
  region: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  workers: WorkerHeartbeatEntity[];
  active_jobs: WorkerJobEntity[];
}
