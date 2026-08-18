import { aiProviderRouter } from '../integrations/ai/router/AIProviderRouter.js';

export class MultiProviderAIClient {
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    return await aiProviderRouter.generateText(prompt, { systemInstruction: systemPrompt });
  }

  async generateJSON<T>(prompt: string, fallbackData?: T): Promise<T> {
    return await aiProviderRouter.generateJSON<T>(prompt, fallbackData);
  }

  async generateImage(prompt: string, options?: { aspectRatio?: '9:16' | '1:1' | '16:9'; model?: string; systemPrompt?: string }) {
    return await aiProviderRouter.generateImage(prompt, options);
  }

  async generateVideo(prompt: string, options?: { aspectRatio?: '9:16' | '1:1' | '16:9'; model?: string }) {
    return await aiProviderRouter.generateVideo(prompt, options);
  }
}

export const aiClient = new MultiProviderAIClient();

