import { aiProviderRouter } from '@/integrations/ai/router/AIProviderRouter.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { PromptLoader } from '@/utils/PromptLoader.js';
import { getVisualStylePrompt } from '~/constants/VisualStyles.js';
import { Logger } from '@/utils/logger.js';
import { ShotFrame } from '@/database/IDatabaseProvider.js';
import { scriptAgent } from '@/agents/ScriptAgent.js';

export interface ScreenplayAssetsResult {
  characters: string[];
  locations: string[];
  props: string[];
}

/**
 * AssetService: Responsible for Image Asset Generation (Character sheets, Location sheets, Prop shots, Storyboard shot images)
 */
export class AssetService {
  // ── Core Image Asset Generation ──────────────────────────────────────────

  /**
   * 1. Generate Single Character Portrait / Avatar (9:16 vertical character portrait fitting the UI avatar frame)
   */
  public static async generateCharacterPortrait(
    characterName: string,
    physicalCharacteristics: string,
    clothingAndAccessories?: string,
    visualStyle?: string,
    age?: number,
    gender?: string,
    aspectRatio: "9:16" | "16:9" | "4:3" | "1:1" = '9:16'
  ): Promise<{ imageUrl: string }> {
    const stylePrompt = getVisualStylePrompt(visualStyle);
    const ageTag = age ? `${age}-year-old ` : '';
    const genderTag = gender && gender !== 'neutral' ? `${gender} ` : '';
    const traits = physicalCharacteristics || 'Cinematic character portrait';
    const clothing = clothingAndAccessories ? `, wearing ${clothingAndAccessories}` : '';

    const prompt = `${stylePrompt}, centered vertical single person portrait of ${ageTag}${genderTag}${characterName}, ${traits}${clothing}, cinematic lighting, 9:16 vertical framing, age-accurate facial features, character continuity reference, clear head and shoulders framed properly within bounds.`;

    Logger.info(`[AssetService.generateCharacterPortrait] Prompt for ${characterName}: ${prompt}`);

    const result = await aiProviderRouter.generateImage(prompt, {
      aspectRatio,
    });

    if (!result?.url) {
      throw new Error(`Failed to generate character portrait for ${characterName}`);
    }

    const s3 = await StorageFactory.uploadMedia(result.url, 'images', 'png', result.mimeType || 'image/png');
    return { imageUrl: `/api/assets/file/${s3.key}` };
  }

  /**
   * 2. Generate 2-in-1 Character Sheet (Head & shoulders portrait left + Full body right on white background)
   */
  public static async generateCharacterSheet(
    characterName: string,
    physicalCharacteristics: string,
    clothingAndAccessories: string,
    visualStyle?: string,
    referenceImageUrl?: string
  ): Promise<{ imageUrl: string }> {
    const stylePrompt = getVisualStylePrompt(visualStyle);
    const prompt = PromptLoader.render('assets/character_sheet', {
      characterName,
      physicalCharacteristics,
      clothingAndAccessories,
      visualStyle: stylePrompt,
      referenceImageUrl,
    });

    Logger.info(`[AssetService.generateCharacterSheet] Prompt for ${characterName}: ${prompt} (Ref: ${referenceImageUrl || 'none'})`);

    const referencePool = referenceImageUrl ? [referenceImageUrl] : [];

    const result = await aiProviderRouter.generateImage(prompt, {
      aspectRatio: '16:9',
      characterReferences: referencePool,
      imageInputs: referencePool,
    });

    if (!result?.url) {
      throw new Error(`Failed to generate character sheet for ${characterName}`);
    }

    const s3 = await StorageFactory.uploadMedia(result.url, 'images', 'png', result.mimeType || 'image/png');
    return { imageUrl: `/api/assets/file/${s3.key}` };
  }

