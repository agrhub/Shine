export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
  error: string | null;
}

export interface ViralTopic {
  id: string;
  topic: string;
  hashtag: string;
  category: string;
  region: string;
  viralityScore: number;
  retentionEstimate: number;
  description: string;
}

export interface Anchor {
  id: string;
  name: string;
  matchScore: number;
  status: 'locked' | 'pending' | 'failed';
  landmarkType: string;
  imageUrl?: string;
}

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  locked: boolean;
  tags: string[];
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  avatarUrl: string;
  loraModel: string;
  description: string;
  anchors: Anchor[];
  wardrobe: WardrobeItem[];
  meshMatchRate: number;
}

export interface SceneLine {
  id: string;
  speaker: string;
  dialogue: string;
  emotion: string;
  cameraMovement: string;
  pacing: string;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  atmosphere: string;
  lines: SceneLine[];
}

export interface ScriptItem {
  seriesId: string;
  episodeNumber: number;
  title: string;
  hook: string;
  cliffhanger: string;
  scenes: Scene[];
  status: 'draft' | 'in_progress' | 'done';
}

export interface SupervisionResult {
  passed: boolean;
  score: number;
  suggestions: string[];
  safetyVerified: boolean;
  consistencyScore: number;
}

export interface StoryboardFrame {
  id: string;
  sceneId: string;
  frameIndex: number;
  durationSeconds: number;
  prompt: string;
  imageUrl?: string;
}

export interface SeriesOutline {
  seriesId: string;
  title: string;
  genre: string;
  tone: string;
  totalEpisodes: number;
  synopsis: string;
  episodes: Array<{
    episodeNumber: number;
    title: string;
    hook: string;
    cliffhanger: string;
  }>;
}

export interface CompositorPayload {
  seriesId: string;
  episodeId: string;
  tracks: Array<{
    id: string;
    type: 'video' | 'audio' | 'subtitle';
    clips: Array<{
      id: string;
      startTime: number;
      duration: number;
      assetUrl: string;
    }>;
  }>;
}

export interface RenderJob {
  jobId: string;
  seriesId: string;
  episodeId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl: string | null;
  error?: string | null;
}

export interface RenderStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl: string | null;
  error: string | null;
}

export interface ParityCheckResult {
  ssim: number;
  passed: boolean;
  diffImageUrl?: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  accent?: string;
  provider?: string;
  emotion?: string;
  sampleUrl?: string;
  sampleAudioUrl?: string;
  audioSampleUrl?: string;
  avatarUrl?: string;
  description?: string;
  cloned?: boolean;
}

export interface TtsRequest {
  text: string;
  voiceId: string;
  emotionTag: string;
  intensityLevel: number;
  pitch?: number;
  pacing?: number;
}

export interface WordTiming {
  word: string;
  startTimeMs: number;
  endTimeMs: number;
}

export interface TtsResponse {
  audioUrl: string;
  durationMs: number;
  wordTimings: WordTiming[];
}

export interface KaraokeStyle {
  preset: 'pop' | 'bounce' | 'fade' | 'slide';
  emojiSentiment: boolean;
  bassSync: boolean;
  textColor?: string;
  fontSizePx?: number;
  verticalPosPct?: number;
  outlineWeightPx?: number;
  autoHighlight?: boolean;
  targetLanguage?: string;
}

export interface SpatialAudioConfig {
  trackPans: Record<string, number>;
  reverbProfile: 'studio' | 'penthouse' | 'hall' | 'outdoor';
  autoDucking: boolean;
}

export interface CliffhangerJob {
  transitionType: 'glitch' | 'flash';
  zoomKeyframe: boolean;
  stingerWavUrl: string;
  ctaText: string;
  progress?: number;
  status?: 'queued' | 'processing' | 'completed';
}

export interface Command {
  type: string;
  targetModule: string;
  payload: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  commands?: Command[];
  attachments?: string[];
}

export interface CopilotAlert {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  canvasPosition: { x: number; y: number };
  code?: string;
  suggestedAction?: string;
}

export interface CostGuardrails {
  maxBudgetUsd: number;
  currentSpendUsd: number;
  lowResProxyMode: boolean;
}

export interface PatchEvent {
  userId: string;
  sessionId: string;
  seriesId: string;
  commands: Command[];
  timestamp: number;
}

export interface CollaboratorSession {
  userId: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  joinedAt: number;
}

export interface PublishJob {
  id: string;
  seriesId: string;
  episodeId: string;
  platforms: ('tiktok' | 'youtube' | 'instagram' | 'facebook' | 'douyin')[];
  status: 'queued' | 'publishing' | 'success' | 'failed';
  publishedUrls: Record<string, string>;
  caption?: string;
  hashtags?: string[];
  coverUrl?: string;
  createdAt: string;
}

export interface SubscriptionTier {
  tier: 'free' | 'creator' | 'studio' | 'enterprise';
  creditBalance: number;
  creditQuota: number;
  features: string[];
  monthlyPriceUsd: number;
}

export interface MarketplaceTemplate {
  id: string;
  title: string;
  genre: string;
  description: string;
  previewUrl: string;
  price: number;
  author: string;
  rating: number;
  downloadsCount: number;
}

export interface VirtualActor {
  id: string;
  name: string;
  gender: string;
  style: string;
  thumbnailUrl: string;
  sampleVideoUrl: string;
  dailyRateUsd: number;
  rating: number;
  languages: string[];
}

export interface PaywallRecommendation {
  episodeId: string;
  episodeNumber: number;
  suggestedPaywallType: 'coins' | 'subscription' | 'ad_unlock';
  confidenceScore: number;
  predictedRetentionRate: number;
  reasoning: string;
}




