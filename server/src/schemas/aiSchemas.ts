import { z } from 'zod';
import { Logger } from '@/utils/logger.js';

// ─── 1. Core Asset Schemas ──────────────────────────────────────────────────

export const CharacterWardrobeVariantSchema = z.object({
  variant_id: z.string(),
  name: z.string(),
  clothing_and_accessories: z.string(),
  image_url: z.string().optional().nullable(),
  associated_scenes: z.array(z.number()).optional().default([]),
});

export const CharacterSeriesEntitySchema = z.object({
  id: z.string(),
  series_id: z.string().optional(),
  name: z.string(),
  role: z.string(),
  age: z.number(),
  gender: z.string(),
  nationality: z.string(),
  voice_id: z.string(),
  identity: z.string(),
  traits: z.string(),
  visual_traits: z.string(),
  physical_characteristics: z.string(),
  appearance: z.string(),
  clothing_and_accessories: z.string(),
  frame_description: z.string(),
  wardrobe_variants: z.array(CharacterWardrobeVariantSchema),
  speech_style: z.string(),
  description: z.string(),
  avatar: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  lora_model: z.string().optional().nullable(),
  created_at: z.string().optional(),
});

export const LocationAssetSchema = z.object({
  id: z.string(),
  series_id: z.string().optional(),
  name: z.string(),
  physical_characteristics: z.string(),
  time_of_day: z.string().optional().default('DAY'),
  image_url: z.string().optional().nullable(),
  frame_description: z.string().optional(),
});

export const PropAssetSchema = z.object({
  id: z.string(),
  series_id: z.string().optional(),
  name: z.string(),
  physical_characteristics: z.string(),
  image_url: z.string().optional().nullable(),
  frame_description: z.string().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
});

// ─── 2. Scene & Dialogue Schemas ────────────────────────────────────────────

export const SceneDialogueSchema = z.object({
  character: z.string(),
  line: z.string(),
  speech_tone: z.string().optional(),
  emotion: z.string().optional(),
  speech_start_sec: z.number().optional(),
  speech_duration_sec: z.number().optional(),
  voice_id: z.string().optional(),
});

export const SceneCaptionWordLevelSchema = z.object({
  word: z.string(),
  start_ms: z.number(),
  end_ms: z.number(),
  speaker: z.string().optional(),
});

export const SceneCaptionSchema = z.object({
  start_time: z.number(),
  end_time: z.number(),
  text: z.string(),
  speaker: z.string().optional(),
  words: z.array(SceneCaptionWordLevelSchema).optional(),
});

export const CharacterSceneCostumesSchema = z.object({
  character: z.string(),
  wardrobe: z.string(),
  variant_id: z.string(),
  character_id: z.string().optional(),
});

export const SceneReferenceAssetsSchema = z.object({
  characters: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
});

export const SceneEntitySchema = z.object({
  index: z.number(),
  scene_number: z.number(),
  title: z.string(),
  location: z.string(),
  time_of_day: z.string(),
  lighting_mood: z.string(),
  bgm_mood: z.string().optional().default(''),
  action: z.string(),
  camera_movement: z.string(),
  dialogue: z.array(SceneDialogueSchema).default([]),
  character_costumes: z.array(CharacterSceneCostumesSchema).default([]),
  reference_assets: SceneReferenceAssetsSchema.default({ characters: [], locations: [], props: [] }),
  visual_prompt: z.string().default(''),
  end_frame_prompt: z.string().default(''),
  duration_seconds: z.number().default(5),
  voice_start_us: z.number().optional().default(0),
  voice_duration_us: z.number().optional().default(0),
  voice_id: z.string().optional().default(''),
  captions_data: z.array(SceneCaptionSchema).optional().default([]),
  words: z.array(SceneCaptionWordLevelSchema).optional().default([]),
  speech_timing_prompt: z.string().optional().default(''),
  status: z.string().optional().default('draft'),
  storyboard_frame_url: z.string().optional().nullable(),
  storyboard_end_frame_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  voiceover_url: z.string().optional().nullable(),
  bgm_url: z.string().optional().nullable(),
  transition_effect: z.string().optional().default('none'),
  video_effect: z.string().optional().default('none'),
  image_gen_prompt: z.string().optional(),
  video_gen_prompt: z.string().optional(),
});

