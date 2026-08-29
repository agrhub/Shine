import { AsyncLocalStorage } from 'node:async_hooks';
import { Logger } from '@/utils/logger.js';
import { CreditService, type CreditTaskKey } from '@/services/CreditService.js';

export interface ActiveChatExecutionContext {
  userId?: string;
  seriesId?: string;
  episodeId?: string;
  contextData?: any;
  onItemUpdated?: (event: { type: string; data: any }) => void;
  onProgress?: (progress: any) => void;
  onToolCall?: (event: any) => void;
  onChunk?: (chunk: string) => void;
}

export const chatContextStorage = new AsyncLocalStorage<ActiveChatExecutionContext>();

export function getActiveChatContext(): ActiveChatExecutionContext | undefined {
  return chatContextStorage.getStore();
}

export function runWithChatContext<T>(context: ActiveChatExecutionContext, fn: () => Promise<T>): Promise<T> {
  return chatContextStorage.run(context, fn);
}

export interface ToolContextParams {
  userId?: string;
  seriesId?: string;
  episodeId?: string;
  contextData?: any;
  onItemUpdated?: (event: { type: string; data: any, step?: string }) => void;
  onProgress?: (progress: any) => void;
  onToolCall?: (event: any) => void;
  onChunk?: (chunk: string) => void;
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  retriesAttempted?: number;
}

/**
 * Execute an operation with automatic retry
 */
export async function executeWithRetry<T>(
  actionName: string,
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<{ result: T; retries: number }> {
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    attempt++;
    try {
      Logger.info(`[ChatbotTools] Executing ${actionName} (Attempt ${attempt}/${maxRetries})...`);
      const result = await fn();
      return { result, retries: attempt };
    } catch (err: any) {
      lastError = err;
      Logger.warn(`[ChatbotTools] ${actionName} attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Execute AI generation task with automatic user credit deduction
 */
export async function withCreditDeduction<T>(
  userId: string | undefined,
  taskKey: CreditTaskKey,
  activityName: string,
  details: string,
  fn: () => Promise<T>
): Promise<T> {
  if (userId) {
    try {
      await CreditService.deductUserCredits(userId, taskKey, activityName, details);
    } catch (cErr: any) {
      Logger.warn(`[ChatbotTools] Credit deduction notice: ${cErr.message}`);
    }
  }
  return await fn();
}
