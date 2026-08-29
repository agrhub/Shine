import { getDatabaseProvider } from '~/database/index.js';
import { Logger } from '~/utils/logger.js';
import { EnvConfig } from '~/config/env.js';
import {
  createChatbotTools,
  createMasterPlanTools,
  createProductionPipelineTools,
  createTimelineEditorTools,
  createScreenplayTools,
  runWithChatContext,
} from './chatbot/tools.js';
import {
  getRootAgentInstruction,
  getMasterPlanAgentInstruction,
  getProductionPipelineAgentInstruction,
  getTimelineEditorAgentInstruction,
  getScreenplayAgentInstruction,
  buildLiveContextSnapshot,
} from './chatbot/prompts.js';
import { createUserContent } from '@google/genai';
import { InMemoryRunner, LlmAgent, StreamingMode, isFinalResponse } from '@google/adk';
import { afterTool, beforeTool, rateLimitCallback } from './chatbot/callback.js';
import { geminiClient } from '~/integrations/ai/gemini/GeminiClient.js';
import { aiProviderRouter } from '~/integrations/ai/router/AIProviderRouter.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    args: any;
    status: 'running' | 'success' | 'error';
    result?: any;
    retries?: number;
  }>;
  suggestions?: Array<{ label: string; prompt: string }>;
}

export interface EpisodeChatSession {
  sessionId: string;
  userId: string;
  seriesId: string;
  episodeId: string;
  messages: ChatMessage[];
  lastActive: number;
}

const sessions = new Map<string, EpisodeChatSession>();
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TIMEOUT_MS) {
      sessions.delete(key);
      Logger.info(`[ChatbotAgent] Cleared inactive session ${key}`);
    }
  }
}, 10 * 60 * 1000);

// ─── Singleton Agent & Runner Instances (Persistent across app lifecycle) ────
let copilotRunnerInstance: InMemoryRunner | null = null;
let wizardRunnerInstance: InMemoryRunner | null = null;

function getOrInitCopilotRunner(): InMemoryRunner {
  if (!copilotRunnerInstance) {
    const modelName = EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro';

    // Sub-Agent 1: Master Plan & Story Architect
    const masterPlanAgent = new LlmAgent({
      name: 'master_plan_agent',
      description: 'Shine AI Master Screenplay & Series Architect: Designs character profiles, 3-act story hooks, episodic breakdowns, and verifies compliance.',
      model: modelName,
      instruction: getMasterPlanAgentInstruction({}),
      tools: createMasterPlanTools(),
    });

    // Sub-Agent 2: Production Pipeline & Asset Specialist
    const productionPipelineAgent = new LlmAgent({
      name: 'production_pipeline_agent',
      description: 'Shine AI Production Pipeline Specialist: Generates character art, location shots, storyboards, voiceovers, video clips, and final video rendering.',
      model: modelName,
      instruction: getProductionPipelineAgentInstruction({}),
      tools: createProductionPipelineTools(),
    });

    // Sub-Agent 3: Timeline & Studio Editor
    const timelineEditorAgent = new LlmAgent({
      name: 'timeline_editor_agent',
      description: 'Shine AI Studio Video Editor: Modifies video timeline, trims clips, overlays text, applies transitions/effects, and syncs subtitles.',
      model: modelName,
      instruction: getTimelineEditorAgentInstruction({}),
      tools: createTimelineEditorTools(),
    });

    // Sub-Agent 4: Screenplay Writer & Shot Breakdown Specialist
    const screenplayAgent = new LlmAgent({
      name: 'screenplay_writer_agent',
      description: 'Shine AI Screenplay Writer & Episode Shot Breakdown Specialist: Writes detailed shot-by-shot episode screenplays with character costumes, dialogue, camera movements, and visual prompts. Streams word-by-word over SSE.',
      model: modelName,
      instruction: getScreenplayAgentInstruction({}),
      tools: createScreenplayTools(),
    });

    // Root Agent: Main Orchestrator
    const rootAgent = new LlmAgent({
      name: 'shine_copilot_agent',
      description: 'Shine AI Production Director Copilot Agent',
      model: modelName,
      instruction: getRootAgentInstruction({}),
      tools: createChatbotTools(),
      subAgents: [masterPlanAgent, productionPipelineAgent, timelineEditorAgent, screenplayAgent],
      beforeToolCallback: beforeTool,
      afterToolCallback: afterTool,
      beforeModelCallback: rateLimitCallback,
    });

    copilotRunnerInstance = new InMemoryRunner({
      agent: rootAgent,
      appName: 'shine_copilot',
    });

    Logger.info(`[ChatbotAgent] Initialized singleton Copilot Runner (${modelName})`);
  }
  return copilotRunnerInstance;
}

