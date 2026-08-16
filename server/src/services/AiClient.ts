import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';
import { Logger } from '../utils/logger.js';

export class MultiProviderAIClient {
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      return await geminiClient.generateText({
        prompt,
        systemInstruction: systemPrompt,
        model: process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-2.5-flash',
      });
    } catch (err: any) {
      Logger.error(`[AIClient] generateText error: ${err.message}`);
      throw err;
    }
  }

  async generateJSON<T>(prompt: string, fallbackData?: T): Promise<T> {
    try {
      const rawText = await geminiClient.generateText({
        prompt,
        jsonMode: true,
        model: process.env.GEMINI_MODEL_TEXT_ANALYSIS || 'gemini-2.5-flash',
      });

      const match = rawText.match(/```json([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonStr = match ? match[1] || match[0] : rawText;
      return JSON.parse(jsonStr) as T;
    } catch (err: any) {
      Logger.error(`[AIClient] generateJSON error: ${err.message}`);
      if (fallbackData !== undefined) return fallbackData;
      throw err;
    }
  }
}

export const aiClient = new MultiProviderAIClient();