// ─── 3. Episode & Plan Schemas ──────────────────────────────────────────────

export const StoryCoreSchema = z.object({
  core_attraction: z.string(),
  psychological_pleasure: z.string(),
  gold_finger_rule: z.string(),
});

export const ActStructureSchema = z.object({
  act_number: z.number(),
  name: z.string(),
  episode_range: z.string(),
  function: z.string(),
  core_question: z.string(),
  act_climax: z.string(),
});

export const MajorReversalSchema = z.object({
  reversal_index: z.number(),
  episode_number: z.number(),
  setup_hook: z.string(),
  reversal_event: z.string(),
  audience_impact: z.string(),
});

export const PaywallHookSchema = z.object({
  percentage: z.string(),
  episode_number: z.number(),
  type: z.string(),
  hook_description: z.string(),
  ad_hook_30s_prompt: z.string().optional().default(''),
});

export const EpisodeSkeletonSchema = z.object({
  episode_number: z.number(),
  title: z.string(),
  synopsis: z.string(),
  scene_core: z.string(),
  conflict_escalation: z.string(),
  cliffhanger_hook: z.string(),
  phase: z.string(),
  scene_count: z.number().optional().default(3),
  duration_seconds: z.number().optional().default(60),
});

export const MasterPlanSchema = z.object({
  series_id: z.string().optional().default(''),
  title: z.string(),
  genre: z.string(),
  visual_style: z.string(),
  visual_style_prompt: z.string().optional().default(''),
  country: z.string(),
  ratio: z.string().optional().default('9:16'),
  total_episodes: z.number(),
  total_duration_seconds: z.number().optional().default(60),
  story_core: StoryCoreSchema,
  synopsis: z.string(),
  hidden_line: z.string(),
  target_audience: z.string(),
  viral_hook: z.string(),
  estimated_retention: z.string().optional().default('85%'),
  characters: z.array(CharacterSeriesEntitySchema),
  locations: z.array(LocationAssetSchema).optional().default([]),
  props: z.array(PropAssetSchema).optional().default([]),
  three_acts: z.array(ActStructureSchema),
  major_reversals: z.array(MajorReversalSchema).optional().default([]),
  paywall_hooks: z.array(PaywallHookSchema).optional().default([]),
  episodes: z.array(EpisodeSkeletonSchema),
});

export const ScriptItemSchema = z.object({
  episode: z.string().optional().default(''),
  episode_number: z.number(),
  title: z.string(),
  synopsis: z.string().optional().default(''),
  screenplay: z.string().optional().default(''),
  scene_core: z.string().optional().default(''),
  conflict_escalation: z.string().optional().default(''),
  cliffhanger_hook: z.string().optional().default(''),
  total_duration_seconds: z.number().default(90),
  scenes: z.array(SceneEntitySchema).default([]),
  characters: z.array(CharacterSeriesEntitySchema).optional().default([]),
  locations: z.array(LocationAssetSchema).optional().default([]),
  props: z.array(PropAssetSchema).optional().default([]),
});

// ─── 4. Validation Helper ───────────────────────────────────────────────────

export function validateAiJson<T>(
  raw: unknown,
  schema: z.ZodType<T>,
  contextName = 'AI Response'
): T {
  let dataToValidate = raw;

  if (typeof raw === 'string') {
    let clean = raw.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }
    try {
      dataToValidate = JSON.parse(clean);
    } catch (parseError: any) {
      Logger.error(`[ZodValidation] Failed to parse JSON string for ${contextName}: ${parseError.message}`);
      throw new Error(`Invalid JSON format in ${contextName}: ${parseError.message}`);
    }
  }

  const result = schema.safeParse(dataToValidate);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map(e => `• ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    Logger.error(`[ZodValidation] Schema validation failed for ${contextName}:\n${errorDetails}`);
    throw new Error(`AI output validation failed for ${contextName}:\n${errorDetails}`);
  }

  return result.data;
}
