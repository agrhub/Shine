import { aiClient } from './AiClient';

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
    const prompt = `Generate 9:16 vertical cinematic storyboard visual panel prompts for scenes: ${JSON.stringify(scenes)}`;

    const fallbackPanels: StoryboardPanel[] = scenes.map((sc, idx) => ({
      id: `sb-${Date.now()}-${idx}`,
      sceneIndex: sc.sceneIndex || idx + 1,
      shotNumber: idx + 1,
      prompt: sc.prompt || `Cinematic 9:16 vertical video frame of micro drama scene ${idx + 1}, ultra detailed film lighting`,
      cameraMovement: sc.cameraCue || 'Push In',
      lightingStyle: 'Cinematic Rim Light & High Contrast',
      characterAnchors: ['mara_lora_v1'],
      imageUrl: `https://lh3.googleusercontent.com/aida-public/AB6AXuBtkqUzKdcAYE1FhPsRYFIBbnfRkblPXgHUmyY2lO08hNiz9EwgjWw1MyufKF9NAOd561vhT54S9rHPjh7mk5DNdM3bdmAfnJn-oKwmvO7pMxhtB3TNPg-EGe9RK1EPnuZCnS-pCTmPAN6DilaM9Pnjtl5EOHd9QZP7lcBybJui1CzT_WCS5RzXGcrC4Aph9CSWziB0m12r78bXGkolWf3uivcxZyONaKfKL1rZfmc9HqFbpdoOlQsUBA`,
      durationSeconds: sc.durationSeconds || 5,
    }));

    return await aiClient.generateJSON(prompt, fallbackPanels);
  }
}

export const productionAgentService = new ProductionAgentService();