function getOrInitWizardRunner(): InMemoryRunner {
  if (!wizardRunnerInstance) {
    const modelName = EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro';

    const wizardAgent = new LlmAgent({
      name: 'shine_master_plan_architect',
      description: 'Shine AI Master Screenplay & Series Architect',
      model: modelName,
      instruction: getMasterPlanAgentInstruction({}),
      tools: createMasterPlanTools(),
      beforeToolCallback: beforeTool,
      afterToolCallback: afterTool,
      beforeModelCallback: rateLimitCallback,
    });

    wizardRunnerInstance = new InMemoryRunner({
      agent: wizardAgent,
      appName: 'shine_wizard',
    });

    Logger.info(`[ChatbotAgent] Initialized singleton Series Wizard Runner (${modelName})`);
  }
  return wizardRunnerInstance;
}

export class ChatbotAgent {
  /**
   * Get or create a session for an episode or wizard flow
   */
  public static async getOrCreateSession(userId: string, seriesId: string, episodeId: string): Promise<EpisodeChatSession> {
    const sessionKey = `${userId}_${seriesId}_${episodeId}`;
    let session = sessions.get(sessionKey);

    if (!session) {
      // Check if another session with same seriesId exists
      for (const [k, s] of sessions.entries()) {
        if (s.userId === userId && s.seriesId === seriesId) {
          session = s;
          break;
        }
      }
    }

    if (!session) {
      session = {
        sessionId: sessionKey,
        userId,
        seriesId,
        episodeId,
        messages: [],
        lastActive: Date.now(),
      };
      sessions.set(sessionKey, session);
      Logger.info(`[ChatbotAgent] Created new ADK session for Series/Session ${seriesId} (User: ${userId})`);
    }

    session.lastActive = Date.now();
    return session;
  }

  /**
   * Clear session history and reset ADK runner session state
   */
  public static async clearSession(userId: string, seriesId: string, episodeId: string = '1'): Promise<void> {
    const sessionId = `${userId}_${seriesId}_${episodeId}`;
    const sessionKey = `${userId}_${seriesId}_${episodeId}`;
    sessions.delete(sessionKey);

    for (const [k, s] of sessions.entries()) {
      if (s.userId === userId && (s.seriesId === seriesId || s.sessionId === seriesId)) {
        sessions.delete(k);
      }
    }

    try {
      const runners = [getOrInitCopilotRunner(), getOrInitWizardRunner()];
      for (const runner of runners) {
        try {
          await (runner as any).sessionService.deleteSession({
            appName: (runner as any).appName,
            userId,
            sessionId,
          });
        } catch {}
      }
      Logger.info(`[ChatbotAgent] Successfully cleared session: ${sessionId}`);
    } catch (err: any) {
      Logger.error(`[ChatbotAgent] Failed to clear session ${sessionId}: ${err.message}`);
    }
  }

