/**
 * Central Google ADK FunctionTools for Shine AI Copilot & Pipeline
 */

import { FunctionTool } from '@google/adk';
import { PipelineTools } from './pipeline.tools.js';
import { Type } from '@google/genai';
import { nanoid } from 'nanoid';
import { getDatabaseProvider } from '../../database/index.js';
import { SeriesService } from '../../services/SeriesService.js';
import { supervisionAgent } from '../SupervisionAgent.js';
import { Logger } from '~/utils/logger.js';

export interface ToolContextParams {
  userId?: string;
  seriesId: string;
  episodeId: string;
  context?: any;
  onChunk?: (chunk: string) => void;
  onProgress?: (progress: any) => void;
  onItemUpdated?: (event: any) => void;
  onToolCall?: (toolCall: any) => void;
}

/**
 * Master Plan & Screenplay Tools (Specialized for Step 3 Wizard & Series Blueprint)
 */
export function createMasterPlanTools({ userId, seriesId, episodeId, context, onItemUpdated }: ToolContextParams): FunctionTool[] {
  return [
    new FunctionTool({
      name: 'verify_compliance',
      description: 'Audit the master plan against platform safety, copyright, and regional cultural sensitivities.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          country: { type: Type.STRING, description: 'Optional target country override' },
          ratio: { type: Type.STRING, description: 'Optional aspect ratio override' },
        },
      },
      execute: async (args: any) => {
        const plan = context?.currentPlan;
        if (!plan) {
          throw new Error('Master plan is missing in context.');
        }
        const country = args.country || plan.country || context?.country || 'United States';
        const ratio = args.ratio || plan.ratio || context?.ratio || '9:16';
        const result = await supervisionAgent.verifyMasterPlanCompliance({
          masterPlan: plan,
          country,
          ratio,
        });

        onItemUpdated?.({ type: 'compliance_verified', data: result });
        return {
          success: true,
          score: result.overallScore,
          status: result.isCompliant ? 'PASSED' : 'FLAGGED',
          message: `Master plan for "${plan.title || 'Series'}" scored ${result.overallScore}% compliance in ${country}.`,
          complianceResult: result,
        };
      },
    }),

    new FunctionTool({
      name: 'create_series',
      description: 'Persist the finalized screenplay master plan and create the series project with all serialized episodes in the database.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Optional series title override' },
          genre: { type: Type.STRING, description: 'Optional series genre override' },
          synopsis: { type: Type.STRING, description: 'Optional series synopsis override' },
        },
      },
      execute: async (args: any) => {
        if (!userId) {
          throw new Error('User authentication required: userId is missing');
        }

        // Direct and exclusive source of truth is context.currentPlan
        const finalMasterPlan = context?.currentPlan;
        if (!finalMasterPlan) {
          throw new Error('Master plan is missing in context. Please generate a master plan first.');
        }

        const title = args.title || finalMasterPlan.title || context?.title || 'Untitled Series';
        const genre = args.genre || finalMasterPlan.genre || context?.genre || 'Drama';
        const synopsis = args.synopsis || finalMasterPlan.synopsis || finalMasterPlan.storyCore?.coreAttraction || context?.synopsis || '';
        const country = args.country || finalMasterPlan.country || context?.country || 'United States';
        const language = args.language || finalMasterPlan.language || context?.language || 'en-US';
        const visualStyle = args.visualStyle || finalMasterPlan.visualStyle || context?.visualStyle || 'realistic';
        const ratio = args.ratio || finalMasterPlan.ratio || context?.ratio || '9:16';
        const rawEpCount = Number(args.episodeCount) || Number(finalMasterPlan.totalEpisodes) || Number(finalMasterPlan.episodeCount) || Number(context?.targetEpisodes) || (Array.isArray(finalMasterPlan.episodes) ? finalMasterPlan.episodes.length : 24);

        try {
          const { series, episodes } = await SeriesService.createSeries({
            title,
            genre,
            synopsis,
            country,
            language,
            visualStyle,
            ratio,
            masterPlan: finalMasterPlan,
            episodeCount: rawEpCount,
            userId,
          });

          onItemUpdated?.({ type: 'series_created', data: series });
          return {
            success: true,
            message: `Series "${title}" created successfully with all ${episodes.length} episodes!`,
            series,
            episodes,
            seriesId: series.id,
          };
        } catch (err: any) {
          Logger.error(`[create_series] Error creating series: ${err.message}`);
          return {
            success: false,
            error: err.message,
            message: `❌ Failed to create series: ${err.message}`,
          };
        }
      },
    }),
  ];
}

