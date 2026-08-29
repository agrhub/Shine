import { FunctionTool } from '@google/adk';
import { Type } from '@google/genai';
import { getDatabaseProvider } from '@/database/index.js';
import { Logger } from '@/utils/logger.js';
import { videoService } from '@/services/VideoService.js';
import { EntityNormalizer } from '@/utils/EntityNormalizer.js';
import { executeWithRetry, getActiveChatContext, type ToolContextParams, type ToolExecutionResult } from './context.js';

export class VideoToolExecutors {
  /**
   * Generate video clip using motion models (Image-to-Video) for a scene shot
   */
  static async generateSceneVideo(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    sceneIndex?: number;
    motionStrength?: number;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      if (!series) return { success: false, message: `Series ${params.seriesId} not found` };

      const episode = await db.getEpisodeById(params.episodeId);
      if (!episode) return { success: false, message: `Episode ${params.episodeId} not found` };

      const scenes = (episode.scenes || []) as any[];
      if (scenes.length === 0) {
        return { success: false, message: `Episode "${episode.title}" has no scenes to generate video clips for.` };
      }

      let targets = scenes;
      if (params.sceneIndex !== undefined) {
        targets = scenes.filter((s: any) => Number(s.index || s.scene_number) === Number(params.sceneIndex));
        if (targets.length === 0) {
          return { success: false, message: `Scene #${params.sceneIndex} not found in Episode "${episode.title}".` };
        }
      }

      // Validate visual prerequisites
      const unready = targets.filter((s: any) => !s.storyboard_frame_url && !s.image_url);
      if (unready.length > 0) {
        const missingList = unready.map((s: any) => `#${s.index || s.scene_number || '?'}`).join(', ');
        return {
          success: false,
          message: `Cannot generate video: Prerequisite storyboard image(s) for scene(s) ${missingList} are not ready. Please generate storyboard frames first (b2).`,
        };
      }

      const results: any[] = [];
      const updatedScenes = [...scenes];

      for (const sc of targets) {
        const scIndex = Number(sc.index || sc.scene_number);
        if (!params.forceRegenerate && sc.video_url) {
          results.push({ sceneIndex: scIndex, status: 'already_exists', video_url: sc.video_url });
          continue;
        }

        const startFrame = sc.storyboard_frame_url || sc.image_url;

        const { result } = await executeWithRetry(`Generate Video Clip for Scene #${scIndex}`, async () => {
          return await videoService.generateSceneVideo({
            user_id: params.userId || 'system',
            series_id: params.seriesId,
            episode_id: params.episodeId,
            scene_id: sc.id || `scene_${scIndex}`,
            start_frame_url: startFrame,
            prompt: sc.visual_prompt || sc.action || `Cinematic motion for scene #${scIndex}`,
            duration: sc.duration || 5,
            aspect_ratio: '9:16',
          });
        });

        const videoUrl = (result as any)?.videoUrl || (result as any)?.url || (result as any)?.video_url;
        const idx = updatedScenes.findIndex((s) => Number(s.index || s.scene_number) === scIndex);
        if (idx >= 0) {
          updatedScenes[idx] = {
            ...updatedScenes[idx],
            video_url: videoUrl,
          };
        }

        results.push({ sceneIndex: scIndex, status: 'generated', video_url: videoUrl });
      }

      await db.updateEpisode(params.episodeId, { scenes: updatedScenes });

      const generatedCount = results.filter((r) => r.status === 'generated').length;
      return {
        success: true,
        message: `Successfully processed ${results.length} video clip(s) (${generatedCount} generated, ${results.length - generatedCount} existing) for Episode #${episode.episode_number || 1} "${episode.title}".`,
        data: { episode_id: params.episodeId, scenes: updatedScenes, details: results },
      };
    } catch (err: any) {
      Logger.error(`[VideoTools] Failed to generate scene video: ${err.message}`);
      return { success: false, message: `Failed to generate scene video: ${err.message}`, error: err.message };
    }
  }
}

export function createVideoTools(context?: ToolContextParams): FunctionTool[] {
  return [
    new FunctionTool({
      name: 'generate_scene_video',
      description: 'Generate AI video clips (Image-to-Video) for scenes using motion models.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          scene_index: { type: Type.NUMBER, description: 'Scene index number' },
          motion_strength: { type: Type.NUMBER, description: 'Motion strength (1-10)' },
          force_regenerate: { type: Type.BOOLEAN, description: 'Force regeneration' },
        },
      },
      execute: async (args: any) => {
        const ctx = getActiveChatContext();
        const userId = args.userId || args.user_id || context?.userId || ctx?.userId;
        const seriesId = args.seriesId || args.series_id || context?.seriesId || ctx?.seriesId;
        const episodeId = args.episodeId || args.episode_id || context?.episodeId || ctx?.episodeId || '1';
        const onItemUpdated = context?.onItemUpdated || ctx?.onItemUpdated;

        if (!userId) return { success: false, message: `No user selected. Please select a user first.` };
        if (!seriesId) return { success: false, message: `No series selected. Please select a series first.` };
        const res = await VideoToolExecutors.generateSceneVideo({
          userId,
          seriesId,
          episodeId,
          sceneIndex: args.scene_index || args.sceneIndex,
          motionStrength: args.motion_strength || args.motionStrength,
          forceRegenerate: args.force_regenerate || args.forceRegenerate,
        });
        if (res.success && res.data) {
          onItemUpdated?.({ type: 'videos_updated', data: res.data });
        }
        return res;
      },
    }),
  ];
}
