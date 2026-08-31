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
  category?: string;
}

export interface CharacterSceneCostumes {
  character_id?: string;
  variant_id: string;
  character: string;
  wardrobe: string;
}

/**
 * Series-level Master Character Entity (Single Source of Truth for entire series)
 */
export interface CharacterSeriesEntity {
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
  frame_description: string;
  wardrobe_variants: CharacterWardrobeVariant[];
  speech_style: string;
  avatar?: string | null;
  image_url?: string;
  lora_model?: string;
  description: string;
  created_at?: string;
}


export interface LocationAsset {
  id: string;
  series_id?: string;
  name: string;
  physical_characteristics: string;
  time_of_day?: string;
  image_url?: string;
  frame_description?: string;
}

export interface PropAsset {
  id: string;
  series_id?: string;
  name: string;
  physical_characteristics: string;
  image_url?: string;
  frame_description?: string;
  owner?: string;
}

export interface ShotFrame {
  id: string;
  index: number;
  title: string;
  frame_visual: string;
  frame_audio?: string;
  frame_motion?: string;
  dialogue?: SceneDialogue[];
  duration_seconds: number;
  linked_asset_ids: string[];
  image_url?: string;
  video_url?: string;
  status: 'draft' | 'image_ready' | 'video_ready';
  scene_context?: string;
  // prop_details?: string;
  end_frame_prompt?: string;
  transition_effect?: string;
  video_effect?: string;
  storyboard_end_frame_url?: string;
}

export interface SceneReferenceAssets {
  characters: string[];
  locations: string[];
  props: string[];
}

export interface CaptionWord {
  text: string;
  from: number;//ms
  to: number;//ms
  is_key_word: boolean;
}


export interface SceneCaptionWordLevel {
  word: string;
  start: number;//ms
  end: number;//ms
  punctuated_word: string;
  confidence: number;
};

export interface SceneCaption {
  id: string;
  text: string;
  duration_ms: number;
  duration_us: number;
  from_us: number;
  end_ms: number;
  start_ms: number;
  to_us: number;
  words: CaptionWord[];
}

export interface SceneDialogue {
  character: string;
  emotion: string;
  line: string;
  speech_tone: string;
  speed?: number;
}

export interface SceneEffect {
  effect_key: `vignette` | `retro70s` | `filmStripPro` | `sepia` | `tvScanlines` | `glitch` | `rgbGlitch` | `shine` | `bloomFilter` | `glowFilter` | `oldFilmFilter` | `crtFilter` | `motionBlur` | `cameraMove` | `fastZoom` | `shockwaveFilter` | '';
  intensity: number;
}