/**
 * 1. Production Pipeline & Asset ADK Tools
 */
export function createProductionPipelineTools(params: ToolContextParams): FunctionTool[] {
  const { userId, seriesId, episodeId, onProgress, onItemUpdated, onToolCall } = params;

  return [
    new FunctionTool({
      name: 'get_episode_status',
      description: 'Get the current real-time production status of all assets, scenes, characters, locations, and props.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
      execute: async () => {
        return await PipelineTools.getEpisodeStatus({ seriesId, episodeId });
      },
    }),

    // ─── 2. Character Generation ────────────────────────────────────────────
    new FunctionTool({
      name: 'generate_character_asset',
      description: 'Generate or re-render character concept art / portrait sheet. If asset exists, confirm first unless forced.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          character_name: { type: Type.STRING, description: 'The exact name of the character' },
          variant_id: { type: Type.STRING, description: 'Optional wardrobe variant ID' },
          physical_characteristics: { type: Type.STRING, description: 'Visual facial and body traits' },
          clothing_and_accessories: { type: Type.STRING, description: 'Outfit description' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if image already exists' },
        },
        required: ['character_name'],
      },
      execute: async (args: any) => {
        const charName = args.character_name || args.characterName;
        const res = await PipelineTools.generateCharacterAsset({
          userId,
          seriesId,
          episodeId,
          characterName: charName,
          variantId: args.variant_id || args.variantId,
          physicalCharacteristics: args.physical_characteristics || args.physicalCharacteristics,
          clothingAndAccessories: args.clothing_and_accessories || args.clothingAndAccessories,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'character', data: res.data });
        }
        return res;
      },
    }),

    // ─── 2b. Character Wardrobe Variants Generation ────────────────────────
    new FunctionTool({
      name: 'generate_wardrobe_variants',
      description: 'Generate wardrobe costume variants for all main characters (or a specific character). Only creates character outfits/variants; does NOT generate locations, props, or scenes.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          character_name: { type: Type.STRING, description: 'Optional specific character name to generate wardrobe variants for. If omitted, generates for all characters.' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if image already exists' },
        },
      },
      execute: async (args: any) => {
        const res = await PipelineTools.generateWardrobeVariants({
          userId,
          seriesId,
          episodeId,
          characterName: args.character_name || args.characterName,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
          onProgress,
          onItemUpdated,
          onToolCall,
        });
        return res;
      },
    }),

    // ─── 3. Location Generation ─────────────────────────────────────────────
    new FunctionTool({
      name: 'generate_location_asset',
      description: 'Generate or re-render background environment / location shot. If asset exists, confirm first unless forced.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          location_name: { type: Type.STRING, description: 'The name of the location' },
          physical_characteristics: { type: Type.STRING, description: 'Visual architectural and atmosphere description' },
          time_of_day: { type: Type.STRING, description: 'DAY, NIGHT, DUSK, DAWN' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if image already exists' },
        },
        required: ['location_name'],
      },
      execute: async (args: any) => {
        const res = await PipelineTools.generateLocationAsset({
          userId,
          seriesId,
          episodeId,
          locationName: args.location_name || args.locationName,
          physicalCharacteristics: args.physical_characteristics || args.physicalCharacteristics,
          timeOfDay: args.time_of_day || args.timeOfDay,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'location', data: res.data });
        }
        return res;
      },
    }),

    // ─── 4. Prop Generation ─────────────────────────────────────────────────
    new FunctionTool({
      name: 'generate_prop_asset',
      description: 'Generate or re-render key prop object sheet. If asset exists, confirm first unless forced.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prop_name: { type: Type.STRING, description: 'The name of the prop' },
          physical_characteristics: { type: Type.STRING, description: 'Visual description of the prop/object' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if image already exists' },
        },
        required: ['prop_name'],
      },
      execute: async (args: any) => {
        const res = await PipelineTools.generatePropAsset({
          userId,
          seriesId,
          episodeId,
          propName: args.prop_name || args.propName,
          physicalCharacteristics: args.physical_characteristics || args.physicalCharacteristics,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'prop', data: res.data });
        }
        return res;
      },
    }),

    // ─── 5. Scene Storyboard Keyframe ───────────────────────────────────────
    new FunctionTool({
      name: 'generate_scene_storyboard',
      description: 'Generate storyboard keyframe illustration for a scene shot.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          scene_index: { type: Type.NUMBER, description: 'The 1-based index of the scene' },
          custom_prompt: { type: Type.STRING, description: 'Optional custom visual prompt override' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if storyboard exists' },
        },
        required: ['scene_index'],
      },
      execute: async (args: any) => {
        const sIndex = Number(args.scene_index ?? args.sceneIndex);
        const res = await PipelineTools.generateSceneStoryboard({
          userId,
          seriesId,
          episodeId,
          sceneIndex: sIndex,
          customPrompt: args.custom_prompt || args.customPrompt,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'scene_storyboard', data: res.data });
        }
        return res;
      },
    }),

    // ─── 6. Scene AI Video Generation ───────────────────────────────────────
    new FunctionTool({
      name: 'generate_scene_video',
      description: 'Generate Image-to-Video clip for a scene using Veo/AI video generation.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          scene_index: { type: Type.NUMBER, description: 'The 1-based index of the scene' },
          custom_prompt: { type: Type.STRING, description: 'Optional motion prompt override' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if video exists' },
        },
        required: ['scene_index'],
      },
      execute: async (args: any) => {
        const sIndex = Number(args.scene_index ?? args.sceneIndex);
        const res = await PipelineTools.generateSceneVideo({
          userId,
          seriesId,
          episodeId,
          sceneIndex: sIndex,
          customPrompt: args.custom_prompt || args.customPrompt || args.motionPrompt,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'scene_video', data: res.data });
        }
        return res;
      },
    }),

    // ─── 7. Scene Voiceover Generation ──────────────────────────────────────
    new FunctionTool({
      name: 'generate_scene_voiceover',
      description: 'Synthesize character voiceover audio and dialogue for a scene.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          scene_index: { type: Type.NUMBER, description: 'The 1-based index of the scene' },
          voice_id: { type: Type.STRING, description: 'Voice name (e.g. Puck, Fenrir, Kore)' },
          custom_text: { type: Type.STRING, description: 'Dialogue text override' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generation even if voiceover exists' },
        },
        required: ['scene_index'],
      },
      execute: async (args: any) => {
        const sIndex = Number(args.scene_index ?? args.sceneIndex);
        const res = await PipelineTools.generateSceneVoiceover({
          userId,
          seriesId,
          episodeId,
          sceneIndex: sIndex,
          voiceId: args.voice_id || args.voiceId || args.voicePreset,
          customText: args.custom_text || args.customText,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'scene_voiceover', data: res.data });
        }
        return res;
      },
    }),

    // ─── 8. Batch Pipeline Step Runner ──────────────────────────────────────
    new FunctionTool({
      name: 'run_pipeline_step',
      description: 'Execute a batch pipeline step across all items in parallel (e.g. b1, b2, b3, b4, b5, b6, b7, b8).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          step_id: { type: Type.STRING, description: 'Pipeline step identifier: b1, b2, b3, b4, b5, b6, b7, or b8' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generate even if assets already exist' },
        },
        required: ['step_id'],
      },
      execute: async (args: any) => {
        const stepId = args.step_id || args.stepId || args.stepName || 'b1';
        const res = await PipelineTools.runPipelineStep({
          userId,
          seriesId,
          episodeId,
          stepId,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
          onProgress: (p) => {
            onProgress?.(p);
          },
          onItemUpdated,
          onToolCall,
        });
        onItemUpdated?.({ type: 'pipeline_step', step: stepId, data: res.data });
        return res;
      },
    }),

    // ─── 9. Final Episode Video Render (CompositorWorker) ───────────────────
    new FunctionTool({
      name: 'render_episode_video',
      description: 'Render the complete final 9:16 episode video with CompositorWorker. Supports custom dubbing and subtitle languages, auto-generating missing TTS or word-by-word captions, or rendering with NO subtitles if requested.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          language_code: { type: Type.STRING, description: 'Primary language code (e.g. vi-VN, en-US, ja-JP)' },
          dubbing_languages: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target dubbing languages (e.g. ["vi-VN", "en-US"]). Auto-generates TTS if missing.' },
          caption_languages: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Target subtitle caption languages (e.g. ["vi-VN"]). Pass empty array [] if user requests NO subtitles.' },
          no_captions: { type: Type.BOOLEAN, description: 'Set to true if user explicitly requested video WITHOUT any subtitles / captions.' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-render even if video exists' },
        },
      },
      execute: async (args: any) => {
        const res = await PipelineTools.renderEpisodeVideo({
          userId,
          seriesId,
          episodeId,
          languageCode: args.language_code || args.languageCode,
          dubbingLanguages: args.dubbing_languages || args.dubbingLanguages,
          captionLanguages: args.caption_languages || args.captionLanguages,
          noCaptions: args.no_captions || args.noCaptions,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'episode_rendered', data: res.data });
        }
        return res;
      },
    }),

    // ─── 10. Run Full Pipeline ──────────────────────────────────────────────
    new FunctionTool({
      name: 'run_full_pipeline',
      description: 'Execute the entire end-to-end automated production pipeline for the episode.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          force_regenerate: { type: Type.BOOLEAN, description: 'Force re-generate even if assets already exist' },
        },
      },
      execute: async (args: any) => {
        const res = await PipelineTools.runFullPipeline({
          userId,
          seriesId,
          episodeId,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
          onProgress: (p) => {
            onProgress?.(p);
          },
        });
        onItemUpdated?.({ type: 'pipeline_completed', data: res.data });
        return res;
      },
    }),

    new FunctionTool({
      name: 'approve_episode_video',
      description: 'Approve the rendered episode video for release, changing status to READY_TO_PUBLISH.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
      execute: async () => {
        const res = await PipelineTools.approveEpisodeVideo({ seriesId, episodeId });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'episode_approved', data: res.data });
        }
        return res;
      },
    }),
  ];
}