  /**
   * Get full series chat history
   */
  public static async getSeriesHistory(userId: string, seriesId: string): Promise<ChatMessage[]> {
    for (const [key, session] of sessions.entries()) {
      if (session.seriesId === seriesId || session.sessionId === seriesId || key.includes(seriesId)) {
        if (session.messages && session.messages.length > 0) {
          return session.messages.map(m => ({
            ...m,
            toolCalls: (m.toolCalls || [])
              .filter((tc, idx, arr) => arr.findIndex(t => t.name === tc.name && (t.status === 'success' || JSON.stringify(t.args) === JSON.stringify(tc.args))) === idx)
              .map(tc => ({
                ...tc,
                status: (tc.status === 'running' ? 'success' : tc.status) as 'running' | 'success' | 'error',
              })),
          }));
        }
      }
    }
    try {
      const db = await getDatabaseProvider();
      const series = await db.getSeriesById(seriesId);
      if (series && (series as any).chat_history && Array.isArray((series as any).chat_history)) {
        const rawHistory: ChatMessage[] = (series as any).chat_history;
        if (rawHistory.length > 0) {
          const history: ChatMessage[] = rawHistory.map(m => ({
            ...m,
            toolCalls: (m.toolCalls || [])
              .filter((tc, idx, arr) => arr.findIndex(t => t.name === tc.name && (t.status === 'success' || JSON.stringify(t.args) === JSON.stringify(tc.args))) === idx)
              .map(tc => ({
                ...tc,
                status: (tc.status === 'running' ? 'success' : tc.status) as 'running' | 'success' | 'error',
              })),
          }));
          const session = await this.getOrCreateSession(userId, seriesId, '1');
          session.messages = [...history];
          return history;
        }
      }
    } catch (err: any) {
      Logger.warn(`[ChatbotAgent] Could not load chat history from DB for series ${seriesId}: ${err.message}`);
    }
    return [];
  }

  /**
   * Transfer temporary wizard session history into a newly created series
   */
  public static async transferSession(userId: string, oldSessionId: string, newSeriesId: string): Promise<number> {
    let sourceMessages: ChatMessage[] = [];
    
    // 1. Check exact or partial session match
    for (const [key, session] of sessions.entries()) {
      if (session.sessionId === oldSessionId || session.seriesId === oldSessionId || key.includes(oldSessionId)) {
        sourceMessages = [...session.messages];
        break;
      }
    }

    // 2. Fallback: if not found, find the most recent wizard session with messages
    if (sourceMessages.length === 0) {
      for (const [key, session] of sessions.entries()) {
        if (key.includes('wiz_') && session.messages && session.messages.length > 0) {
          sourceMessages = [...session.messages];
          break;
        }
      }
    }

    if (sourceMessages.length > 0) {
      const targetSession = await this.getOrCreateSession(userId, newSeriesId, '1');
      for (const msg of sourceMessages) {
        if (!targetSession.messages.some((m) => m.id === msg.id)) {
          targetSession.messages.push(msg);
        }
      }

      // Also persist chat_history to database
      try {
        const db = await getDatabaseProvider();
        await db.updateSeries(newSeriesId, { chat_history: targetSession.messages });
      } catch (e: any) {
        Logger.warn(`[ChatbotAgent] Failed to persist transferred chat_history to DB: ${e.message}`);
      }

      Logger.info(`[ChatbotAgent] Transferred ${sourceMessages.length} messages from ${oldSessionId} to series ${newSeriesId}`);
    }

    return sourceMessages.length;
  }

