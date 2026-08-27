import { getDatabaseProvider } from '@/database/index.js';
import { Logger } from '@/utils/logger.js';
import { AssetService } from '@/services/AssetService.js';
import { videoService } from '@/services/VideoService.js';
import { ttsService } from '@/services/TtsService.js';
import { CaptionService } from '@/services/CaptionService.js';
import { TimelineService } from '@/services/TimelineService.js';
import { generateDialogueVoiceSynthesis } from '@/routes/voices.js';
import { generateCaptionsInternal } from '@/routes/captions.js';
import { compositorWorker, type RenderJobState } from '@/services/compositor/CompositorWorker.js';
import { nanoid } from 'nanoid';
import type {
  CharacterEntity,
  CharacterEpisodeEntity,
  LocationAsset,
  PropAsset,
  SceneEntity,
} from '@/types.js';

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  retriesAttempted?: number;
}

/**
 * Execute an operation with up to 3 automatic retries
 */
async function executeWithRetry<T>(
  actionName: string,
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<{ result: T; retries: number }> {
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    attempt++;
    try {
      Logger.info(`[PipelineTools] Executing ${actionName} (Attempt ${attempt}/${maxRetries})...`);
      const result = await fn();
      return { result, retries: attempt };
    } catch (err: any) {
      lastError = err;
      Logger.warn(`[PipelineTools] ${actionName} attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError;
}

export class PipelineTools {
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

      const script = episode.script ? (typeof episode.script === 'string' ? JSON.parse(episode.script) : episode.script) : {};
      const characters = episode.characters || script.characters || series?.characters || [];
      const locations = episode.locations || script.locations || series?.locations || [];
      const props = episode.props || script.props || series?.props || [];
      const scenes = (episode.scenes || script.scenes || []) as any[];

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
        message: `Episode #${episode.episode_number || 1} "${episode.title}" Status: ${scenes.length} scenes, ${characters.length} characters, ${locations.length} locations, ${props.length} props.`,
        data: {
          episode_id: episode.id,
          title: episode.title,
          characters: charStatus,
          locations: locStatus,
          props: propStatus,
          scenes: sceneStatus,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to get episode status: ${err.message}`, error: err.message };
    }
  }

  /**
   * Generate Character Portrait or Wardrobe Sheet with 3x retry
   * Only generates if image is missing (unless forceRegenerate is true)
   */
  static async generateCharacterAsset(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    characterName: string;
    variantId?: string;
    physicalCharacteristics?: string;
    clothingAndAccessories?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      const seriesCharacters: CharacterEntity[] = [...(series?.characters || [])];
      let seriesChar = seriesCharacters.find((c: any) => c.name?.toLowerCase().trim() === params.characterName.toLowerCase().trim() || c.id === params.characterName);
      if (!seriesChar) {
        seriesChar = {
          id: `char_${Date.now()}`,
          series_id: params.seriesId,
          name: params.characterName,
          role: 'supporting',
          age: 25,
          gender: 'neutral',
          nationality: series?.country || 'Global',
          voice_id: 'Fenrir',
          identity: '',
          traits: '',
          visual_traits: '',
          physical_characteristics: params.physicalCharacteristics || '',
          appearance: '',
          clothing_and_accessories: params.clothingAndAccessories || '',
          speech_style: '',
          lora_model: '',
          description: '',
        };
        seriesCharacters.push(seriesChar);
      }

      const episodeCharacters: CharacterEpisodeEntity[] = [...(episode?.characters || [])];
      let episodeChar = episodeCharacters.find((c: any) => c.name?.toLowerCase().trim() === params.characterName.toLowerCase().trim() || c.id === seriesChar?.id);
      if (!episodeChar) {
        episodeChar = {
          id: seriesChar.id,
          name: seriesChar.name,
          clothing_and_accessories: params.clothingAndAccessories || seriesChar.clothing_and_accessories || '',
          frame_description: '',
          wardrobe_variants: [],
        };
        episodeCharacters.push(episodeChar);
      }

      // Check if image already exists and skip if not forced
      const existingWardrobeVariants = episodeChar.wardrobe_variants || [];
      if (!params.forceRegenerate) {
        if (params.variantId && existingWardrobeVariants.length > 0) {
          const variant = existingWardrobeVariants.find((v: any) => v.variant_id === params.variantId);
          const varImg = variant?.image_url;
          if (varImg) {
            Logger.info(`[PipelineTools] Wardrobe variant "${params.characterName}" (${params.variantId}) already exists: ${varImg}. Skipping generation.`);
            return {
              success: true,
              message: `Wardrobe variant for ${params.characterName} (${params.variantId}) already exists. Skipped generation.`,
              data: { character_name: params.characterName, variant_id: params.variantId, image_url: varImg, already_exists: true },
              retriesAttempted: 0,
            };
          }
        } else if (seriesChar.avatar) {
          Logger.info(`[PipelineTools] Character "${params.characterName}" base avatar portrait already exists: ${seriesChar.avatar}. Skipping generation.`);
          return {
            success: true,
            message: `Character avatar portrait for ${params.characterName} already exists. Skipped generation.`,
            data: { character_name: params.characterName, image_url: seriesChar.avatar, already_exists: true },
            retriesAttempted: 0,
          };
        }
      }

      const visualStyle = series?.visual_style || 'realistic';
      let referenceAvatar = seriesChar.avatar || undefined;

      // PREREQUISITE: If wardrobe variant is requested but base face avatar is missing:
      // Generate base 9:16 portrait first to lock facial consistency anchor!
      if (params.variantId && !referenceAvatar) {
        Logger.info(`[PipelineTools] Prerequisite: Base character avatar missing for "${params.characterName}". Rendering base 9:16 portrait first to lock facial consistency...`);
        const baseRes = await AssetService.generateCharacterPortrait(
          params.characterName,
          params.physicalCharacteristics || seriesChar.physical_characteristics || '',
          seriesChar.clothing_and_accessories || '',
          visualStyle,
          seriesChar.age,
          seriesChar.gender,
          '9:16'
        );
        if (baseRes?.imageUrl) {
          seriesChar.avatar = baseRes.imageUrl;
          referenceAvatar = baseRes.imageUrl;
          Logger.info(`[PipelineTools] Locked character face avatar for "${params.characterName}": ${baseRes.imageUrl}`);
        } else {
          throw new Error(`Cannot generate wardrobe variant for "${params.characterName}" because base face avatar could not be created to lock facial consistency.`);
        }
      }

      const { result, retries } = await executeWithRetry(
        params.variantId ? `Wardrobe Variant for ${params.characterName} (${params.variantId})` : `Character Portrait for ${params.characterName}`,
        async () => {
          if (params.variantId) {
            // Wardrobe sheet 16:9 with reference face anchor
            const res = await AssetService.generateCharacterSheet(
              params.characterName,
              params.physicalCharacteristics || seriesChar.physical_characteristics || '',
              params.clothingAndAccessories || episodeChar.clothing_and_accessories || '',
              visualStyle,
              referenceAvatar
            );
            if (!res?.imageUrl) throw new Error('Image generation produced empty URL');
            return res;
          } else {
            // 9:16 Portrait for base avatar (fits portrait UI frame)
            const res = await AssetService.generateCharacterPortrait(
              params.characterName,
              params.physicalCharacteristics || seriesChar.physical_characteristics || '',
              params.clothingAndAccessories || seriesChar.clothing_and_accessories || '',
              visualStyle,
              seriesChar.age,
              seriesChar.gender,
              '9:16'
            );
            if (!res?.imageUrl) throw new Error('Image generation produced empty URL');
            return res;
          }
        },
        3
      );

      const currentEpisode = await db.getEpisodeById(params.episodeId);
      const updatedEpisodeCharacters: CharacterEpisodeEntity[] = [...(currentEpisode?.characters || episodeCharacters)];
      let epChar = updatedEpisodeCharacters.find((c: any) => c.name?.toLowerCase().trim() === params.characterName.toLowerCase().trim() || c.id === seriesChar?.id);
      if (!epChar) {
        epChar = {
          id: seriesChar.id,
          name: seriesChar.name,
          clothing_and_accessories: params.clothingAndAccessories || seriesChar.clothing_and_accessories || '',
          frame_description: '',
          wardrobe_variants: [],
        };
        updatedEpisodeCharacters.push(epChar);
      }

      if (params.variantId) {
        if (!epChar.wardrobe_variants) epChar.wardrobe_variants = [];
        let variant = epChar.wardrobe_variants.find((v: any) => v.variant_id === params.variantId);
        if (!variant) {
          variant = {
            variant_id: params.variantId,
            name: params.variantId,
            clothing_and_accessories: params.clothingAndAccessories || epChar.clothing_and_accessories || '',
            image_url: result.imageUrl,
          };
          epChar.wardrobe_variants.push(variant);
        } else {
          variant.image_url = result.imageUrl;
        }
      } else {
        seriesChar.avatar = result.imageUrl;
      }

      await db.updateEpisode(params.episodeId, { characters: updatedEpisodeCharacters });
      if (params.seriesId) {
        const currentSeries = await db.getSeriesById(params.seriesId);
        const seriesChars: CharacterEntity[] = [...(currentSeries?.characters || seriesCharacters)];
        const sChar = seriesChars.find((c: any) => c.name?.toLowerCase().trim() === params.characterName.toLowerCase().trim() || c.id === seriesChar?.id);
        if (sChar && !params.variantId) {
          sChar.avatar = result.imageUrl;
        }
        await db.updateSeries(params.seriesId, { characters: seriesChars });
      }

      return {
        success: true,
        message: `Successfully generated character sheet for ${params.characterName}${params.variantId ? ` (${params.variantId})` : ''} after ${retries} attempt(s).`,
        data: { character_name: params.characterName, variant_id: params.variantId, image_url: result.imageUrl },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate character sheet for ${params.characterName} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate Location Sheet with 3x retry
   * Only generates if image is missing (unless forceRegenerate is true)
   */
  static async generateLocationAsset(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    locationName: string;
    physicalCharacteristics?: string;
    timeOfDay?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      const locations: LocationAsset[] = [...(episode?.locations || series?.locations || [])];
      let loc = locations.find((l: any) => l.name?.toLowerCase().trim() === params.locationName.toLowerCase().trim());
      if (!loc) {
        loc = {
          id: `loc_${Date.now()}`,
          name: params.locationName,
          physical_characteristics: params.physicalCharacteristics || '',
          time_of_day: params.timeOfDay || 'DAY',
          status: 'draft',
        };
        locations.push(loc);
      }

      // Check if image already exists
      const existingLocImg = loc.image_url;
      if (!params.forceRegenerate && existingLocImg) {
        Logger.info(`[PipelineTools] Location "${params.locationName}" already has image: ${existingLocImg}. Skipping generation.`);
        return {
          success: true,
          message: `Location sheet for ${params.locationName} already exists. Skipped generation.`,
          data: { location_name: params.locationName, image_url: existingLocImg },
          retriesAttempted: 0,
        };
      }

      const visualStyle = series?.visual_style || 'realistic';

      const { result, retries } = await executeWithRetry(
        `Location Sheet for ${params.locationName}`,
        async () => {
          const res = await AssetService.generateLocationSheet(
            params.locationName,
            params.physicalCharacteristics || loc?.physical_characteristics || '',
            params.timeOfDay || loc?.time_of_day || 'DAY',
            visualStyle
          );
          if (!res?.imageUrl) throw new Error('Location generation produced empty URL');
          return res;
        },
        3
      );

      // Re-fetch current episode to prevent parallel race conditions
      const currentEpisode = await db.getEpisodeById(params.episodeId);
      const currentLocations: LocationAsset[] = [...(currentEpisode?.locations || locations)];
      let targetLoc = currentLocations.find((l: any) => l.name?.toLowerCase().trim() === params.locationName.toLowerCase().trim() || l.id === loc?.id);
      if (!targetLoc) {
        targetLoc = {
          id: loc?.id || `loc_${Date.now()}`,
          name: params.locationName,
          physical_characteristics: params.physicalCharacteristics || '',
          time_of_day: params.timeOfDay || 'DAY',
          status: 'ready',
          image_url: result.imageUrl,
        };
        currentLocations.push(targetLoc);
      } else {
        targetLoc.image_url = result.imageUrl;
        targetLoc.status = 'ready';
      }

      await db.updateEpisode(params.episodeId, { locations: currentLocations });

      if (params.seriesId) {
        const currentSeries = await db.getSeriesById(params.seriesId);
        const seriesLocations: LocationAsset[] = [...(currentSeries?.locations || series?.locations || [])];
        let sLoc = seriesLocations.find((l: any) => l.name?.toLowerCase().trim() === params.locationName.toLowerCase().trim() || l.id === targetLoc?.id);
        if (sLoc) {
          sLoc.image_url = result.imageUrl;
          sLoc.status = 'ready';
        } else {
          seriesLocations.push({ ...targetLoc });
        }
        await db.updateSeries(params.seriesId, { locations: seriesLocations });
      }

      return {
        success: true,
        message: `Successfully generated location sheet for ${params.locationName} after ${retries} attempt(s).`,
        data: { location_name: params.locationName, image_url: result.imageUrl },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate location sheet for ${params.locationName} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate Prop Sheet with 3x retry
   * Only generates if image is missing (unless forceRegenerate is true)
   */
  static async generatePropAsset(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    propName: string;
    physicalCharacteristics?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      const props: PropAsset[] = [...(episode?.props || series?.props || [])];
      let prop = props.find((p: any) => p.name?.toLowerCase().trim() === params.propName.toLowerCase().trim());
      if (!prop) {
        prop = {
          id: `prop_${Date.now()}`,
          name: params.propName,
          physical_characteristics: params.physicalCharacteristics || '',
          status: 'draft',
        };
        props.push(prop);
      }

      // Check if image already exists
      const existingPropImg = prop.image_url;
      if (!params.forceRegenerate && existingPropImg) {
        Logger.info(`[PipelineTools] Prop "${params.propName}" already has image: ${existingPropImg}. Skipping generation.`);
        return {
          success: true,
          message: `Prop sheet for ${params.propName} already exists. Skipped generation.`,
          data: { prop_name: params.propName, image_url: existingPropImg },
          retriesAttempted: 0,
        };
      }

      const visualStyle = series?.visual_style || 'realistic';

      const { result, retries } = await executeWithRetry(
        `Prop Sheet for ${params.propName}`,
        async () => {
          const res = await AssetService.generatePropProductShot(
            params.propName,
            params.physicalCharacteristics || prop?.physical_characteristics || '',
            visualStyle
          );
          if (!res?.imageUrl) throw new Error('Prop generation produced empty URL');
          return res;
        },
        3
      );

      // Re-fetch current episode to prevent parallel race conditions
      const currentEpisode = await db.getEpisodeById(params.episodeId);
      const currentProps: PropAsset[] = [...(currentEpisode?.props || props)];
      let targetProp = currentProps.find((p: any) => p.name?.toLowerCase().trim() === params.propName.toLowerCase().trim() || p.id === prop?.id);
      if (!targetProp) {
        targetProp = {
          id: prop?.id || `prop_${Date.now()}`,
          name: params.propName,
          physical_characteristics: params.physicalCharacteristics || '',
          status: 'ready',
          image_url: result.imageUrl,
        };
        currentProps.push(targetProp);
      } else {
        targetProp.image_url = result.imageUrl;
        targetProp.status = 'ready';
      }

      await db.updateEpisode(params.episodeId, { props: currentProps });

      if (params.seriesId) {
        const currentSeries = await db.getSeriesById(params.seriesId);
        const seriesProps: PropAsset[] = [...(currentSeries?.props || series?.props || [])];
        let sProp = seriesProps.find((p: any) => p.name?.toLowerCase().trim() === params.propName.toLowerCase().trim() || p.id === targetProp?.id);
        if (sProp) {
          sProp.image_url = result.imageUrl;
          sProp.status = 'ready';
        } else {
          seriesProps.push({ ...targetProp });
        }
        await db.updateSeries(params.seriesId, { props: seriesProps });
      }

      return {
        success: true,
        message: `Successfully generated prop sheet for ${params.propName} after ${retries} attempt(s).`,
        data: { prop_name: params.propName, image_url: result.imageUrl },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate prop sheet for ${params.propName} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate Storyboard Frame for a specific Scene
   * Only generates if storyboard is missing (unless forceRegenerate is true)
   */
  static async generateSceneStoryboard(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    sceneIndex: number;
    customPrompt?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const episode = await db.getEpisodeById(params.episodeId);
      const series = await db.getSeriesById(params.seriesId);

      if (!episode) return { success: false, message: `Episode not found` };

      const scenes = [...(episode.scenes || [])] as SceneEntity[];
      const scene = scenes.find((s: SceneEntity) => s.index === params.sceneIndex);
      if (!scene) return { success: false, message: `Scene #${params.sceneIndex} not found in episode` };

      // Check if storyboard frame already exists
      if (!params.forceRegenerate && (scene.storyboard_frame_url)) {
        const existingUrl = scene.storyboard_frame_url;
        Logger.info(`[PipelineTools] Storyboard frame for Scene #${params.sceneIndex} already exists: ${existingUrl}. Skipping generation.`);
        return {
          success: true,
          message: `Storyboard frame for Scene #${params.sceneIndex} already exists. Skipped generation.`,
          data: { scene_index: params.sceneIndex, storyboard_frame_url: existingUrl },
          retriesAttempted: 0,
        };
      }

      const activeUserId = params.userId || series?.user_id || 'system';
      const prompt = params.customPrompt || scene.visual_prompt || scene.action || `${scene.location || ''}, ${scene.description || ''}`;

      const { result, retries } = await executeWithRetry(
        `Storyboard for Scene #${params.sceneIndex}`,
        async () => {
          const res = await videoService.generateSceneImage({
            userId: activeUserId,
            seriesId: params.seriesId,
            episodeId: params.episodeId,
            sceneId: scene.id,
            sceneIndex: params.sceneIndex,
            prompt,
            aspectRatio: series?.ratio || '9:16',
            style: series?.visual_style,
            sceneData: scene,
          });
          if (!res?.imageUrl) throw new Error('Storyboard frame generation returned empty URL');
          return res;
        },
        3
      );

      // Re-fetch current episode to prevent parallel race conditions
      const currentEpisode = await db.getEpisodeById(params.episodeId);
      const currentScenes = [...(currentEpisode?.scenes || scenes)] as SceneEntity[];
      const targetScene = currentScenes.find((s: SceneEntity) => s.index === params.sceneIndex);
      if (targetScene) {
        targetScene.storyboard_frame_url = result.imageUrl;
        targetScene.image_url = result.imageUrl;
        targetScene.status = 'image_ready';
      }
      await db.updateEpisode(params.episodeId, { scenes: currentScenes });

      return {
        success: true,
        message: `Successfully generated Storyboard frame for Scene #${params.sceneIndex} after ${retries} attempt(s).`,
        data: { scene_index: params.sceneIndex, storyboard_frame_url: result.imageUrl },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate Storyboard for Scene #${params.sceneIndex} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate Video Clip for a Scene
   * Only generates if video clip is missing (unless forceRegenerate is true)
   */
  static async generateSceneVideo(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    sceneIndex: number;
    customPrompt?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const episode = await db.getEpisodeById(params.episodeId);
      const series = await db.getSeriesById(params.seriesId);

      if (!episode) return { success: false, message: `Episode not found` };

      const scenes = [...(episode.scenes || [])] as SceneEntity[];
      const scene = scenes.find((s: SceneEntity) => s.index === params.sceneIndex);
      if (!scene) return { success: false, message: `Scene #${params.sceneIndex} not found` };

      // Check if video clip already exists
      if (!params.forceRegenerate && scene.video_url) {
        Logger.info(`[PipelineTools] Video clip for Scene #${params.sceneIndex} already exists: ${scene.video_url}. Skipping generation.`);
        return {
          success: true,
          message: `Video clip for Scene #${params.sceneIndex} already exists. Skipped generation.`,
          data: { scene_index: params.sceneIndex, video_url: scene.video_url },
          retriesAttempted: 0,
        };
      }

      // PREREQUISITE: Ensure storyboard frame image exists as source for video
      let sourceImageUrl = scene.storyboard_frame_url || scene.image_url;
      if (!sourceImageUrl) {
        Logger.info(`[PipelineTools] Prerequisite: Storyboard frame missing for Scene #${params.sceneIndex}. Generating storyboard keyframe first...`);
        const sbRes = await this.generateSceneStoryboard({
          userId: params.userId,
          seriesId: params.seriesId,
          episodeId: params.episodeId,
          sceneIndex: params.sceneIndex,
          customPrompt: params.customPrompt,
          forceRegenerate: false,
        });
        if (sbRes.success && sbRes.data?.storyboard_frame_url) {
          sourceImageUrl = sbRes.data.storyboard_frame_url;
        } else {
          throw new Error(`Cannot generate video for Scene #${params.sceneIndex} because prerequisite storyboard frame image could not be created.`);
        }
      }

      const activeUserId = params.userId || series?.user_id || 'system';
      const prompt = params.customPrompt || scene.camera_movement || scene.visual_prompt || `Cinematic motion, high quality render`;

      const { result, retries } = await executeWithRetry(
        `Video for Scene #${params.sceneIndex}`,
        async () => {
          const res = await videoService.generateSceneVideo({
            userId: activeUserId,
            seriesId: params.seriesId,
            episodeId: params.episodeId,
            sceneId: scene.id,
            prompt,
            startFrameUrl: sourceImageUrl,
            aspectRatio: series?.ratio || '9:16',
            sceneData: scene,
          });
          const outUrl = res?.url;
          if (!outUrl) throw new Error('Video generation produced empty URL');
          return { video_url: outUrl };
        },
        3
      );

      const currentEpisode = await db.getEpisodeById(params.episodeId);
      const currentScenes = [...(currentEpisode?.scenes || scenes)] as SceneEntity[];
      const targetScene = currentScenes.find((s: SceneEntity) => s.index === params.sceneIndex);
      if (targetScene) {
        targetScene.video_url = result.video_url;
        targetScene.status = 'video_ready';
      }
      await db.updateEpisode(params.episodeId, { scenes: currentScenes });

      return {
        success: true,
        message: `Successfully generated Video clip for Scene #${params.sceneIndex} after ${retries} attempt(s).`,
        data: { scene_index: params.sceneIndex, video_url: result.video_url },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate Video for Scene #${params.sceneIndex} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate TTS Voiceover for Scene Dialogue
   * Only generates if voiceover audio is missing (unless forceRegenerate is true)
   */
  static async generateSceneVoiceover(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    sceneIndex: number;
    voiceId?: string;
    customText?: string;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const episode = await db.getEpisodeById(params.episodeId);

      if (!episode) return { success: false, message: `Episode not found` };

      const scenes = [...(episode.scenes || [])] as SceneEntity[];
      const scene = scenes.find((s: SceneEntity) => s.index === params.sceneIndex);
      if (!scene) return { success: false, message: `Scene #${params.sceneIndex} not found` };

      // Check if voiceover audio already exists
      if (!params.forceRegenerate && scene.voiceover_url) {
        const existingAudio = scene.voiceover_url;
        Logger.info(`[PipelineTools] Voiceover for Scene #${params.sceneIndex} already exists: ${existingAudio}. Skipping generation.`);
        return {
          success: true,
          message: `Voiceover for Scene #${params.sceneIndex} already exists. Skipped generation.`,
          data: { scene_index: params.sceneIndex, voiceover_url: existingAudio },
          retriesAttempted: 0,
        };
      }

      const dialogue = params.customText || scene.dialogue;
      if (!dialogue) return { success: false, message: `Scene #${params.sceneIndex} has no dialogue to voiceover` };

      const dialogueItem = Array.isArray(scene.dialogue) && scene.dialogue.length > 0 ? scene.dialogue[0] : (typeof scene.dialogue === 'object' ? scene.dialogue : null);
      const toneEmotion = (dialogueItem as any)?.speech_tone || (dialogueItem as any)?.tone || (dialogueItem as any)?.emotion || scene.bgm_mood || undefined;

      const { result, retries } = await executeWithRetry(
        `Voiceover for Scene #${params.sceneIndex}`,
        async () => {
          const res = await generateDialogueVoiceSynthesis({
            episode_id: params.episodeId,
            scene_id: scene.id,
            dialogue: Array.isArray(scene.dialogue) && scene.dialogue.length > 0 ? scene.dialogue : undefined,
            text: typeof params.customText === 'string' ? params.customText : (typeof scene.dialogue === 'string' ? scene.dialogue : undefined),
            voice_id: params.voiceId,
            emotion: toneEmotion,
          });
          if (!res?.audio_url) throw new Error('Voiceover audio generation returned empty URL');
          return res;
        },
        3
      );

      scene.voiceover_url = result.audio_url;
      await db.updateEpisode(params.episodeId, { scenes });
      const duration_seconds = result.duration_ms / 1000;
      return {
        success: true,
        message: `Successfully generated voiceover for Scene #${params.sceneIndex} (${duration_seconds}s) after ${retries} attempt(s).`,
        data: { scene_index: params.sceneIndex, voiceover_url: result.audio_url, duration_seconds: duration_seconds, cues: result.cues },
        retriesAttempted: retries,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate voiceover for Scene #${params.sceneIndex} after 3 retries: ${err.message}`,
        error: err.message,
        retriesAttempted: 3,
      };
    }
  }

  /**
   * Generate Wardrobe Costume Variants specifically for main characters
   * Does NOT generate locations, props, or storyboards.
   */
  static async generateWardrobeVariants(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    characterName?: string;
    forceRegenerate?: boolean;
    onProgress?: (progress: any) => void;
    onItemUpdated?: (event: any) => void;
    onToolCall?: (toolCall: any) => void;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      if (!episode && !series) return { success: false, message: `Series or Episode not found` };

      const characters = [...(episode?.characters || series?.characters || [])] as any[];
      let targetChars = characters;
      if (params.characterName) {
        const matched = characters.filter((c: any) => c.name?.toLowerCase().includes(params.characterName!.toLowerCase()));
        if (matched.length > 0) targetChars = matched;
      }

      // If characters have no wardrobe_variants defined, synthesize them from wardrobe array or clothing_and_accessories
      for (const char of targetChars) {
        const existingVariants = char.wardrobe_variants;
        if (!existingVariants || existingVariants.length === 0) {
          const rawWardrobe = char.wardrobe || [];
          if (Array.isArray(rawWardrobe) && rawWardrobe.length > 0) {
            char.wardrobe_variants = rawWardrobe.map((w: any, idx: number) => ({
              variant_id: `wv_${idx + 1}`,
              name: typeof w === 'string' ? w : (w?.name || `Wardrobe ${idx + 1}`),
              clothing_and_accessories: typeof w === 'string' ? w : (w?.clothing_and_accessories || ''),
            }));
          } else {
            const outfit = char.clothing_and_accessories || char.costume_style || 'Signature Outfit';
            char.wardrobe_variants = [{
              variant_id: 'wv_1',
              name: outfit.slice(0, 40),
              clothing_and_accessories: outfit,
            }];
          }
        }
      }

      const missingWardrobes: Array<{ char: any; wv: any }> = [];
      for (const char of targetChars) {
        const variants = char.wardrobe_variants || [];
        for (const wv of variants) {
          const hasImg = wv.image_url;
          if (params.forceRegenerate || !hasImg) {
            missingWardrobes.push({ char, wv });
          }
        }
      }

      if (missingWardrobes.length === 0 && !params.forceRegenerate) {
        return {
          success: true,
          message: `All wardrobe variants for ${targetChars.map((c: any) => c.name).join(', ')} already have rendered images.`,
          data: { count: 0, characters: targetChars },
        };
      }

      const results: any[] = [];
      const failedItems: any[] = [];
      let completed = 0;

      // PREREQUISITE: Ensure all target characters have their base face avatar generated to lock consistency
      const seriesCharacters = (series?.characters || []) as CharacterEntity[];
      const charsNeedingBaseAvatar = targetChars.filter((c: any) => {
        const sChar = seriesCharacters.find((sc: any) => sc.name?.toLowerCase().trim() === c.name?.toLowerCase().trim() || sc.id === c.id);
        return !sChar?.avatar && !c.avatar;
      });
      for (const char of charsNeedingBaseAvatar) {
        const baseToolId = `base_char_${char.name}_${nanoid(4)}`;
        params.onToolCall?.({
          id: baseToolId,
          name: 'generate_character_asset',
          args: { characterName: char.name },
          status: 'running',
        });
        params.onProgress?.({
          step: 'wardrobe_prerequisite',
          item: `${char.name} (Base Anchor Avatar)`,
          current: 0,
          total: charsNeedingBaseAvatar.length,
          message: `👤 Rendering base facial portrait for ${char.name} to lock identity consistency...`,
        });
        const baseRes = await this.generateCharacterAsset({
          userId: params.userId,
          seriesId: params.seriesId,
          episodeId: params.episodeId,
          characterName: char.name,
          physicalCharacteristics: char.physical_characteristics || '',
          clothingAndAccessories: char.clothing_and_accessories || '',
          forceRegenerate: false,
        });
        params.onToolCall?.({
          id: baseToolId,
          name: 'generate_character_asset',
          args: { characterName: char.name },
          status: baseRes.success ? 'success' : 'error',
          result: baseRes,
        });
        if (baseRes.success && baseRes.data?.image_url) {
          char.avatar = baseRes.data.image_url;
          results.push(baseRes);
          params.onItemUpdated?.({ type: 'character_updated', data: { character_name: char.name, avatar: baseRes.data.image_url } });
          params.onItemUpdated?.({ type: 'item_updated', itemType: 'character', data: baseRes.data });
        } else {
          failedItems.push({ name: `${char.name} (Base Avatar)`, error: baseRes.error || 'Failed to create base avatar' });
        }
      }

      for (const { char, wv } of missingWardrobes) {
        if (!char.avatar) {
          failedItems.push({ name: `${char.name} (${wv.name})`, error: `Base avatar missing for ${char.name}, cannot lock face consistency.` });
          continue;
        }
        const vId = wv.variant_id || wv.name;
        const toolCallId = `wv_${char.name}_${vId || nanoid(6)}`;
        const toolArgs = {
          characterName: char.name,
          variantId: vId,
          clothingAndAccessories: wv.clothing_and_accessories || char.clothing_and_accessories || '',
        };

        params.onToolCall?.({
          id: toolCallId,
          name: 'generate_character_asset',
          args: toolArgs,
          status: 'running',
        });

        params.onProgress?.({
          step: 'wardrobe',
          item: `${char.name} - ${wv.name || 'Wardrobe'}`,
          current: ++completed,
          total: missingWardrobes.length,
          message: `👗 Generating wardrobe variant: ${char.name} - ${wv.name || 'Wardrobe'} (${completed}/${missingWardrobes.length})...`,
        });

        const res = await this.generateCharacterAsset({
          userId: params.userId,
          seriesId: params.seriesId,
          episodeId: params.episodeId,
          characterName: char.name,
          variantId: wv.variant_id || wv.name,
          physicalCharacteristics: char.physical_characteristics || '',
          clothingAndAccessories: wv.clothing_and_accessories || char.clothing_and_accessories || '',
          forceRegenerate: params.forceRegenerate,
        });

        params.onToolCall?.({
          id: toolCallId,
          name: 'generate_character_asset',
          args: toolArgs,
          status: res.success ? 'success' : 'error',
          result: res,
        });

        if (res.success) {
          results.push(res);
          params.onItemUpdated?.({ type: 'character_updated', data: { character_name: char.name, variant_id: wv.variant_id, image_url: res.data?.image_url } });
        } else {
          failedItems.push({ name: `${char.name} (${wv.name})`, error: res.error || res.message });
        }
      }

      return {
        success: failedItems.length === 0,
        message: failedItems.length > 0
          ? `Generated ${results.length} wardrobe variant(s) with ${failedItems.length} failed: ${failedItems.map(f => f.name).join(', ')}.`
          : `Successfully generated all ${results.length} character wardrobe variant(s)!`,
        data: { results, failedItems, count: results.length },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to generate wardrobe variants: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Run a specific production pipeline step (b1-b7)
   */
  static async runPipelineStep(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    stepId: string;
    forceRegenerate?: boolean;
    onProgress?: (progress: any) => void;
    onItemUpdated?: (event: any) => void;
    onToolCall?: (toolCall: any) => void;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      const episode = await db.getEpisodeById(params.episodeId);

      if (!episode) return { success: false, message: `Episode not found` };

      const script = episode.script ? (typeof episode.script === 'string' ? JSON.parse(episode.script) : episode.script) : {};
      const characters = (episode.characters || script.characters || series?.characters || []) as any[];
      const locations = (episode.locations || script.locations || series?.locations || []) as any[];
      const props = (episode.props || script.props || series?.props || []) as any[];
      const scenes = (episode.scenes || script.scenes || []) as any[];

      const step = params.stepId.toLowerCase();
      const results: any[] = [];
      const failedItems: Array<{ step: string; name: string; error: string }> = [];

      // Helper for bounded concurrency
      const runConcurrent = async <T>(tasks: Array<() => Promise<T>>, concurrency = 3): Promise<T[]> => {
        const out: T[] = new Array(tasks.length);
        let curr = 0;
        const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
          while (curr < tasks.length) {
            const idx = curr++;
            out[idx] = await tasks[idx]();
          }
        });
        await Promise.all(workers);
        return out;
      };

      if (step === 'b1') {
        // Cast & Character Portraits
        const seriesCharacters = (series?.characters || []) as CharacterEntity[];
        const missingChars = characters.filter((c: any) => {
          if (params.forceRegenerate) return true;
          const sChar = seriesCharacters.find((sc: any) => sc.name?.toLowerCase().trim() === c.name?.toLowerCase().trim() || sc.id === c.id);
          return !sChar?.avatar && !c.avatar;
        });
        if (missingChars.length === 0 && !params.forceRegenerate) {
          return {
            success: true,
            message: `All ${characters.length} character portraits already exist. Skipped re-generation.`,
            data: { already_exists: true, count: characters.length },
          };
        }

        let completed = 0;
        const tasks = missingChars.map((char: any) => async () => {
          const toolCallId = `b1_char_${char.name}`;
          const toolArgs = { characterName: char.name };

          params.onToolCall?.({
            id: toolCallId,
            name: 'generate_character_asset',
            args: toolArgs,
            status: 'running',
          });

          params.onProgress?.({
            step: 'b1',
            item: char.name,
            current: ++completed,
            total: missingChars.length,
            message: `🎨 Generating character portrait: ${char.name} (${completed}/${missingChars.length})...`,
          });
          const res = await this.generateCharacterAsset({
            userId: params.userId,
            seriesId: params.seriesId,
            episodeId: params.episodeId,
            characterName: char.name,
            physicalCharacteristics: char.physical_characteristics || '',
            clothingAndAccessories: char.clothing_and_accessories || '',
            forceRegenerate: params.forceRegenerate,
          });

          params.onToolCall?.({
            id: toolCallId,
            name: 'generate_character_asset',
            args: toolArgs,
            status: res.success ? 'success' : 'error',
            result: res,
          });

          if (res.success) {
            params.onItemUpdated?.({ type: 'item_updated', itemType: 'character', data: res.data });
          } else {
            failedItems.push({ step: 'b1', name: char.name, error: res.error || res.message });
          }
          return res;
        });

        const stepResults = await runConcurrent(tasks, 2);
        results.push(...stepResults);

        const updatedEpB1 = await db.getEpisodeById(params.episodeId);
        params.onItemUpdated?.({ type: 'item_updated', itemType: 'episode', data: updatedEpB1 });

        return {
          success: failedItems.length === 0,
          message: failedItems.length > 0
            ? `Completed Step b1 with ${failedItems.length} failed item(s): ${failedItems.map(f => f.name).join(', ')}.`
            : `Completed Step b1 (Characters): ${results.length} processed.`,
          data: { results, failedItems, count: results.length },
        };
      } else if (step === 'b2') {
        // Step b2: Assets & Storyboard Frames
        // PREREQUISITE CHECK: Ensure character portraits exist before storyboards
        const seriesCharacters = (series?.characters || []) as CharacterEntity[];
        const missingBaseChars = characters.filter((c: any) => {
          const sChar = seriesCharacters.find((sc: any) => sc.name?.toLowerCase().trim() === c.name?.toLowerCase().trim() || sc.id === c.id);
          return !sChar?.avatar && !c.avatar;
        });
        if (missingBaseChars.length > 0) {
          Logger.info(`[PipelineTools] Generating prerequisite base characters before storyboards...`);
          for (const char of missingBaseChars) {
            await this.generateCharacterAsset({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              characterName: char.name,
              physicalCharacteristics: char.physical_characteristics || '',
              clothingAndAccessories: char.clothing_and_accessories || '',
              forceRegenerate: false,
            });
          }
        }

        const missingWardrobes: Array<{ char: any; wv: any }> = [];
        for (const char of characters) {
          const variants = char.wardrobe_variants || [];
          for (const wv of variants) {
            if (params.forceRegenerate || !wv.image_url) {
              missingWardrobes.push({ char, wv });
            }
          }
        }
        const missingLocations = locations.filter((l: any) => params.forceRegenerate || !l.image_url);
        const missingProps = props.filter((p: any) => params.forceRegenerate || !p.image_url);
        const missingStoryboards = scenes.filter((s: any) => params.forceRegenerate || !s.storyboard_frame_url);

        const totalMissing = missingWardrobes.length + missingLocations.length + missingProps.length + missingStoryboards.length;
        if (totalMissing === 0 && !params.forceRegenerate) {
          return {
            success: true,
            message: `All wardrobe variants, locations, props, and storyboards already exist.`,
            data: { already_exists: true },
          };
        }

        let completed = 0;
        const tasks: Array<() => Promise<any>> = [];

        // 1. Wardrobes
        for (const { char, wv } of missingWardrobes) {
          tasks.push(async () => {
            const toolCallId = `wv_${char.name}_${wv.variant_id || wv.name}`;
            const toolArgs = { characterName: char.name, variantId: wv.variant_id || wv.name };

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_character_asset',
              args: toolArgs,
              status: 'running',
            });

            params.onProgress?.({
              step: 'b2',
              item: `${char.name} (${wv.name || 'Wardrobe'})`,
              current: ++completed,
              total: totalMissing,
              message: `👗 Generating wardrobe variant: ${char.name} - ${wv.name || 'Wardrobe'} (${completed}/${totalMissing})...`,
            });
            const res = await this.generateCharacterAsset({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              characterName: char.name,
              variantId: wv.variant_id || wv.name,
              physicalCharacteristics: char.physical_characteristics || '',
              clothingAndAccessories: wv.clothing_and_accessories || char.clothing_and_accessories || '',
              forceRegenerate: params.forceRegenerate,
            });

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_character_asset',
              args: toolArgs,
              status: res.success ? 'success' : 'error',
              result: res,
            });

            if (res.success) {
              params.onItemUpdated?.({ type: 'item_updated', itemType: 'character', data: res.data });
            } else {
              failedItems.push({ step: 'b2', name: `${char.name} (${wv.name})`, error: res.error || res.message });
            }
            return res;
          });
        }

        // 2. Locations
        for (const loc of missingLocations) {
          tasks.push(async () => {
            const toolCallId = `loc_${loc.name}`;
            const toolArgs = { locationName: loc.name };

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_location_asset',
              args: toolArgs,
              status: 'running',
            });

            params.onProgress?.({
              step: 'b2',
              item: loc.name,
              current: ++completed,
              total: totalMissing,
              message: `🏛️ Generating location concept: ${loc.name} (${completed}/${totalMissing})...`,
            });
            const res = await this.generateLocationAsset({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              locationName: loc.name,
              physicalCharacteristics: loc.physical_characteristics || '',
              timeOfDay: loc.time_of_day || 'DAY',
              forceRegenerate: params.forceRegenerate,
            });

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_location_asset',
              args: toolArgs,
              status: res.success ? 'success' : 'error',
              result: res,
            });

            if (res.success) {
              params.onItemUpdated?.({ type: 'item_updated', itemType: 'location', data: res.data });
            } else {
              failedItems.push({ step: 'b2', name: loc.name, error: res.error || res.message });
            }
            return res;
          });
        }

        // 3. Props
        for (const prop of missingProps) {
          tasks.push(async () => {
            const toolCallId = `prop_${prop.name}`;
            const toolArgs = { propName: prop.name };

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_prop_asset',
              args: toolArgs,
              status: 'running',
            });

            params.onProgress?.({
              step: 'b2',
              item: prop.name,
              current: ++completed,
              total: totalMissing,
              message: `📦 Generating prop asset: ${prop.name} (${completed}/${totalMissing})...`,
            });
            const res = await this.generatePropAsset({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              propName: prop.name,
              physicalCharacteristics: prop.physical_characteristics || '',
              forceRegenerate: params.forceRegenerate,
            });

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_prop_asset',
              args: toolArgs,
              status: res.success ? 'success' : 'error',
              result: res,
            });

            if (res.success) {
              params.onItemUpdated?.({ type: 'item_updated', itemType: 'prop', data: res.data });
            } else {
              failedItems.push({ step: 'b2', name: prop.name, error: res.error || res.message });
            }
            return res;
          });
        }

        // 4. Storyboards (run after concept visuals for style consistency)
        for (const scene of missingStoryboards) {
          const idx = scene.index;
          tasks.push(async () => {
            const toolCallId = `sb_${idx}`;
            const toolArgs = { sceneIndex: idx };

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_scene_storyboard',
              args: toolArgs,
              status: 'running',
            });

            params.onProgress?.({
              step: 'b2',
              item: `Scene #${idx}`,
              current: ++completed,
              total: totalMissing,
              message: `🎬 Drawing storyboard frame for Scene #${idx} (${completed}/${totalMissing})...`,
            });
            const res = await this.generateSceneStoryboard({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              sceneIndex: idx,
              forceRegenerate: params.forceRegenerate,
            });

            params.onToolCall?.({
              id: toolCallId,
              name: 'generate_scene_storyboard',
              args: toolArgs,
              status: res.success ? 'success' : 'error',
              result: res,
            });

            if (res.success) {
              params.onItemUpdated?.({ type: 'item_updated', itemType: 'storyboard', data: res.data });
            } else {
              failedItems.push({ step: 'b2', name: `Scene #${idx}`, error: res.error || res.message });
            }
            return res;
          });
        }

        const stepResults = await runConcurrent(tasks, 2);
        results.push(...stepResults);

        const updatedEpB2 = await db.getEpisodeById(params.episodeId);
        params.onItemUpdated?.({ type: 'item_updated', itemType: 'episode', data: updatedEpB2 });

        return {
          success: failedItems.length === 0,
          message: failedItems.length > 0
            ? `Completed Step b2 with ${failedItems.length} failed item(s): ${failedItems.map(f => f.name).join(', ')}.`
            : `Completed Step b2 (Assets & Storyboards): ${results.length} items processed.`,
          data: { results, failedItems, count: results.length },
        };
      } else if (step === 'b3') {
        // Video Clips for all scenes
        // PREREQUISITE CHECK: Ensure storyboard frames exist before video generation
        const missingStoryboards = scenes.filter((s: any) => !s.storyboard_frame_url);
        if (missingStoryboards.length > 0) {
          Logger.info(`[PipelineTools] Prerequisite: Generating missing storyboard frames before video generation...`);
          for (const s of missingStoryboards) {
            const idx = s.index;
            await this.generateSceneStoryboard({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              sceneIndex: idx,
            });
          }
        }

        const missingVideos = scenes.filter((s: any) => params.forceRegenerate || !s.video_url);
        if (missingVideos.length === 0 && !params.forceRegenerate) {
          return {
            success: true,
            message: `All ${scenes.length} scene video clips already exist.`,
            data: { already_exists: true },
          };
        }

        let completed = 0;
        const tasks = missingVideos.map((scene: any) => {
          const idx = scene.index;
          return async () => {
            params.onProgress?.({
              step: 'b3',
              item: `Scene #${idx}`,
              current: ++completed,
              total: missingVideos.length,
              message: `🎥 Rendering AI Video clip for Scene #${idx} (${completed}/${missingVideos.length})...`,
            });
            const res = await this.generateSceneVideo({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              sceneIndex: idx,
              forceRegenerate: params.forceRegenerate,
            });
            if (!res.success) {
              failedItems.push({ step: 'b3', name: `Scene #${idx} Video`, error: res.error || res.message });
            }
            return res;
          };
        });

        const stepResults = await runConcurrent(tasks, 2);
        results.push(...stepResults);

        return {
          success: failedItems.length === 0,
          message: failedItems.length > 0
            ? `Completed Step b3 with ${failedItems.length} failed video(s): ${failedItems.map(f => f.name).join(', ')}.`
            : `Completed Step b3: ${results.length} video clips processed.`,
          data: { results, failedItems, count: results.length },
        };
      } else if (step === 'b4') {
        // TTS Voiceovers
        const voicedScenes = scenes.filter((s: any) => s.dialogue);
        const missingVoice = voicedScenes.filter((s: any) => params.forceRegenerate || !s.voiceover_url);
        if (missingVoice.length === 0 && !params.forceRegenerate) {
          return {
            success: true,
            message: `All ${voicedScenes.length} dialogue voiceovers already exist.`,
            data: { already_exists: true },
          };
        }

        let completed = 0;
        const tasks = missingVoice.map((scene: any) => {
          const idx = scene.index;
          return async () => {
            params.onProgress?.({
              step: 'b4',
              item: `Scene #${idx}`,
              current: ++completed,
              total: missingVoice.length,
              message: `🎙️ Generating TTS voiceover for Scene #${idx} (${completed}/${missingVoice.length})...`,
            });
            const res = await this.generateSceneVoiceover({
              userId: params.userId,
              seriesId: params.seriesId,
              episodeId: params.episodeId,
              sceneIndex: idx,
              forceRegenerate: params.forceRegenerate,
            });
            if (!res.success) {
              failedItems.push({ step: 'b4', name: `Scene #${idx} Voice`, error: res.error || res.message });
            }
            return res;
          };
        });

        const stepResults = await runConcurrent(tasks, 3);
        results.push(...stepResults);

        return {
          success: failedItems.length === 0,
          message: failedItems.length > 0
            ? `Completed Step b4 with ${failedItems.length} failed audio(s): ${failedItems.map(f => f.name).join(', ')}.`
            : `Completed Step b4: ${results.length} scenes voiced.`,
          data: { results, failedItems, count: results.length },
        };
      } else if (step === 'b5') {
        // Subtitle / Captions (Optional if single main language)
        const defaultLang = series?.language || 'en-US';
        params.onProgress?.({
          step: 'b5',
          item: 'Captions',
          current: 1,
          total: 1,
          message: `💬 Generating and synchronizing episode captions (${defaultLang})...`,
        });
        const dialogueText = scenes.map((s: any) => {
          if (Array.isArray(s.dialogue)) {
            return s.dialogue.map((d: any) => `${d.character || 'Voice'}: ${d.line || ''}`).join('\n');
          }
          return s.dialogue || '';
        }).filter(Boolean).join('\n');

        const captionRes = await generateCaptionsInternal({
          episodeId: params.episodeId,
          language: defaultLang,
          text: dialogueText || '...',
        });

        if (captionRes?.cues && captionRes.cues.length > 0) {
          for (const s of scenes) {
            if (!s.captions_data || s.captions_data.length === 0) {
              s.captions_data = captionRes.cues;
            }
          }
          await db.updateEpisode(params.episodeId, { scenes });
        }

        return {
          success: true,
          message: `Completed Step b5: Subtitle & Captions generated in ${defaultLang}.`,
          data: captionRes,
        };
      } else if (step === 'b6' || step === 'b8') {
        // Step b6 / Export Video via CompositorWorker
        params.onProgress?.({
          step: 'b6',
          item: 'Full Episode',
          current: 1,
          total: 1,
          message: `🎞️ Rendering full episode composite video...`,
        });
        return await this.renderEpisodeVideo({
          userId: params.userId,
          seriesId: params.seriesId,
          episodeId: params.episodeId,
          forceRegenerate: params.forceRegenerate,
        });
      } else if (step === 'b7') {
        return { success: true, message: `Completed Step ${params.stepId} for Episode "${episode.title}".`, data: { stepId: params.stepId } };
      }

      return { success: false, message: `Unknown pipeline stepId "${params.stepId}"` };
    } catch (err: any) {
      return { success: false, message: `Pipeline step ${params.stepId} failed: ${err.message}`, error: err.message };
    }
  }

  /**
   * Render the complete final episode video using CompositorWorker
   * Updates episode status to 'completed' / 'RENDER' and stores video_url
   */
  static async renderEpisodeVideo(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    languageCode?: string;
    dubbingLanguages?: string[];
    captionLanguages?: string[];
    noCaptions?: boolean;
    forceRegenerate?: boolean;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(params.seriesId);
      if (!series) {
        return { success: false, message: `Series ${params.seriesId} not found` };
      }

      const episode = await db.getEpisodeById(params.episodeId);
      if (!episode) return { success: false, message: `Episode ${params.episodeId} not found` };

      const rawScenes = (episode.scenes || []) as any[];
      if (rawScenes.length === 0) {
        return { success: false, message: `Cannot render episode video: Episode "${episode.title}" has no scenes.` };
      }

      // Check if any scene is completely missing visuals
      const unreadyScenes = rawScenes.filter((s: any) => !s.video_url && !s.storyboard_frame_url && !s.image_url);
      if (unreadyScenes.length > 0) {
        const missingList = unreadyScenes.map((s: any) => `#${s.index || '?'}`).join(', ');
        return {
          success: false,
          message: `Cannot render final video: Prerequisite scene visuals are not ready. Scene(s) ${missingList} do not have video clips or storyboard frames. Please run step b2/b3 first.`,
        };
      }

      // Check if already rendered and not forced
      const epAny = episode as any;
      if (!params.forceRegenerate && (episode.video_url || (epAny.video_urls && Object.values(epAny.video_urls)[0]))) {
        const existingUrl = episode.video_url || Object.values(epAny.video_urls || {})[0];
        Logger.info(`[PipelineTools] Episode "${episode.title}" already has rendered video: ${existingUrl}. Skipping.`);
        return {
          success: true,
          message: `Episode "${episode.title}" final video already rendered: ${existingUrl}`,
          data: {
            episode_id: params.episodeId,
            video_url: existingUrl,
            status: episode.status || 'RENDER',
            outputs_by_lang: epAny.video_urls,
            render_versions: epAny.render_versions || [],
          },
        };
      }

      const primaryLang = episode.dubbing_languages?.[0] || episode.caption_languages?.[0] || series.language || 'en-US';

      // 1. Resolve dubbing languages
      let dubbingLangs: string[] = [];
      if (params.dubbingLanguages?.length) {
        dubbingLangs = params.dubbingLanguages.map(l => l.trim()).filter(Boolean);
      } else if (params.languageCode) {
        dubbingLangs = [params.languageCode.trim()];
      } else if (episode.dubbing_languages?.length) {
        dubbingLangs = [...episode.dubbing_languages];
      } else {
        dubbingLangs = [primaryLang];
      }

      // 2. Resolve caption languages (supports explicit empty array [] for no captions)
      let captionLangs: string[] = [];
      const hasExplicitNoCaptions = params.noCaptions === true || (Array.isArray(params.captionLanguages) && params.captionLanguages.length === 0);
      if (hasExplicitNoCaptions) {
        captionLangs = [];
      } else if (params.captionLanguages?.length) {
        captionLangs = params.captionLanguages.map(l => l.trim()).filter(Boolean);
      } else if (params.languageCode) {
        captionLangs = [params.languageCode.trim()];
      } else if (episode.caption_languages?.length) {
        captionLangs = [...episode.caption_languages];
      } else {
        captionLangs = [primaryLang];
      }

      let episodeUpdated = false;
      const scenesList = (episode.scenes || []) as any[];

      // 3. Auto-provision ONLY if any scene with dialogue is actually missing voiceover
      for (const dLang of dubbingLangs) {
        const isPrimary = (dLang === primaryLang);
        for (const sc of scenesList) {
          const diag = sc.dialogue || sc.translations?.[dLang]?.dialogue;
          const hasDiag = Array.isArray(diag) ? diag.length > 0 : Boolean(String(diag || '').trim());
          const existingVo = sc.translations?.[dLang]?.voiceover_url || (isPrimary ? sc.voiceover_url : null);

          // Only generate if this specific scene actually has dialogue AND is missing voiceover
          if (hasDiag && !existingVo) {
            Logger.info(`[PipelineTools] Generating missing TTS voiceover for scene #${sc.index || 1} (${dLang})...`);
            try {
              const ttsRes = await generateDialogueVoiceSynthesis({
                dialogue: Array.isArray(diag) ? diag : [{ line: String(diag) }],
                language: dLang,
                episodeId: params.episodeId,
                sceneId: sc.id || `scene_${sc.index || 1}`,
              });
              if (ttsRes?.audio_url) {
                if (!sc.translations) sc.translations = {};
                if (!sc.translations[dLang]) sc.translations[dLang] = {};
                sc.translations[dLang].voiceover_url = ttsRes.audio_url;
                sc.translations[dLang].voice_duration_us = ttsRes.duration_us || ttsRes.duration_ms * 1000;
                if (ttsRes.cues?.length) {
                  sc.translations[dLang].captions_data = ttsRes.cues;
                }
                if (isPrimary && !sc.voiceover_url) {
                  sc.voiceover_url = ttsRes.audio_url;
                }
                episodeUpdated = true;
              }
            } catch (ttsErr: any) {
              Logger.warn(`[PipelineTools] Failed to auto-generate TTS for scene #${sc.index} (${dLang}): ${ttsErr.message}`);
            }
          }
        }
        if (!episode.dubbing_languages?.includes(dLang)) {
          if (!episode.dubbing_languages) episode.dubbing_languages = [];
          episode.dubbing_languages.push(dLang);
          episodeUpdated = true;
        }
      }

      // 4. Auto-provision ONLY if any scene with dialogue is actually missing captions
      for (const cLang of captionLangs) {
        if (cLang === 'none') continue;
        const isPrimary = (cLang === primaryLang);
        for (const sc of scenesList) {
          const diag = sc.dialogue || sc.translations?.[cLang]?.dialogue;
          const hasDiag = Array.isArray(diag) ? diag.length > 0 : Boolean(String(diag || '').trim());
          const existingCaptions = sc.translations?.[cLang]?.captions_data || (isPrimary ? sc.captions_data : null);

          // Only generate if this specific scene has dialogue AND is missing captions data
          if (hasDiag && (!existingCaptions || existingCaptions.length === 0)) {
            Logger.info(`[PipelineTools] Generating missing captions for scene #${sc.index || 1} (${cLang})...`);
            const diagText = sc.translations?.[cLang]?.translated_dialogue || sc.translations?.[cLang]?.dialogue || sc.dialogue;
            const textStr = Array.isArray(diagText)
              ? diagText.map((d: any) => typeof d === 'string' ? d : d.line || d.text || '').join(' ')
              : String(diagText || '');

            if (textStr.trim()) {
              try {
                const capRes = await generateCaptionsInternal({
                  episodeId: params.episodeId,
                  language: cLang,
                  text: textStr.trim(),
                });
                if (capRes?.cues?.length) {
                  if (!sc.translations) sc.translations = {};
                  if (!sc.translations[cLang]) sc.translations[cLang] = {};
                  sc.translations[cLang].captions_data = capRes.cues;
                  if (isPrimary && (!sc.captions_data || sc.captions_data.length === 0)) {
                    sc.captions_data = capRes.cues;
                  }
                  episodeUpdated = true;
                }
              } catch (capErr: any) {
                Logger.warn(`[PipelineTools] Failed to auto-generate captions for scene #${sc.index} (${cLang}): ${capErr.message}`);
              }
            }
          }
        }
        if (!episode.caption_languages?.includes(cLang)) {
          if (!episode.caption_languages) episode.caption_languages = [];
          episode.caption_languages.push(cLang);
          episodeUpdated = true;
        }
      }

      // Persist updated episode and re-sync timeline if languages were added
      if (episodeUpdated) {
        await db.updateEpisode(params.episodeId, {
          scenes: scenesList,
          dubbing_languages: episode.dubbing_languages,
          caption_languages: episode.caption_languages,
        });
        const currentTimeline = await db.getLatestTimeline(params.episodeId);
        if (currentTimeline) {
          const syncedTimeline = TimelineService.syncTimelineWithScenes(episode, currentTimeline);
          await db.saveTimeline(params.episodeId, syncedTimeline, { id: 'system', name: 'Studio System' }, 'Synchronized timeline with latest languages');
        }
      }

      Logger.info(`[PipelineTools] Starting Headless CompositorWorker export for Episode #${episode.episode_number || 1} "${episode.title}" (Dubbing: [${dubbingLangs.join(', ')}], Captions: [${captionLangs.length ? captionLangs.join(', ') : 'None (No Subtitles)'}])...`);

      const job = compositorWorker.createJob({
        seriesId: params.seriesId,
        episodeId: params.episodeId,
        dubbingLanguages: dubbingLangs,
        captionLanguages: captionLangs,
      });

      const finalJob: RenderJobState = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('CompositorWorker render job timed out after 3 minutes'));
        }, 180000);

        const onCompleted = (completedJob: RenderJobState) => {
          if (completedJob.jobId === job.jobId) {
            cleanup();
            resolve(completedJob);
          }
        };

        const onStatus = (statusJob: RenderJobState) => {
          if (statusJob.jobId === job.jobId && statusJob.status === 'failed') {
            cleanup();
            reject(new Error(statusJob.error || 'OpenVideo Compositor render failed'));
          }
        };

        const cleanup = () => {
          clearTimeout(timeout);
          compositorWorker.off('completed', onCompleted);
          compositorWorker.off('status', onStatus);
        };

        compositorWorker.on('completed', onCompleted);
        compositorWorker.on('status', onStatus);
      });

      const outputsByLang = finalJob.outputsByLang || {};
      const targetLangKey = params.languageCode || dubbingLangs?.[0] || primaryLang;
      const videoUrl = outputsByLang[targetLangKey] || finalJob.outputUrl || Object.values(outputsByLang)[0] || '';

      const mergedOutputs = {
        ...(epAny.video_urls || {}),
        ...outputsByLang,
      };

      // Create new version entry in render history
      const existingVersions = Array.isArray(epAny.render_versions) ? [...epAny.render_versions] : [];
      const newVersionNumber = existingVersions.length + 1;
      const newVersion = {
        version_id: `ver_${Date.now()}_v${newVersionNumber}`,
        version_number: newVersionNumber,
        rendered_at: new Date().toISOString(),
        status: 'RENDER' as const,
        video_url: videoUrl,
        video_urls_by_lang: mergedOutputs,
        languages: Object.keys(mergedOutputs),
        duration: episode.duration || 90,
        notes: `Rendered via CompositorWorker with ${Object.keys(mergedOutputs).length} language track(s)`,
      };
      existingVersions.push(newVersion);

      // Determine best visual candidate for episode cover/thumbnail
      const coverThumb = scenesList.find((s: any) => s.storyboard_frame_url || s.image_url)?.storyboard_frame_url
        || scenesList.find((s: any) => s.storyboard_frame_url || s.image_url)?.image_url
        || episode.cover_image
        || episode.thumbnail_url
        || '';

      // Update Episode record in Database with latest video URLs, versions history, thumbnail cover, and RENDER status
      await db.updateEpisode(params.episodeId, {
        video_url: videoUrl,
        video_urls: mergedOutputs,
        cover_image: coverThumb,
        thumbnail_url: coverThumb,
        render_versions: existingVersions,
        status: 'RENDER',
      });

      Logger.info(`[PipelineTools] Episode "${episode.title}" v${newVersionNumber} render completed: ${videoUrl} (Languages: ${Object.keys(mergedOutputs).join(', ')})`);

      return {
        success: true,
        message: `Successfully rendered final video (v${newVersionNumber}) for Episode #${episode.episode_number || 1} "${episode.title}"!\n\nVideo URL: ${videoUrl}`,
        data: {
          episode_id: params.episodeId,
          version: newVersion,
          video_url: videoUrl,
          status: 'RENDER',
          outputs_by_lang: mergedOutputs,
          all_versions: existingVersions,
        },
      };
    } catch (err: any) {
      Logger.error(`[PipelineTools] Failed to render episode video: ${err.message}`);
      return {
        success: false,
        message: `Failed to render episode video: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Run the complete production pipeline (b1 -> b8) end-to-end
   * Stops immediately if any step fails.
   */
  static async runFullPipeline(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
    forceRegenerate?: boolean;
    onProgress?: (progress: any) => void;
  }): Promise<ToolExecutionResult> {
    try {
      // Step b1: Characters
      const b1 = await this.runPipelineStep({ ...params, stepId: 'b1' });
      if (!b1.success) {
        return { success: false, message: `Pipeline halted at Step b1 (Characters): ${b1.message}`, data: { b1 } };
      }

      // Step b2: Wardrobe, Locations, Props & Storyboards
      const b2 = await this.runPipelineStep({ ...params, stepId: 'b2' });
      if (!b2.success) {
        return { success: false, message: `Pipeline halted at Step b2 (Storyboards & Assets): ${b2.message}`, data: { b1, b2 } };
      }

      // Step b3: Scene Video Generation
      const b3 = await this.runPipelineStep({ ...params, stepId: 'b3' });
      if (!b3.success) {
        return { success: false, message: `Pipeline halted at Step b3 (Scene Videos): ${b3.message}`, data: { b1, b2, b3 } };
      }

      // Step b4: Dialogue Voiceover
      const b4 = await this.runPipelineStep({ ...params, stepId: 'b4' });
      if (!b4.success) {
        return { success: false, message: `Pipeline halted at Step b4 (Voiceovers): ${b4.message}`, data: { b1, b2, b3, b4 } };
      }

      // Step b8: Final Video Render
      const b8 = await this.runPipelineStep({ ...params, stepId: 'b8' });
      if (!b8.success) {
        return { success: false, message: `Pipeline completed asset generation (b1-b4), but Step b8 (Final Video Render) failed: ${b8.message}`, data: { b1, b2, b3, b4, b8 } };
      }

      const finalVideoUrl = b8.data?.video_url || '';

      return {
        success: true,
        message: `🎬 Complete episode production pipeline finished successfully!\n\n**Final Video URL**: ${finalVideoUrl}`,
        data: { video_url: finalVideoUrl, ...b8.data, b1, b2, b3, b4, b8 },
      };
    } catch (err: any) {
      return { success: false, message: `Full pipeline failed: ${err.message}`, error: err.message };
    }
  }

  /**
   * Approve the rendered episode video, transitioning status from RENDER to READY_TO_PUBLISH
   */
  static async approveEpisodeVideo(params: {
    userId?: string;
    seriesId: string;
    episodeId: string;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const episode = await db.getEpisodeById(params.episodeId);
      if (!episode) return { success: false, message: `Episode ${params.episodeId} not found` };

      await db.updateEpisode(params.episodeId, {
        status: 'READY_TO_PUBLISH',
      });

      return {
        success: true,
        message: `Episode #${episode.episode_number || 1} "${episode.title}" has been approved! Status updated to READY_TO_PUBLISH.`,
        data: {
          episodeId: params.episodeId,
          status: 'READY_TO_PUBLISH',
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to approve episode: ${err.message}`, error: err.message };
    }
  }
}
