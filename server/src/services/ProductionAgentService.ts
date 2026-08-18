import { aiProviderRouter } from '@/integrations/ai/router/AIProviderRouter.js';
import { loadSkill } from '@/utils/SkillLoader.js';
import { StorageFactory } from '@/services/storage/StorageFactory.js';
import { Logger } from '@/utils/logger.js';

export interface StoryboardPanel {
  id: string;
  sceneIndex: number;
  shotNumber: number;
  prompt: string;
  cameraMovement: string;
  lightingStyle: string;
  characterAnchors: string[];
  imageUrl?: string;
  durationSeconds: number;
}

export class ProductionAgentService {
  async generateStoryboardPanels(scenes: any[]): Promise<StoryboardPanel[]> {
    const frameSkill = loadSkill('production_frame_prompt');
    const prompt = `You are a cinematic 9:16 vertical micro-drama production director.
Given the following scenes, generate an array of visual storyboard panels in JSON format:
${JSON.stringify(scenes, null, 2)}

Return JSON matching the schema:
[
  {
    "id": "sb_1",
    "sceneIndex": 1,
    "shotNumber": 1,
    "prompt": "Cinematic vertical 9:16 shot of ...",
    "cameraMovement": "Push In / Pan / Close Up",
    "lightingStyle": "Cinematic Rim Light & High Contrast",
    "characterAnchors": ["character_anchor_name"],
    "durationSeconds": 5
  }
]`;

    let panels: StoryboardPanel[] = [];
    try {
      panels = await aiProviderRouter.generateJSON<StoryboardPanel[]>(prompt, undefined, {
        systemInstruction: frameSkill || 'You are an expert AI storyboard director for vertical micro-dramas.',
      });
    } catch (err: any) {
      Logger.warn(`[ProductionAgentService] AI JSON parse fallback: ${err.message}`);
    }

    if (!Array.isArray(panels) || panels.length === 0) {
      panels = scenes.map((sc, idx) => ({
        id: `sb-${Date.now()}-${idx + 1}`,
        sceneIndex: sc.sceneIndex || idx + 1,
        shotNumber: idx + 1,
        prompt: sc.prompt || `Cinematic 9:16 vertical video frame of micro drama scene ${idx + 1}, dramatic lighting, 8k render`,
        cameraMovement: sc.cameraCue || 'Push In',
        lightingStyle: 'Cinematic Rim Light & High Contrast',
        characterAnchors: sc.characters || ['character_anchor'],
        durationSeconds: sc.durationSeconds || 5,
      }));
    }

    // Generate real visual image for the initial panels
    for (let i = 0; i < Math.min(panels.length, 3); i++) {
      try {
        const p = panels[i];
        const imgResult = await aiProviderRouter.generateImage(p.prompt, {
          aspectRatio: '9:16',
          systemPrompt: frameSkill,
        });

        if (imgResult?.url) {
          const s3Res = await StorageFactory.uploadMedia(imgResult.url, 'images', 'png', imgResult.mimeType || 'image/png');
          p.imageUrl = `/api/assets/file/${s3Res.key}`;
        }
      } catch (imgErr: any) {
        Logger.warn(`[ProductionAgentService] Frame image generation error for panel ${i + 1}: ${imgErr.message}`);
      }
    }

    return panels;
  }
}

export const productionAgentService = new ProductionAgentService();