  /**
   * Stream a chat response using Google ADK Runner with tool calls, multi-turn session persistence, and SSE events
   */
  public static async chatStream(params: {
    userId: string;
    seriesId: string;
    episodeId: string;
    userMessage: string;
    context?: any;
    onChunk: (chunk: string) => void;
    onToolCall?: (toolCall: any) => void;
    onItemUpdated?: (event: any) => void;
    onProgress?: (progress: any) => void;
    onSuggestions?: (suggestions: Array<{ label: string; prompt: string }>) => void;
  }): Promise<{ fullText: string; toolCalls: any[] }> {
    const isWizard = !params.seriesId || params.seriesId.startsWith('wiz_') || params.seriesId.startsWith('temp_');
    const runner = isWizard ? getOrInitWizardRunner() : getOrInitCopilotRunner();
    const appName = (runner as any).appName;
    const sessionId = `${params.userId}_${params.seriesId}_${params.episodeId}`;

    const session = await this.getOrCreateSession(params.userId, params.seriesId, params.episodeId);

    // ─── 1. Ensure ADK Runner Session exists for persistent multi-turn conversation memory ──
    try {
      const existingAdkSession = await (runner as any).sessionService.getSession({
        appName,
        userId: params.userId,
        sessionId,
      });
      if (!existingAdkSession) {
        await (runner as any).sessionService.createSession({
          appName,
          userId: params.userId,
          sessionId,
        });
        Logger.info(`[ChatbotAgent] Initialized persistent ADK session for ${sessionId} in ${appName}`);
      }
    } catch (sErr: any) {
      Logger.warn(`[ChatbotAgent] Session check notice: ${sErr.message}`);
    }

    const userMsgId = `msg_${Date.now()}_user`;
    session.messages.push({
      id: userMsgId,
      role: 'user',
      content: params.userMessage,
      timestamp: Date.now(),
    });

    let fullText = '';
    const executedToolCalls: any[] = [];
    let receivedPartialChunks = false;

    const handleToolCallEvent = (toolCall: any) => {
      const existing = executedToolCalls.find(
        (tc) => (toolCall.id && tc.id === toolCall.id) ||
                (tc.name === toolCall.name && (
                  tc.status === 'running' ||
                  !toolCall.args ||
                  (tc.args?.characterName && tc.args?.characterName === toolCall.args?.characterName && tc.args?.variantId === toolCall.args?.variantId) ||
                  (tc.args?.sceneIndex !== undefined && tc.args?.sceneIndex === toolCall.args?.sceneIndex) ||
                  (tc.args?.locationName && tc.args?.locationName === toolCall.args?.locationName) ||
                  (tc.args?.propName && tc.args?.propName === toolCall.args?.propName) ||
                  JSON.stringify(tc.args) === JSON.stringify(toolCall.args)
                ))
      );
      if (existing) {
        existing.status = toolCall.status;
        if (toolCall.result) existing.result = toolCall.result;
        if (toolCall.args) existing.args = { ...existing.args, ...toolCall.args };
      } else {
        executedToolCalls.push({ ...toolCall });
      }
      params.onToolCall?.(toolCall);
    };

    const wizardSyncInstruction = isWizard
      ? `\n\n[WIZARD MODE DIRECTIVE: You are in Step 3 of the Series Creation Wizard.
- If the creator asks to create the series, launch the project, start episode 1, or enter workspace (e.g. "create series", "launch project", "start project"): Call the \`create_series\` tool with the finalized plan parameters so the series is saved into the database and the workspace opens automatically.
- Otherwise, if discussing or refining the story, characters, or episode arcs: Output the updated Master Plan JSON inside a \`\`\`master_plan \`\`\` code block so the Wizard UI previews it live.]`
      : '';
    const cleanUserMsg = (params.userMessage || '').trim();
    
    // Build live project & episode data context snapshot from database
    const liveContext = await buildLiveContextSnapshot(params.seriesId, params.episodeId, params.context);

    const localizedMessage = `=== LIVE PROJECT & EPISODE CONTEXT ===\n${liveContext}\n=======================================\n\n${cleanUserMsg}\n\n[MANDATORY CONVERSATION DIRECTIVE: You MUST write your entire response, explanations, reasoning thoughts, and suggestions in the EXACT SAME LANGUAGE as the user's message above. If the user is writing in English, respond in English. If the user is writing in Vietnamese, respond in Vietnamese. DO NOT switch conversation language to Spanish, Chinese, or any other language unless the user directly speaks in that language.]${wizardSyncInstruction}`;

    const sanitizeMediaUrl = (text: string) => {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/api\/(?:assets\/file|media)\/)/g, '$1');
    };

    try {
      Logger.info(`[ChatbotAgent] Running ADK session (${sessionId}) for user ${params.userId}...`);

      await runWithChatContext(
        {
          userId: params.userId,
          seriesId: params.seriesId,
          episodeId: params.episodeId,
          contextData: params.context,
          onItemUpdated: params.onItemUpdated,
          onProgress: params.onProgress,
          onToolCall: handleToolCallEvent,
          onChunk: params.onChunk,
        },
        async () => {
          const generator = runner.runAsync({
            userId: params.userId,
            sessionId,
            newMessage: createUserContent(localizedMessage),
            runConfig: {
              streamingMode: StreamingMode.SSE
            }
          });

          for await (const event of generator) {
            const isPartial = Boolean((event as any).partial);
            if (event.content?.parts) {
              for (const part of event.content.parts) {
                if (part.text) {
                  const cleanedText = sanitizeMediaUrl(part.text);
                  if (isPartial) {
                    receivedPartialChunks = true;
                    fullText += cleanedText;
                    params.onChunk(cleanedText);
                  } else if (!receivedPartialChunks) {
                    // Only emit non-partial text if no streaming partial chunks were received
                    fullText += cleanedText;
                    params.onChunk(cleanedText);
                  }
                }

                const p = part as any;
                if (p.functionCall) {
                  const toolName = p.functionCall.name;
                  const toolArgs = p.functionCall.args || {};
                  Logger.info(`[ChatbotAgent-ADK] Tool Call: ${toolName}`, toolArgs);

                  handleToolCallEvent({
                    name: toolName,
                    args: toolArgs,
                    status: 'running' as const,
                  });
                }

                if (p.functionResponse) {
                  const respName = p.functionResponse.name;
                  const respResult = p.functionResponse.response;
                  Logger.info(`[ChatbotAgent-ADK] Tool Response: ${respName}`, respResult);

                  handleToolCallEvent({
                    name: respName,
                    status: respResult?.success !== false ? 'success' : 'error',
                    result: respResult,
                  });
                }
              }
            }

            if (event.errorMessage) {
              Logger.warn(`[ChatbotAgent-ADK] Event error notice (code=${event.errorCode}): ${event.errorMessage}`);
              let userFriendlyErr = event.errorMessage;
              if (userFriendlyErr.includes('RESOURCE_EXHAUSTED') || userFriendlyErr.includes('429') || userFriendlyErr.includes('rate limit')) {
                userFriendlyErr = '⚠️ AI quota or rate limit exceeded (RESOURCE_EXHAUSTED). Please wait a few seconds and retry.';
              } else if (userFriendlyErr.includes('Context variable not found')) {
                userFriendlyErr = `⚠️ Internal prompt error: ${userFriendlyErr}`;
              } else {
                userFriendlyErr = `⚠️ AI execution notice: ${userFriendlyErr}`;
              }
              const formattedErr = `\n\n${userFriendlyErr}`;
              fullText += formattedErr;
              params.onChunk(formattedErr);
            }
          }
        }
      );
    } catch (err: any) {
      Logger.error(`[ChatbotAgent-ADK] Error running ADK runner: ${err.message}`, err);
      let errMsgText = err.message || 'Execution error';
      if (errMsgText.includes('RESOURCE_EXHAUSTED') || errMsgText.includes('429') || errMsgText.includes('rate limit')) {
        errMsgText = '⚠️ AI quota or rate limit exceeded (RESOURCE_EXHAUSTED). Please wait a few seconds and retry.';
      }
      const errMsg = `\n\n❌ ${errMsgText}`;
      fullText += errMsg;
      params.onChunk(errMsg);
    }

    if (!fullText.trim() && executedToolCalls.length === 0) {
      const fallbackNotice = '⚠️ The AI agent did not return a response. Please try rephrasing or clicking retry.';
      fullText = fallbackNotice;
      params.onChunk(fallbackNotice);
    }

    // Extract and emit direct Master Plan JSON data if generated/refined directly in response
    const masterPlanCodeMatch = fullText.match(/```(?:master_plan|json)?\s*(\{[\s\S]*?\})\s*```/i);
    let extractedPlan: any = null;

    if (masterPlanCodeMatch) {
      try {
        const parsed = JSON.parse(masterPlanCodeMatch[1]);
        if (parsed && (parsed.title || parsed.characters || parsed.story_core || parsed.storyCore || parsed.episodes)) {
          extractedPlan = parsed.updated_plan || parsed.updatedPlan || parsed;
        }
      } catch (err: any) {
        Logger.warn(`[ChatbotAgent] Failed to parse code block master_plan JSON: ${err.message}`);
      }
    }

    if (!extractedPlan) {
      const rawJsonMatch = fullText.match(/(\{[\s\S]*?"title"[\s\S]*?(?:"characters"|"story_core"|"episodes")[\s\S]*?\})/i);
      if (rawJsonMatch) {
        try {
          const parsed = JSON.parse(rawJsonMatch[1]);
          if (parsed && parsed.title) {
            extractedPlan = parsed.updated_plan || parsed.updatedPlan || parsed;
          }
        } catch {}
      }
    }

    if (extractedPlan) {
      const targetEpisodes = Number(extractedPlan.total_episodes) || Number(extractedPlan.totalEpisodes) || Number(params.context?.targetEpisodes) || Number(params.context?.totalEpisodes) || (extractedPlan.episodes || []).length || 24;
      extractedPlan.total_episodes = targetEpisodes;
      extractedPlan.totalEpisodes = targetEpisodes;

      const previousEpisodes: any[] = params.context?.currentPlan?.episodes || [];
      const currentEpisodes: any[] = extractedPlan.episodes || [];

      // If user refined the plan (e.g. renamed a character, adjusted tone) and currentEpisodes is partial
      if (currentEpisodes.length < targetEpisodes && previousEpisodes.length >= targetEpisodes) {
        Logger.info(`[ChatbotAgent] Merging refined episodes (${currentEpisodes.length}) into full previous episodes (${previousEpisodes.length})...`);
        const mergedEpisodes = [...previousEpisodes];
        currentEpisodes.forEach((ep: any, idx: number) => {
          const epNum = ep?.episode_number || ep?.episodeNumber;
          if (epNum) {
            const targetIdx = epNum - 1;
            if (targetIdx >= 0 && targetIdx < mergedEpisodes.length) {
              mergedEpisodes[targetIdx] = ep;
            }
          } else if (idx < mergedEpisodes.length) {
            mergedEpisodes[idx] = ep;
          }
        });

        // If character names were updated, synchronize name across all remaining episodes
        const oldChars: any[] = params.context?.currentPlan?.characters || [];
        const newChars: any[] = extractedPlan.characters || [];
        if (oldChars.length > 0 && newChars.length > 0) {
          const nameReplacements: Array<{ oldName: string; newName: string }> = [];
          for (let i = 0; i < Math.min(oldChars.length, newChars.length); i++) {
            if (oldChars[i].name && newChars[i].name && oldChars[i].name !== newChars[i].name) {
              nameReplacements.push({ oldName: oldChars[i].name, newName: newChars[i].name });
            }
          }

          if (nameReplacements.length > 0) {
            mergedEpisodes.forEach((ep: any) => {
              for (const { oldName, newName } of nameReplacements) {
                if (ep.title && ep.title.includes(oldName)) ep.title = ep.title.replaceAll(oldName, newName);
                if (ep.synopsis && ep.synopsis.includes(oldName)) ep.synopsis = ep.synopsis.replaceAll(oldName, newName);
                if (ep.scene_core && ep.scene_core.includes(oldName)) ep.scene_core = ep.scene_core.replaceAll(oldName, newName);
                if (ep.sceneCore && ep.sceneCore.includes(oldName)) ep.sceneCore = ep.sceneCore.replaceAll(oldName, newName);
                if (ep.cliffhanger_hook && ep.cliffhanger_hook.includes(oldName)) ep.cliffhanger_hook = ep.cliffhanger_hook.replaceAll(oldName, newName);
                if (ep.cliffhangerHook && ep.cliffhangerHook.includes(oldName)) ep.cliffhangerHook = ep.cliffhangerHook.replaceAll(oldName, newName);
              }
            });
          }
        }

        extractedPlan.episodes = mergedEpisodes;
      }

      Logger.info(`[ChatbotAgent] Extracted direct Master Plan for "${extractedPlan.title}" (${(extractedPlan.characters || []).length} characters, ${(extractedPlan.episodes || []).length} episodes)`);
      
      // Update memory context snapshot so subsequent turns retain the updated plan
      if (params.context) {
        params.context.currentPlan = extractedPlan;
        if (extractedPlan.title) params.context.title = extractedPlan.title;
        if (extractedPlan.genre) params.context.genre = extractedPlan.genre;
        if (extractedPlan.synopsis) params.context.synopsis = extractedPlan.synopsis;
        if (extractedPlan.country) params.context.country = extractedPlan.country;
        if (extractedPlan.language) params.context.language = extractedPlan.language;
      }

      // Persist to database if series already exists
      if (params.seriesId && !params.seriesId.startsWith('wiz_') && !params.seriesId.startsWith('temp_')) {
        try {
          const db = await getDatabaseProvider();
          await db.updateSeries(params.seriesId, {
            master_plan: extractedPlan,
            title: extractedPlan.title,
            synopsis: extractedPlan.synopsis || extractedPlan.storyCore?.coreAttraction || extractedPlan.story_core?.core_attraction,
            genre: extractedPlan.genre,
            characters: extractedPlan.characters,
          });
          Logger.info(`[ChatbotAgent] Persisted updated master_plan to DB for series ${params.seriesId}`);
        } catch (e: any) {
          Logger.warn(`[ChatbotAgent] Failed to update series master_plan in DB: ${e.message}`);
        }
      }

      params.onItemUpdated?.({ type: 'master_plan_updated', data: extractedPlan });
      params.onItemUpdated?.({ type: 'master_plan_generated', data: extractedPlan });
    }

    // Extract and emit dynamic multilingual suggestions from AI response
    let extractedSuggestions: Array<{ label: string; prompt: string }> = [];
    const suggestionsMatch = fullText.match(/```(?:suggestions|json)?\s*(\[\s*\{[\s\S]*?\}\s*\])\s*```/i);
    if (suggestionsMatch) {
      try {
        const parsed = JSON.parse(suggestionsMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          extractedSuggestions = parsed.filter((p) => p.label && p.prompt);
        }
      } catch (err: any) {
        Logger.warn(`[ChatbotAgent] Failed to parse suggestions block: ${err.message}`);
      }
      fullText = fullText.replace(suggestionsMatch[0], '').trim();
    }

    // If the agent forgot to include a suggestions code block, dynamically generate 3-4 smart action suggestions using Gemini in the EXACT conversation language
    if (extractedSuggestions.length === 0) {
      try {
        const prompt = `Based on the latest user message, executed tools, and AI response below, generate 3 to 4 actionable, contextual next-step suggestion buttons for the creator.

CRITICAL LANGUAGE REQUIREMENT:
- You MUST write the suggestions in the EXACT SAME LANGUAGE as the user message/conversation (e.g. Vietnamese if Vietnamese, English if English).

OUTPUT FORMAT:
- Output ONLY a raw JSON array matching this schema:
[
  { "label": "Short Action Title with Emoji", "prompt": "Complete instruction prompt to execute the next logical step" }
]

User Message: "${params.userMessage}"
Executed Tools: ${executedToolCalls.map(tc => tc.name).join(', ') || 'None'}
AI Response Summary: "${fullText.slice(0, 500)}"`;

        const rawJson = await aiProviderRouter.generateJSON(prompt, {}, {
          systemInstruction: 'You are an AI production assistant that generates 3-4 next-step action suggestion chips in JSON format in the exact language of the conversation.',
        });

        if (rawJson) {
          let items: any[] = [];
          if (Array.isArray(rawJson)) {
            items = rawJson;
          } else if (typeof rawJson === 'object' && Array.isArray((rawJson as any).suggestions)) {
            items = (rawJson as any).suggestions;
          } else if (typeof rawJson === 'object' && Array.isArray((rawJson as any).data)) {
            items = (rawJson as any).data;
          }
          if (items.length > 0) {
            extractedSuggestions = items.filter((p: any) => p && p.label && p.prompt);
          }
        }
      } catch (err: any) {
        Logger.warn(`[ChatbotAgent] Failed to dynamically generate AI suggestions: ${err.message}`);
      }
    }

    if (extractedSuggestions.length > 0) {
      params.onSuggestions?.(extractedSuggestions);
    }

    const finalizedToolCalls = executedToolCalls
      .filter((tc, idx, arr) => arr.findIndex(t => t.name === tc.name && (t.status === 'success' || JSON.stringify(t.args) === JSON.stringify(tc.args))) === idx)
      .map(tc => ({
        ...tc,
        status: (tc.status === 'running' ? 'success' : tc.status) as 'running' | 'success' | 'error',
      }));

    session.messages.push({
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: fullText,
      timestamp: Date.now(),
      toolCalls: finalizedToolCalls,
      suggestions: extractedSuggestions.length > 0 ? extractedSuggestions : undefined,
    });

    if (params.seriesId && !params.seriesId.startsWith('wiz_') && !params.seriesId.startsWith('temp_')) {
      try {
        const db = await getDatabaseProvider();
        await db.updateSeries(params.seriesId, { chat_history: session.messages });
      } catch (e: any) {
        Logger.warn(`[ChatbotAgent] Failed to persist chat history to database for series ${params.seriesId}: ${e.message}`);
      }
    }

    return { fullText, toolCalls: executedToolCalls };
  }
}