  /**
   * 2. Generate 4-in-1 Location Sheet (1 establishing + 3 perspective views 16:9)
   */
  public static async generateLocationSheet(
    locationName: string,
    physicalCharacteristics: string,
    timeOfDay: string = 'Daytime',
    visualStyle?: string
  ): Promise<{ imageUrl: string }> {
    const stylePrompt = getVisualStylePrompt(visualStyle);
    const prompt = PromptLoader.render('assets/location_sheet', {
      locationName,
      physicalCharacteristics,
      timeOfDay,
      visualStyle: stylePrompt,
    });

    Logger.info(`[AssetService.generateLocationSheet] Prompt for ${locationName}: ${prompt}`);

    const result = await aiProviderRouter.generateImage(prompt, {
      aspectRatio: '16:9',
    });

    if (!result?.url) {
      throw new Error(`Failed to generate location sheet for ${locationName}`);
    }

    const s3 = await StorageFactory.uploadMedia(result.url, 'images', 'png', result.mimeType || 'image/png');
    return { imageUrl: `/api/assets/file/${s3.key}` };
  }

  /**
   * 3. Generate Prop Product Shot (Isolated on white background)
   */
  public static async generatePropProductShot(
    propName: string,
    physicalCharacteristics: string,
    visualStyle?: string
  ): Promise<{ imageUrl: string }> {
    const stylePrompt = getVisualStylePrompt(visualStyle);
    const prompt = PromptLoader.render('assets/prop_product_shot', {
      propName,
      physicalCharacteristics,
      visualStyle: stylePrompt,
    });

    Logger.info(`[AssetService.generatePropProductShot] Prompt for ${propName}: ${prompt}`);

    const result = await aiProviderRouter.generateImage(prompt, {
      aspectRatio: '16:9',
    });

    if (!result?.url) {
      throw new Error(`Failed to generate prop product shot for ${propName}`);
    }

    const s3 = await StorageFactory.uploadMedia(result.url, 'images', 'png', result.mimeType || 'image/png');
    return { imageUrl: `/api/assets/file/${s3.key}` };
  }

  /**
   * 4. Generate Shot Frame Image utilizing Linked Reference Assets
   */
  public static async generateShotImage(
    shot: ShotFrame,
    assetsMap: Map<string, { name: string; type: string; imageUrl?: string; image_url?: string; physicalCharacteristics?: string; physical_characteristics?: string }>,
    visualStyle?: string,
    aspectRatio: string = '9:16'
  ): Promise<{ imageUrl: string }> {
    const stylePrompt = getVisualStylePrompt(visualStyle);

    // Collect reference image URLs for multi-modal context
    const referenceImageUrls: string[] = [];
    const contextDescriptions: string[] = [];

    const linkedIds = shot.linked_asset_ids || (shot as any).linkedAssetIds;
    if (Array.isArray(linkedIds)) {
      for (const assetId of linkedIds) {
        const asset = assetsMap.get(assetId);
        if (asset) {
          const img = asset.image_url || asset.imageUrl;
          if (img) {
            referenceImageUrls.push(img);
          }
          const charDesc = asset.physical_characteristics || asset.physicalCharacteristics;
          if (charDesc) {
            contextDescriptions.push(`[${(asset.type || 'ASSET').toUpperCase()}: ${asset.name}] ${charDesc}`);
          }
        }
      }
    }

    const prompt = PromptLoader.render('storyboard/shot_image', {
      frameVisual: shot.frame_visual || (shot as any).frameVisual,
      frameMotion: shot.frame_motion || (shot as any).frameMotion || 'Cinematic composition',
      contextDescriptions: contextDescriptions.join('\n'),
      visualStyle: stylePrompt,
    });

    Logger.info(`[AssetService.generateShotImage] Generating shot #${shot.index} with ${referenceImageUrls.length} references`);

    const result = await aiProviderRouter.generateImage(prompt, {
      aspectRatio: aspectRatio as any,
      characterReferences: referenceImageUrls,
      imageInputs: referenceImageUrls,
    });

    if (!result?.url) {
      throw new Error(`Failed to generate storyboard image for shot #${shot.index}`);
    }

    const s3 = await StorageFactory.uploadMedia(result.url, 'images', 'png', result.mimeType || 'image/png');
    return { imageUrl: `/api/assets/file/${s3.key}` };
  }
}