export interface SceneEntity {
  id: string;
  index: number;
  scene_number: number;
  shot_number: number;
  title: string;
  heading: string;
  // location_id?: string;
  // location_name?: string;
  location: string;
  time_of_day: string;
  description: string;
  frame_description: string;
  duration_seconds: number;
  // shots?: ShotFrame[];
  image_url?: string;
  storyboard_frame_url?: string;
  storyboard_end_frame_url?: string;
  video_url?: string;
  voiceover_url?: string;
  bgm_url?: string;
  status: 'draft' | 'image_ready' | 'video_ready' | string;
  dialogue: SceneDialogue[];
  reference_assets: SceneReferenceAssets;
  action: string;
  lighting_mood: string;
  bgm_mood?: string;
  camera_movement: string;
  character_costumes: CharacterSceneCostumes[];
  visual_prompt: string;
  end_frame_prompt: string;
  // scene_core?: string;
  // conflict_escalation?: string;
  // cliffhanger_hook?: string;
  scene_context: string;
  prop_details: string;
  transition_effect: `fade` | `wipeLeft` | `wipeRight` | `cube`
    | `CrossZoom` | `SimpleZoom` | `DreamyZoom` | `glitchMemories` | `GlitchDisplace`
    | `dreamy` | `Swirl` | `waterDrop` | `ripple` | `wind` | `LinearBlur` | `Mosaic` | `pixelize`
    | `circleopen` | `windowslice` | `doorway` | `burn` | `InvertedPageCurl` | '';
  effects: SceneEffect[];
  video_effect: `vignette` | `retro70s` | `filmStripPro` | `sepia`
    | `tvScanlines` | `glitch` | `rgbGlitch` | `shine` | `bloomFilter`
    | `glowFilter` | `oldFilmFilter` | `crtFilter` | `motionBlur`
    | `cameraMove` | `fastZoom` | `shockwaveFilter` | '';
  sfx_cues?: string[];
  captions_data?: SceneCaption[];
  words?: SceneCaptionWordLevel[];
  translations?: Record<string, {
    dialogue?: SceneDialogue[];
    translated_dialogue?: SceneDialogue[];
    voiceover_url?: string;
    voice_duration_us?: number;
    voice_duration_ms?: number;
    voice_start_us?: number;
    captions_data?: SceneCaption[];
    words?: SceneCaptionWordLevel[];
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
  published_episode_count?: number;
  episode_duration: number;
  country: string;
  language: string;
  ratio: "9:16" | "16:9" | "4:3" | "1:1";
  viral_hook: string;
  cover_image?: string;
  master_plan: MasterPlanOutput;
  characters: CharacterSeriesEntity[];
  locations: LocationAsset[];
  props: PropAsset[];
  chat_history?: any[];
  status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'ARCHIVED';
  created_at?: string;
  updated_at?: string;
}

// export interface EpisodeRenderVersion {
//   version_id: string;
//   version_number: number;
//   rendered_at: string;
//   status: 'RENDER' | 'READY_TO_PUBLISH' | 'PUBLISHED';
//   video_url: string;
//   video_urls_by_lang: Record<string, string>;
//   languages: string[];
//   duration?: number;
//   notes?: string;
// }

export interface EpisodeReferenceAssets {
  character_ids?: string[];
  location_ids?: string[];
  prop_ids?: string[];
}

export interface DubbingSettings {
  voice_name?: string;
  voice_id?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  languages?: string[];
  primary_language?: string;
  enable_bubbing?: boolean;
  auto_ducking?: boolean;
  voice_preset?: string;
  voice_intensity?: number;
  voice_pacing?: number;
}

export interface CaptionSettings {
  languages?: string[];
  burn_in?: boolean;
  enable_caption?: boolean;
  caption_style?: 'pop' | 'minimal' | 'comic' | 'neon' | 'karaoke';
  font_family?: string;
  font_size?: number;
  font_url?: string;
  text_color?: string;
  word_highlight_color?: string;
  outline_color?: string;
  outline_weight?: number;
  vertical_pos?: number;
  vertical_align?: 'top' | 'center' | 'bottom';
  text_align?: 'left' | 'center' | 'right';
  words_per_line?: 'multiple' | 'single';
  text_case?: 'none' | 'uppercase' | 'lowercase';
  enable_background_box?: boolean;
  bg_color?: string;
  highlight_animate?: boolean;
}

export interface EpisodeRenderVersion {
  id?: string;
  version_id?: string;
  language: string;
  languages?: string[];
  voice?: string;
  subtitles?: string[];
  resolution?: string;
  video_url?: string;
  url?: string;
  thumbnail_url?: string;
  duration?: number;
  file_size?: string;
  rendered_at?: string;
  status?: string;
}

export interface RenderedVersionItem {
  id: string;
  episode_id: string;
  episode_number: number;
  episode_title: string;
  language: string;
  voice: string;
  subtitles: string[];
  resolution: string;
  video_url: string;
  thumbnail_url: string;
  duration: number;
  file_size: string;
  rendered_at: string;
  status: string;
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
  reference_assets?: EpisodeReferenceAssets;
  scenes: SceneEntity[];
  script?: string;
  cover_image?: string;
  duration: number;
  duration_seconds?: number;
  status: 'DRAFT' | 'RENDER' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'ARCHIVED';
  dubbing_settings?: DubbingSettings;
  caption_settings?: CaptionSettings;
  caption_languages?: string[];
  dubbing_languages?: string[];
  video_url?: string;
  video_urls?: Record<string, string>;
  render_versions?: EpisodeRenderVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface PlatformAccount {
  id: string; 
  provider: "youtube" | "facebook" | "tiktok" | "instagram" | "threads"; 
  channel_id: string; 
  channel_name: string; 
  channel_avatar?: string; 
  handle?: string;
  access_token?: string;
  refresh_token?: string;
  connected_at: string; 
  status: string;
  expires_at?: number;
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
  integrations?: { 
    id: string; 
    name: string; 
    icon: string; 
    connected: boolean 
  }[];
  connected_channels?: PlatformAccount[];
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  credits: number;
  theme?: string;
  language?: string;
  created_at?: string;
}

export interface StorageSystemConfig {
  provider?: string;
  bucketName?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  accountId?: string;
  publicDomain?: string;
}

export interface StudioSystemConfig {
  s3?: StorageSystemConfig;
  storage?: StorageSystemConfig;
  gcs?: {
    bucketName?: string;
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
  };
  gemini?: {
    textModel?: string;
    imageModel?: string;
    videoModel?: string;
    apiKey?: string;
  };
  parallel?: Record<string, unknown>;
  grafana?: Record<string, unknown>;
  pixabay?: Record<string, unknown>;
  freesound?: Record<string, unknown>;
  pexels?: Record<string, unknown>;
  captcha?: {
    enabled?: boolean;
    provider?: string;
    siteKey?: string;
    secretKey?: string;
  };
  email?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  cloudRun?: Record<string, unknown>;
  pubsub?: Record<string, unknown>;
  creditRates?: Record<string, number>;
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

export interface PipelineJobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface AssetJobItem {
  id: string;
  name: string;
  type: 'character' | 'wardrobe' | 'location' | 'prop' | 'storyboard' | 'video' | 'voice' | 'subtitle' | 'render' | 'bgm' | 'sfx' | string;
  status: 'pending' | 'completed' | 'failed';
  url?: string;
  thumbnail?: string;
  scene_index?: number;
  shot_number?: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface PipelineJobStepProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  message?: string;
  started_at?: string;
  completed_at?: string;
  assets?: AssetJobItem[];
}

export interface PipelineJobEntity {
  id: string;
  user_id: string;
  series_id: string;
  episode_id: string;
  session_id?: string;
  type: 'full_pipeline' | 'step_b1' | 'step_b2' | 'step_b3' | 'step_b4' | 'step_b5' | 'step_b6' | 'render' | string;
  title: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 - 100
  current_step: string;
  step_progress?: Record<string, PipelineJobStepProgress>;
  outputs?: Record<string, any>;
  logs: PipelineJobLog[];
  error?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string;
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

export interface StorySkeletonInput {
  title: string;
  genre: string;
  visual_style?: string;
  visual_style_prompt?: string;
  synopsis: string;
  total_episodes?: number;
  episode_duration_seconds?: number;
  country?: string;
  language?: string;
  ratio?: string;
  viral_topic?: string;
  reference_assets?: any[];
}

// export interface CharacterPersona {
//   name: string;
//   role: 'protagonist' | 'antagonist' | 'supporter';
//   gender?: 'male' | 'female' | 'neutral';
//   age?: number;
//   nationality?: string;
//   voice_id?: string;
//   identity: string;
//   appearance?: string; // Facial features, physical build, age appearance matching target country
//   visual_traits?: string;
//   physical_characteristics?: string;
//   description?: string;
//   costume_style?: string; // Signature cultural/regional wardrobe, styling, and signature accessories
//   traits: string;
//   circumstance: string;
//   action: string;
//   ending: string;
//   avatar?: string | null;
//   lora_anchor?: string;
//   speech_style?: string;
//   empathy_elements?: string;
// }

export interface ActStructure {
  act_number: number;
  name: string;
  episode_range: string;
  function: string;
  core_question: string;
  act_climax: string;
}

export interface MajorReversal {
  reversal_index: number;
  episode_number: number;
  setup_hook: string;
  reversal_event: string;
  audience_impact: string;
}

export interface PaywallHook {
  percentage: string;
  episode_number: number;
  type: 'First Climax' | 'Life-Death Crisis' | 'Mid-Season Twist' | 'Late Reversal' | 'Grand Finale';
  hook_description: string;
  ad_hook_30s_prompt: string;
}

export interface EpisodeSkeleton {
  episode_number: number;
  title: string;
  synopsis: string;
  scene_core: string;
  conflict_escalation: string;
  cliffhanger_hook: string;
  phase: string;
  scene_count: number;
  duration_seconds?: number;
}

export interface StoryCore {
  core_attraction: string;
  psychological_pleasure: string;
  gold_finger_rule: string;
}

// export interface LocationPersona {
//   id?: string;
//   name: string;
//   physical_characteristics: string;
//   time_of_day?: string;
//   image_url?: string;
// }

// export interface PropPersona {
//   id?: string;
//   name: string;
//   physical_characteristics: string;
//   image_url?: string;
// }

export interface MasterPlanOutput {
  series_id: string;
  title: string;
  genre: string;
  visual_style: string;
  visual_style_prompt: string;
  country: string;
  ratio: string;
  total_episodes: number;
  total_duration_seconds?: number;
  language: string;
  setting_context?: {
    era: string; // e.g. Modern 2026, Cyberpunk, 1990s retro
    location: string; // e.g. High-tech metropolis, bustling apartment complex, corporate towers
    cultural_atmosphere: string; // Local lifestyle, social classes, architecture and visual aesthetic
  };
  story_core: StoryCore;
  synopsis: string;
  hidden_line: string;
  target_audience: string;
  viral_hook: string;
  estimated_retention: string;
  characters: CharacterSeriesEntity[];
  locations?: LocationAsset[];
  props?: PropAsset[];
  three_acts: ActStructure[];
  major_reversals: MajorReversal[];
  paywall_hooks: PaywallHook[];
  episodes: EpisodeSkeleton[];
}

export interface IProjectSettings {
  width: number;
  height: number;
  fps: number;
  duration?: number;
  backgroundColor?: string;
  artboardColor?: string;
  format?: string;
  videoCodec?: string;
  bitrate?: number;
  audio?: boolean;
  audioCodec?: string;
  audioSampleRate?: number;
  prioritizeSpeed?: boolean;
  [key: string]: any;
}

export interface ITrack {
  id: string;
  name: string;
  type: string;
  clipIds: string[];
  accepts?: string[];
  static?: boolean;
  muted?: boolean;
  visible?: boolean;
  languageCode?: string;
  config?: any;
  [key: string]: any;
}

export interface IProject {
  settings: IProjectSettings;
  tracks: ITrack[];
  clips: Record<string, any>;
  [key: string]: any;
}

export interface TimelineSnapshotVersion {
  version_id: string;
  version_number: number;
  author?: { userId?: string; name?: string; avatar?: string };
  change_summary?: string;
  created_at: string;
  timeline_data: IProject;
}

export interface TimelineSnapshotHistoryItem {
  version_id: string;
  version_number: number;
  label?: string;
  author?: {
    userId?: string;
    name?: string;
    avatar?: string;
  };
  change_summary?: string;
  created_at: string;
}

export interface RestoreTimelineResult {
  success: boolean;
  restored_from_version_id: string;
  new_version_id: string;
  new_version_number: number;
  active_timeline: IProject;
  created_at: string;
}
