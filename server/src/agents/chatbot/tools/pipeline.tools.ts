import { FunctionTool } from '@google/adk';
import { Type } from '@google/genai';
import { getDatabaseProvider, SceneEntity } from '@/database/index';
import { Logger } from '@/utils/logger.js';
import { CharacterToolExecutors } from './character.tools';
import { AssetToolExecutors } from './asset.tools';
import { VideoToolExecutors } from './video.tools';
import { AudioToolExecutors } from './audio.tools';
import { CaptionToolExecutors } from './caption.tools';
import { RenderToolExecutors } from './render.tools';
import { getActiveChatContext, type ToolContextParams, type ToolExecutionResult } from './context.js';

export class PipelineToolExecutors {
  /**
   * Get real-time status of the episode, its scenes, characters, locations, and props
   */
  static async getEpisodeStatus(params: { seriesId: string; episodeId: string }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      if (!episode) {
        return { success: false, message: `Episode ${params.episodeId} not found.` };
      }

      const characters = series?.characters || [];
      const locations = series?.locations || [];
      const props = series?.props || [];
      const scenes = (episode.scenes || []) as any[];

      const charStatus = characters.map((c: any) => ({
        name: c.name,
        has_image: !!(c.avatar || c.image_url),
        wardrobe_count: (c.wardrobe_variants || []).length,
        wardrobes_rendered: (c.wardrobe_variants || []).filter((v: any) => v.image_url).length,
      }));

      const locStatus = locations.map((l: any) => ({
        name: l.name,
        has_image: !!l.image_url,
      }));

      const propStatus = props.map((p: any) => ({
        name: p.name,
        has_image: !!p.image_url,
      }));

      const sceneStatus = scenes.map((s: any) => ({
        index: s.index,
        has_storyboard: !!s.storyboard_frame_url,
        has_video: !!s.video_url,
        has_audio: !!s.voiceover_url,
        dialogue: s.dialogue,
      }));

      return {
        success: true,
        message: `Episode #${episode.episode_number || 1} status: ${scenes.length} scenes (${scenes.filter((s) => s.video_url).length} videos rendered, ${scenes.filter((s) => s.voiceover_url).length} audios generated).`,
        data: {
          episode_id: episode.id,
          series_id: params.seriesId,
          characters: charStatus,
          locations: locStatus,
          props: propStatus,
          scenes: sceneStatus,
          status: episode.status,
          video_url: episode.video_url,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to fetch episode status: ${err.message}`, error: err.message };
    }
  }

  /**
   * Execute single named pipeline step:
   * - b1: Cast Render (Characters with avatar and wardrobe)
   * - b2: Assets & Storyboard (Locations, Props, Scene Storyboards)
   * - b3: Storyboard to Video (AI Video Generation)
   * - b4: Voiceover & Dubbing (TTS generation)
   * - b5: Subtitles / Captions (Word-by-word alignment)
   * - b6: Final Compositor Video Render / Export
   * - b7, b8: Save / Publish
   */
  static async runPipelineStep(params: {
    userId: string;
    seriesId: string;
    episodeId: string;
    step: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    const { userId, seriesId, episodeId, step, forceRegenerate } = params;
    if (!userId) {
      return { success: false, message: 'User ID is required' };
    }
    if (!seriesId) {
      return { success: false, message: 'Series ID is required' };
    }
    if (!episodeId) {
      return { success: false, message: 'Episode ID is required' };
    }
    
    const normalizedStep = (step || 'b1').toLowerCase().trim();

    switch (normalizedStep) {
      case 'b1': {
        Logger.info(`[PipelineTools] Running Step B1 (Cast Avatars & Wardrobes) for Series ${seriesId}...`);
        const charRes = await CharacterToolExecutors.generateCharacterAsset({ userId, seriesId, forceRegenerate });
        if (!charRes.success) {
          return { success: false, message: `Step B1 failed at Character Portraits: ${charRes.message}` };
        }

        const wardrobeRes = await CharacterToolExecutors.generateWardrobeVariants({ userId, seriesId, episodeId, forceRegenerate });
        if (!wardrobeRes.success) {
          return { success: false, message: `Step B1 failed at Wardrobe Lookbooks: ${wardrobeRes.message}` };
        }

        return {
          success: true,
          message: `Pipeline Step B1 (Cast Render) completed successfully.\n- Cast Avatars: ${charRes.message}\n- Wardrobes: ${wardrobeRes.message}`,
          data: { characters: charRes.data, wardrobes: wardrobeRes.data },
        };
      }

      case 'b2': {
        Logger.info(`[PipelineTools] Running Step B2 (Assets & Storyboards) for Episode ${episodeId}...`);
        const locRes = await AssetToolExecutors.generateLocationAsset({ userId, seriesId, episodeId, forceRegenerate });
        const propRes = await AssetToolExecutors.generatePropAsset({ userId, seriesId, episodeId, forceRegenerate });
        const sbRes = await AssetToolExecutors.generatePipelineEpisodeStoryboard({ userId, seriesId, episodeId, forceRegenerate });
        if (!sbRes.success) {
          return {
            success: false,
            message: `Pipeline Step B2 failed: ${sbRes.message}`,
          };
        }
        return {
          success: true,
          message: `Pipeline Step B2 (Assets & Storyboards) completed: ${sbRes.message}`,
          data: { storyboards: sbRes.data, locations: locRes.data, props: propRes.data },
        };
      }

      case 'b3': {
        Logger.info(`[PipelineTools] Running Step B3 (Storyboard to Video) for Episode ${episodeId}...`);
        const vidRes = await VideoToolExecutors.generateSceneVideo({ userId, seriesId, episodeId, forceRegenerate });
        if (!vidRes.success) {
          return {
            success: false,
            message: `Pipeline Step B3 failed at Video Generation: ${vidRes.message}`,
          };
        }
        return {
          success: true,
          message: `Pipeline Step B3 (Video Generation) completed: ${vidRes.message}`,
          data: vidRes.data,
        };
      }

      case 'b4': {
        Logger.info(`[PipelineTools] Running Step B4 (Voiceover & Dubbing) for Episode ${episodeId}...`);
        const audioRes = await AudioToolExecutors.generateSceneVoiceover({ userId, seriesId, episodeId, forceRegenerate });
        if (!audioRes.success) {
          return {
            success: false,
            message: `Pipeline Step B4 failed at Voiceover Generation: ${audioRes.message}`,
          };
        }
        return {
          success: true,
          message: `Pipeline Step B4 (Voiceover & Dubbing) completed: ${audioRes.message}`,
          data: audioRes.data,
        };
      }

      case 'b5': {
        Logger.info(`[PipelineTools] Running Step B5 (Subtitles & Captions) for Episode ${episodeId}...`);
        const captionRes = await CaptionToolExecutors.generateSceneCaption({ userId, seriesId, episodeId, forceRegenerate });
        if (!captionRes.success) {
          return {
            success: false,
            message: `Pipeline Step B5 failed at Captions Generation: ${captionRes.message}`,
          };
        }
        return {
          success: true,
          message: `Pipeline Step B5 (Captions) completed: ${captionRes.message}`,
          data: captionRes.data,
        };
      }

      case 'b6': {
        Logger.info(`[PipelineTools] Running Step B6 (Final Compositor Render) for Episode ${episodeId}...`);
        const renderRes = await RenderToolExecutors.renderEpisodeVideo({ userId, seriesId, episodeId, forceRegenerate });
        if (!renderRes.success) {
          return {
            success: false,
            message: `Pipeline Step B6 failed: ${renderRes.message}`,
          };
        }
        return {
          success: true,
          message: `Pipeline Step B6 (Export Video) completed: ${renderRes.message}`,
          data: renderRes.data,
        };
      }

      case 'b7':
      case 'b8': {
        return {
          success: true,
          message: `Pipeline Step ${normalizedStep.toUpperCase()} completed successfully.`,
          data: { step: normalizedStep },
        };
      }

      default:
        return { success: false, message: `Unknown pipeline step: ${step}` };
    }
  }

  /**
   * Run entire sequential pipeline via Background Job Engine (b1 -> b2 -> b3 -> b4 -> b5 -> b6)
   */
  static async runFullPipeline(params: {
    userId: string;
    seriesId: string;
    episodeId: string;
    forceRegenerate?: boolean;
    sessionId?: string;
  }): Promise<ToolExecutionResult> {
    if (!params.userId) return { success: false, message: 'User ID is required' };
    if (!params.seriesId) return { success: false, message: 'Series ID is required' };
    if (!params.episodeId) return { success: false, message: 'Episode ID is required' };

    const { PipelineJobService } = await import('@/services/PipelineJobService.js');
    const { job, is_new } = await PipelineJobService.startOrGetPipelineJob({
      user_id: params.userId,
      series_id: params.seriesId,
      episode_id: params.episodeId,
      type: 'full_pipeline',
      force_regenerate: params.forceRegenerate,
      session_id: params.sessionId,
    });

    return {
      success: true,
      message: is_new
        ? `🚀 Background Pipeline Job **${job.id}** has been started!\n- Progress: ${job.progress}%\n- Current step: ${job.current_step}\n- You can check real-time progress via the top-bar Job Popover or ask me for status updates anytime.`
        : `⚡ Pipeline Job **${job.id}** is already running (${job.progress}% - ${job.current_step}).`,
      data: {
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        current_step: job.current_step,
        is_new: is_new,
      },
    };
  }
}

export function createProductionPipelineTools(context?: ToolContextParams): FunctionTool[] {
  return [
    new FunctionTool({
      name: 'get_episode_status',
      description: 'Get the current real-time production status of all assets, scenes, characters, locations, and props.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
      execute: async () => {
        const ctx = getActiveChatContext();
        const seriesId = context?.seriesId || ctx?.seriesId || '';
        const episodeId = context?.episodeId || ctx?.episodeId || '';
        if (!seriesId || !episodeId) {
          return { success: false, message: 'Series ID and Episode ID are required' };
        }
        return await PipelineToolExecutors.getEpisodeStatus({ seriesId, episodeId });
      },
    }),

    new FunctionTool({
      name: 'get_pipeline_job_status',
      description: 'Check real-time progress, current step, and outputs of background pipeline jobs.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          job_id: { type: Type.STRING, description: 'Optional specific job ID to check' },
        },
      },
      execute: async (args: any) => {
        const ctx = getActiveChatContext();
        const seriesId = context?.seriesId || ctx?.seriesId || '';
        const episodeId = context?.episodeId || ctx?.episodeId || '';
        const db = await getDatabaseProvider();

        if (args.job_id) {
          const job = await db.getPipelineJobById(args.job_id);
          if (!job) return { success: false, message: `Job ${args.job_id} not found.` };
          return {
            success: true,
            message: `Job ${job.id} (${job.title}): Status **${job.status.toUpperCase()}** (${job.progress}% - ${job.current_step}).`,
            data: job,
          };
        }

        const activeJob = await db.findActivePipelineJob(seriesId, episodeId);
        if (!activeJob) {
          return {
            success: true,
            message: `No active background job currently running for Episode ${episodeId}.`,
            data: null,
          };
        }

        return {
          success: true,
          message: `Active Job **${activeJob.id}**: Status **${activeJob.status.toUpperCase()}** (${activeJob.progress}% - ${activeJob.current_step}).`,
          data: activeJob,
        };
      },
    }),

    new FunctionTool({
      name: 'run_pipeline_step',
      description: 'Execute a specific pipeline step (b1: Cast Render, b2: Assets & Storyboard, b3: Video Clips, b4: Voiceover, b5: Subtitles, b6: Export Video).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING, description: 'Pipeline step identifier: b1, b2, b3, b4, b5, b6' },
          step_id: { type: Type.STRING, description: 'Alternative alias for step parameter' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force regeneration' },
        },
      },
      execute: async (args: any) => {
        const ctx = getActiveChatContext();
        const userId = args.userId || args.user_id || context?.userId || ctx?.userId;
        const seriesId = args.seriesId || args.series_id || context?.seriesId || ctx?.seriesId;
        const episodeId = args.episodeId || args.episode_id || context?.episodeId || ctx?.episodeId || '1';
        const onItemUpdated = context?.onItemUpdated || ctx?.onItemUpdated;
        const stepTarget = args.step || args.step_id || args.stepId || 'b1';

        if (!userId) {
          return { success: false, message: 'User ID is required' };
        }
        if (!seriesId) {
          return { success: false, message: 'Series ID is required' };
        }
        if (!episodeId) {
          return { success: false, message: 'Episode ID is required' };
        }
        const res = await PipelineToolExecutors.runPipelineStep({
          userId,
          seriesId,
          episodeId,
          step: stepTarget,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: `pipeline_${stepTarget}_completed`, step: stepTarget, data: res.data });
        }
        return res;
      },
    }),

    new FunctionTool({
      name: 'run_full_pipeline',
      description: 'Run the entire end-to-end automated production pipeline for the episode (b1 to b6) as a managed background job.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          force_regenerate: { type: Type.BOOLEAN, description: 'Force regeneration' },
        },
      },
      execute: async (args: any) => {
        const ctx = getActiveChatContext();
        const userId = args.userId || args.user_id || context?.userId || ctx?.userId;
        const seriesId = args.seriesId || args.series_id || context?.seriesId || ctx?.seriesId;
        const episodeId = args.episodeId || args.episode_id || context?.episodeId || ctx?.episodeId || '1';
        const onItemUpdated = context?.onItemUpdated || ctx?.onItemUpdated;

        if (!userId) {
          return { success: false, message: 'User ID is required' };
        }
        if (!seriesId) {
          return { success: false, message: 'Series ID is required' };
        }
        if (!episodeId) {
          return { success: false, message: 'Episode ID is required' };
        }
        const res = await PipelineToolExecutors.runFullPipeline({
          userId,
          seriesId,
          episodeId,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'full_pipeline_started', data: res.data });
        }
        return res;
      },
    }),
  ];
}
