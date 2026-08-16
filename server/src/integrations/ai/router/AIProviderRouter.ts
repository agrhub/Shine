import { geminiClient } from '../gemini/GeminiClient.js';
import { flowAdapter } from '../flow/FlowAdapter.js';
import { AIAccount, AIAccountStatus, AIAccountType } from '../../../models/AIAccount.js';
import { Logger } from '../../../utils/logger.js';

export interface RouteGenerationOptions {
  userTier?: 'FREE' | 'PRO' | 'ENTERPRISE';
  mode?: 'DRAFT_STORYBOARD' | 'COMMERCIAL_EXPORT';
  prompt: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'MUSIC';
  aspectRatio?: '9:16' | '1:1' | '16:9';
  model?: string;
  jsonMode?: boolean;
}

export class AIProviderRouter {
  /**
   * Routes AI requests:
   * Uses Google Flow Account pool for Image and Video if available.
   * If Flow generation fails or no Flow accounts are available, falls back to GeminiClient.
   */
  async routeGeneration(options: RouteGenerationOptions) {
    const isCommercial = options.userTier === 'ENTERPRISE' || options.mode === 'COMMERCIAL_EXPORT';

    if (isCommercial || options.type === 'TEXT') {
      console.log(`[AIProviderRouter] Routing to Official GCP Vertex AI (Mode: ${options.mode || 'DEFAULT'}, Tier: ${options.userTier || 'FREE'})`);
    }
    if (options.type === 'IMAGE') {
      try {
        const flowAccount = await AIAccount.findOne({
          accountType: AIAccountType.GOOGLE_FLOW,
          status: AIAccountStatus.READY,
          isActive: true,
        });

        if (flowAccount) {
          Logger.info(`[AIProviderRouter] Attempting Image generation via Flow Account: ${flowAccount.email}`);
          const flowResult = await flowAdapter.generateImage(
            flowAccount,
            options.prompt,
            options.model || 'IMAGEN_3_5',
            { aspectRatio: options.aspectRatio === '1:1' ? '1:1' : options.aspectRatio === '16:9' ? '16:9' : '9:16' }
          );

          if (flowResult) {
            const data = (flowResult as any).buffer ? (flowResult as any).buffer.toString('base64') : (flowResult as any).url;
            return {
              provider: 'Flow Account (Imagen 3.5)',
              data,
            };
          }
        }
      } catch (flowErr: any) {
        Logger.warn(`[AIProviderRouter] Flow image generation failed (${flowErr.message}), falling back to GeminiClient.`);
      }

      // Fallback to GeminiClient
      Logger.info('[AIProviderRouter] Generating Image via GeminiClient');
      const imageBytes = await geminiClient.generateImage({
        prompt: options.prompt,
        aspectRatio: options.aspectRatio || '9:16',
        model: options.model,
      });

      return {
        provider: 'Gemini (Imagen 3)',
        data: imageBytes,
      };
    }

    if (options.type === 'VIDEO') {
      try {
        const flowAccount = await AIAccount.findOne({
          accountType: AIAccountType.GOOGLE_FLOW,
          status: AIAccountStatus.READY,
          isActive: true,
        });

        if (flowAccount) {
          Logger.info(`[AIProviderRouter] Attempting Video generation via Flow Account: ${flowAccount.email}`);
          const flowResult = await flowAdapter.generateVideo(
            flowAccount,
            options.prompt,
            options.model || 'veo2',
            { aspectRatio: options.aspectRatio === '1:1' ? '1:1' : options.aspectRatio === '16:9' ? '16:9' : '9:16' }
          );

          if (flowResult) {
            return {
              provider: 'Flow Account (Veo 2)',
              data: flowResult,
            };
          }
        }
      } catch (flowErr: any) {
        Logger.warn(`[AIProviderRouter] Flow video generation failed (${flowErr.message}), falling back to GeminiClient.`);
      }

      // Fallback to GeminiClient
      Logger.info('[AIProviderRouter] Generating Video via GeminiClient');
      const videoResult = await geminiClient.generateVideo(options.prompt, options.model, {
        aspectRatio: options.aspectRatio === '1:1' ? '1:1' : options.aspectRatio === '16:9' ? '16:9' : '9:16',
      });

      return {
        provider: 'Gemini (Veo)',
        data: videoResult,
      };
    }

    // Default Text Generation via GeminiClient
    const text = await geminiClient.generateText({
      prompt: options.prompt,
      model: options.model,
      jsonMode: options.jsonMode,
    });

    return {
      provider: 'Gemini (Gemini 2.5/3.x)',
      data: text,
    };
  }
}

export const aiProviderRouter = new AIProviderRouter();
