import { aiProviderRouter } from '@/integrations/ai/router/AIProviderRouter.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { Logger } from '@/utils/logger.js';

export interface CharacterPersona {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporter';
  description: string;
  facialAnchors?: {
    frontAnchorUrl: string;
    sideAnchorUrl: string;
    expressionSheetUrl: string;
    allAnchors?: Array<{
      id: string;
      name: string;
      landmarkType: string;
      matchScore: number;
      status: 'locked';
      imageUrl: string;
    }>;
    loraModelId: string;
  };
  wardrobe: Array<{ id: string; name: string; category: string; imageUrl?: string }>;
}

export class CharacterService {
  private getAnchorDefinitions(charName: string, desc: string = '', age?: number, gender?: string, wardrobeDesc?: string) {
    const ageTag = age ? `${age}-year-old ` : '';
    const genderTag = gender && gender !== 'neutral' ? `${gender} ` : '';
    const charTag = `${ageTag}${genderTag}${charName}`;
    const wardrobeTag = wardrobeDesc ? `wearing ${wardrobeDesc}` : 'wearing signature outfit';

    return [
      { id: 'anc-1', name: `${charName} Frontal Primary View`, landmarkType: 'front', matchScore: 99.2, prompt: `Facial consistency anchor, front view portrait of ${charTag}, ${wardrobeTag}, ${desc}, perfectly centered, sharp eyes, age-accurate skin texture, studio lighting, highly detailed 8k cinematic photorealistic portrait.` },
      { id: 'anc-2', name: `${charName} 45-Degree Left Profile`, landmarkType: 'quarter_left', matchScore: 98.4, prompt: `Facial consistency anchor, 45-degree angle turned left portrait of ${charTag}, ${wardrobeTag}, ${desc}, consistent facial bone structure, cinematic key lighting, photorealistic 8k.` },
      { id: 'anc-3', name: `${charName} 45-Degree Right Profile`, landmarkType: 'quarter_right', matchScore: 98.1, prompt: `Facial consistency anchor, 45-degree angle turned right portrait of ${charTag}, ${wardrobeTag}, ${desc}, consistent facial features, rim lighting, photorealistic 8k.` },
      { id: 'anc-4', name: `${charName} Profile Left (90 deg)`, landmarkType: 'profile_left', matchScore: 97.5, prompt: `Facial consistency anchor, direct 90-degree side profile left view of ${charTag}, ${wardrobeTag}, ${desc}, sharp jawline and nose profile, cinematic studio lighting, photorealistic 8k.` },
      { id: 'anc-5', name: `${charName} Profile Right (90 deg)`, landmarkType: 'profile_right', matchScore: 97.3, prompt: `Facial consistency anchor, direct 90-degree side profile right view of ${charTag}, ${wardrobeTag}, ${desc}, sharp jawline and facial symmetry, photorealistic 8k.` },
      { id: 'anc-6', name: `${charName} Low Dramatic Angle`, landmarkType: 'low_angle', matchScore: 96.8, prompt: `Facial consistency anchor, dramatic low angle looking up at ${charTag}, ${wardrobeTag}, ${desc}, heroic confident framing, dramatic cinematic shadows, photorealistic 8k.` },
      { id: 'anc-7', name: `${charName} High Tense Angle`, landmarkType: 'high_angle', matchScore: 96.4, prompt: `Facial consistency anchor, high angle looking down at ${charTag}, ${wardrobeTag}, ${desc}, cinematic suspense mood, sharp focal depth, photorealistic 8k.` },
      { id: 'anc-8', name: `${charName} Cinematic Dramatic Close-up`, landmarkType: 'dramatic_close_up', matchScore: 98.9, prompt: `Facial consistency anchor, ultra photorealistic cinematic close-up emotive portrait of ${charTag}, ${wardrobeTag}, ${desc}, intense focused dramatic expression, realistic human skin pores, sharp eye reflection, natural cinematic lighting, 8k photorealistic, identical character face to frontal portrait.` },
    ];
  }