/**
 * 2. Timeline & Video Editing ADK Tools
 */
export function createTimelineEditorTools(params: ToolContextParams): FunctionTool[] {
  const { onItemUpdated } = params;

  return [
    new FunctionTool({
      name: 'add_text',
      description: 'Add a text or title element to the video timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: 'The text content to display' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds (default 0)' },
          to: { type: Type.NUMBER, description: 'End time in seconds (default 0)' },
        },
        required: ['text'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_text', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added text "${args.text}" to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_image',
      description: 'Add an image clip to the timeline based on a prompt or URL',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Detailed description of the image' },
          url: { type: Type.STRING, description: 'URL of the image if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds (default 0)' },
          to: { type: Type.NUMBER, description: 'End time in seconds (default 0)' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_image', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added image to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_video',
      description: 'Add a video clip to the timeline based on a prompt or URL',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Detailed description of the video' },
          url: { type: Type.STRING, description: 'URL of the video if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_video', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added video clip to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_audio',
      description: 'Add audio or music to the video timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING, description: 'Description of the audio or music' },
          url: { type: Type.STRING, description: 'URL of the audio if available' },
          targetId: { type: Type.STRING, description: 'The unique ID for this new asset' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['prompt'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_audio', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added audio to timeline`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'update_clip',
      description: 'Update properties of an existing timeline clip',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to update' },
          left: { type: Type.NUMBER },
          top: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
          start: { type: Type.NUMBER, description: 'Start time in seconds' },
          fontSize: { type: Type.NUMBER, description: 'Font size for text clips' },
          fontFamily: { type: Type.STRING, description: 'Font family for text clips' },
          fill: { type: Type.STRING, description: 'Text color in hex format' },
          opacity: { type: Type.NUMBER, description: 'Opacity from 0 to 1' },
          volume: { type: Type.NUMBER, description: 'Volume from 0 to 1' },
          playbackRate: { type: Type.NUMBER, description: 'Playback rate' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'update_clip', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Updated clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'remove_clip',
      description: 'Remove a clip from the timeline',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to remove' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'remove_clip', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Removed clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'split_clip',
      description: 'Split a clip at a specific time',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to split' },
          time: { type: Type.NUMBER, description: 'The time in seconds to split at' },
        },
        required: ['targetId'],
      },
      execute: async (args: any) => {
        const payload = { action: 'split_clip', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Split clip ${args.targetId} at ${args.time}s`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_transition',
      description: 'Add a transition between two clips',
      parameters: {
        type: Type.OBJECT,
        properties: {
          fromId: { type: Type.STRING, description: 'Source clip ID' },
          toId: { type: Type.STRING, description: 'Target clip ID' },
          type: { type: Type.STRING, description: 'Transition type: fade, wipe, dissolve, glitch' },
          duration: { type: Type.NUMBER, description: 'Duration in seconds (default 0.5)' },
        },
        required: ['fromId', 'toId', 'type'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_transition', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added transition between ${args.fromId} and ${args.toId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'add_effect',
      description: 'Add a visual effect to a clip',
      parameters: {
        type: Type.OBJECT,
        properties: {
          effectName: { type: Type.STRING, description: 'Name of the effect (e.g., glitch, sepia)' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
          to: { type: Type.NUMBER, description: 'End time in seconds' },
        },
        required: ['effectName'],
      },
      execute: async (args: any) => {
        const payload = { action: 'add_effect', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Added effect "${args.effectName}"`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'duplicate_clip',
      description: 'Duplicate a specific clip or the selected ones',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to duplicate' },
        },
      },
      execute: async (args: any) => {
        const payload = { action: 'duplicate_clip', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Duplicated clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'trim_clip',
      description: 'Trim a clip to a specific range',
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetId: { type: Type.STRING, description: 'The ID of the clip to trim' },
          trimFrom: { type: Type.NUMBER, description: "The new start time in seconds relative to the clip's source" },
        },
        required: ['trimFrom'],
      },
      execute: async (args: any) => {
        const payload = { action: 'trim_clip', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Trimmed clip ${args.targetId}`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'search_and_add_media',
      description: 'Search for and add stock media (video/image) from Pexels',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search terms for the media' },
          type: { type: Type.STRING, description: "Type of media ('video', 'image')" },
          targetId: { type: Type.STRING, description: 'Unique ID for the new clip' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
        },
        required: ['query'],
      },
      execute: async (args: any) => {
        const payload = { action: 'search_and_add_media', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Searched and added media for "${args.query}"`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'generate_voiceover',
      description: 'Generate a voiceover using TTS',
      parameters: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: 'Text to convert to speech' },
          voiceId: { type: Type.STRING, description: 'Optional voice ID to use' },
          targetId: { type: Type.STRING, description: 'Unique ID for the new clip' },
          from: { type: Type.NUMBER, description: 'Start time in seconds' },
        },
        required: ['text'],
      },
      execute: async (args: any) => {
        const payload = { action: 'generate_voiceover', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Generated voiceover clip`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'seek_to_time',
      description: 'Move the playhead to a specific time',
      parameters: {
        type: Type.OBJECT,
        properties: {
          time: { type: Type.NUMBER, description: 'Time in seconds to seek to' },
        },
        required: ['time'],
      },
      execute: async (args: any) => {
        const payload = { action: 'seek_to_time', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Seeked to ${args.time}s`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'generate_captions',
      description: 'Generate captions for the video or specific clips',
      parameters: {
        type: Type.OBJECT,
        properties: {
          clipIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specific clips to transcribe',
          },
        },
      },
      execute: async (args: any) => {
        const payload = { action: 'generate_captions', ...args };
        onItemUpdated?.({ type: 'timeline_action', data: payload });
        return { success: true, message: `Generated captions`, data: payload };
      },
    }),

    new FunctionTool({
      name: 'fallback',
      description: 'Use this tool when you cannot perform the requested action with the available tools.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          friendlyMessage: {
            type: Type.STRING,
            description: "A friendly explanation of why the action cannot be performed, in the user's language.",
          },
        },
        required: ['friendlyMessage'],
      },
      execute: async (args: any) => {
        return { success: false, message: args.friendlyMessage };
      },
    }),
  ];
}

/**
 * Creates the complete aggregate array of ADK FunctionTools
 */
export function createChatbotTools(params: ToolContextParams): FunctionTool[] {
  return [
    ...createMasterPlanTools(params),
    ...createProductionPipelineTools(params),
    ...createTimelineEditorTools(params),
  ];
}