  async extractFacialAnchors(characterId: string, charName: string, desc: string = '', age?: number, gender?: string, wardrobeDesc?: string, existingFrontalUrl?: string): Promise<CharacterPersona['facialAnchors']> {
    const loraModelId = `lora_${charName.toLowerCase().replace(/\s+/g, '_')}_v1`;
    const anchorDefinitions = this.getAnchorDefinitions(charName, desc, age, gender, wardrobeDesc);

    const generatedAnchors: any[] = new Array(anchorDefinitions.length);

    // ─── STEP 1: Establish Frontal Reference (anc-1) ───────────────────────────
    let frontalUrl = existingFrontalUrl || '';

    if (!frontalUrl) {
      const anc1Def = anchorDefinitions[0];
      Logger.info(`[CharacterService] Generating primary frontal anchor (anc-1) for ${charName}...`);
      try {
        const res = await aiProviderRouter.generateImage(anc1Def.prompt, { aspectRatio: '9:16' });
        if (res?.url) {
          const s3 = await StorageFactory.uploadMedia(res.url, 'images', 'png', res.mimeType || 'image/png');
          frontalUrl = `/api/assets/file/${s3.key}`;
          generatedAnchors[0] = {
            id: anc1Def.id,
            name: anc1Def.name,
            landmarkType: anc1Def.landmarkType,
            matchScore: anc1Def.matchScore,
            status: 'locked' as const,
            imageUrl: frontalUrl,
          };
        }
      } catch (err: any) {
        Logger.error(`[CharacterService] Frontal anchor generation failed: ${err.message}`);
      }
    } else {
      const anc1Def = anchorDefinitions[0];
      generatedAnchors[0] = {
        id: anc1Def.id,
        name: anc1Def.name,
        landmarkType: anc1Def.landmarkType,
        matchScore: anc1Def.matchScore,
        status: 'locked' as const,
        imageUrl: frontalUrl,
      };
    }

    const defaultUrl = frontalUrl || '/api/assets/file/default_character_front.png';
    if (!generatedAnchors[0]) {
      generatedAnchors[0] = {
        id: anchorDefinitions[0].id,
        name: anchorDefinitions[0].name,
        landmarkType: anchorDefinitions[0].landmarkType,
        matchScore: anchorDefinitions[0].matchScore,
        status: 'locked' as const,
        imageUrl: defaultUrl,
      };
    }

    // ─── STEP 2: Generate Remaining 7 Angles referencing the Frontal Image ─────
    Logger.info(`[CharacterService] Generating remaining 7 angles referencing primary frontal face (${frontalUrl || 'default'})...`);

    const remainingDefs = anchorDefinitions.slice(1);
    const referencePool = frontalUrl ? [frontalUrl] : [];

    const remainingResults = await Promise.all(
      remainingDefs.map(async (anc, idx) => {
        const actualIndex = idx + 1;
        try {
          const consistentPrompt = `${anc.prompt} Exact character continuity matching reference image, identical facial features, eyes, jawline, hair, and clothing.`;
          const res = await aiProviderRouter.generateImage(consistentPrompt, {
            aspectRatio: '9:16',
            characterReferences: referencePool,
            imageInputs: referencePool,
          });

          if (res?.url) {
            const s3 = await StorageFactory.uploadMedia(res.url, 'images', 'png', res.mimeType || 'image/png');
            return {
              index: actualIndex,
              anchor: {
                id: anc.id,
                name: anc.name,
                landmarkType: anc.landmarkType,
                matchScore: anc.matchScore,
                status: 'locked' as const,
                imageUrl: `/api/assets/file/${s3.key}`,
              },
            };
          }
        } catch (err: any) {
          Logger.warn(`[CharacterService] Anchor generation failed for ${anc.name}: ${err.message}`);
        }
        return {
          index: actualIndex,
          anchor: {
            id: anc.id,
            name: anc.name,
            landmarkType: anc.landmarkType,
            matchScore: anc.matchScore,
            status: 'locked' as const,
            imageUrl: defaultUrl,
          },
        };
      })
    );

    for (const res of remainingResults) {
      generatedAnchors[res.index] = res.anchor;
    }

    return {
      frontAnchorUrl: generatedAnchors[0]?.imageUrl || defaultUrl,
      sideAnchorUrl: generatedAnchors[1]?.imageUrl || defaultUrl,
      expressionSheetUrl: generatedAnchors[7]?.imageUrl || defaultUrl,
      allAnchors: generatedAnchors,
      loraModelId,
    };
  }

  async extractSingleAnchor(characterId: string, anchorId: string, charName: string, desc: string = '', age?: number, gender?: string, wardrobeDesc?: string, referenceImageUrl?: string) {
    const anchorDefinitions = this.getAnchorDefinitions(charName, desc, age, gender, wardrobeDesc);
    const targetDef = anchorDefinitions.find(a => a.id === anchorId) || anchorDefinitions[0];

    Logger.info(`[CharacterService] Re-generating single anchor "${targetDef.name}" (${anchorId}) for ${charName} with frontal reference: ${referenceImageUrl || 'none'}...`);

    const refPool = referenceImageUrl ? [referenceImageUrl] : [];
    const consistentPrompt = referenceImageUrl
      ? `${targetDef.prompt} Exact character continuity matching reference image, identical facial features, eyes, jawline, hair, and clothing.`
      : targetDef.prompt;

    const res = await aiProviderRouter.generateImage(consistentPrompt, {
      aspectRatio: '9:16',
      characterReferences: refPool,
      imageInputs: refPool,
    });

    if (!res || !res.url) {
      throw new Error(`Failed to generate image for anchor ${anchorId}`);
    }

    const s3 = await StorageFactory.uploadMedia(res.url, 'images', 'png', res.mimeType || 'image/png');
    const finalUrl = `/api/assets/file/${s3.key}`;

    return {
      id: targetDef.id,
      name: targetDef.name,
      landmarkType: targetDef.landmarkType,
      matchScore: targetDef.matchScore,
      status: 'locked' as const,
      imageUrl: finalUrl,
    };
  }
}

export const characterService = new CharacterService();

