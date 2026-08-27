import { getDatabaseProvider } from '~/database/index.js';
import { Logger } from '~/utils/logger.js';
import { EnvConfig } from '~/config/env.js';
import {
  createChatbotTools,
  createMasterPlanTools,
  createProductionPipelineTools,
  createTimelineEditorTools,
} from './chatbot/tools.js';
import {
  getRootAgentInstruction,
  getMasterPlanAgentInstruction,
  getProductionPipelineAgentInstruction,
  getTimelineEditorAgentInstruction,
} from './chatbot/prompts.js';
import { createUserContent } from '@google/genai';
import { InMemoryRunner, LlmAgent, StreamingMode, isFinalResponse } from '@google/adk';
import { PromptLoader } from '~/utils/PromptLoader.js';
import { loadSkill } from '~/utils/SkillLoader.js';
import { getLanguageForCountry } from '~/utils/LanguageMapping.js';
import { GeminiClient, GEMINI_SUPPORTED_VOICES, geminiClient } from '~/integrations/ai/gemini/GeminiClient.js';
import { afterTool, beforeTool, rateLimitCallback } from './chatbot/callback.js';

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
   * Build comprehensive System Instruction with full episode context
   */
  private static async buildSystemInstruction(seriesId?: string, episodeId?: string, context?: any): Promise<string> {
    try {
      const db = await getDatabaseProvider();
      const series = seriesId ? await db.getSeriesById(seriesId) : null;
      const episode = episodeId ? await db.getEpisodeById(episodeId) : null;

      const skeletonSkill = loadSkill('script_skeleton');
      const refineSkill = loadSkill('script_refine_master_plan');

      if (!series && !episode) {
        const totalEpisodes = Number(context?.target_episodes || context?.targetEpisodes || context?.total_episodes || context?.totalEpisodes || 24);
        const totalDurationSeconds = Math.min(Math.max(Number(context?.episode_duration_seconds || context?.episodeDurationSeconds || 60), 30), 600);
        const durationDisplay = `${Math.floor(totalDurationSeconds / 60)}m ${totalDurationSeconds % 60 ? `${totalDurationSeconds % 60}s` : ''}`.trim();
        // Country = Cultural & Geographical Setting (Bối cảnh câu chuyện)
        const country = context?.country || 'United States';
        // Language = Script & Dialogue Output Language (Ngôn ngữ kịch bản đầu ra, độc lập với bối cảnh)
        const scriptLanguage = context?.language || 'en-US';
        const langInfo = getLanguageForCountry(scriptLanguage);
        const visualStyle = context?.visual_style || context?.visualStyle || 'Cinematic';
        const visualStylePrompt = context?.visual_style_prompt || context?.visualStylePrompt || '';
        const title = context?.title || 'Original Micro-Drama';
        const genre = context?.genre || 'Drama';
        const synopsis = context?.synopsis || 'High-stakes dramatic series';
        const ratio = context?.ratio || '9:16';
        const viralTopic = context?.viral_topic || context?.viralTopic || '';

        const maleVoicesCatalog = GEMINI_SUPPORTED_VOICES
          .filter((v: any) => v.gender === 'male')
          .map((v: any) => `  * "${v.id}": ${v.description}`)
          .join('\n');
        const femaleVoicesCatalog = GEMINI_SUPPORTED_VOICES
          .filter((v: any) => v.gender === 'female')
          .map((v: any) => `  * "${v.id}": ${v.description}`)
          .join('\n');
        const neutralVoicesCatalog = GEMINI_SUPPORTED_VOICES
          .filter((v: any) => v.gender === 'neutral')
          .map((v: any) => `  * "${v.id}": ${v.description}`)
          .join('\n');

        const voiceCatalog = [
          '  [Male Voices]',
          maleVoicesCatalog,
          '  [Female Voices]',
          femaleVoicesCatalog,
          '  [Neutral Voices]',
          neutralVoicesCatalog,
        ].join('\n');

        const corePrompt = PromptLoader.render('skeleton/story_skeleton_core', {
          totalEpisodes,
          totalDurationSeconds,
          durationDisplay,
          country,
          languageName: langInfo.name,
          languageNativeName: langInfo.nativeName,
          languageCode: context?.language || langInfo.code,
          languageInstruction: langInfo.promptInstruction,
          title,
          genre,
          visualStyle,
          visualStylePrompt,
          synopsis,
          ratio,
          viralTopic,
          voiceCatalog,
          episodeScopeInstruction: `CRITICAL MANDATE: You MUST generate all ${totalEpisodes} serialized episodes in the episodes array (numbered 1 through ${totalEpisodes}) without omitting, truncating, summarizing, or stopping early.`,
        });

        const creativeDirectorPrompt = PromptLoader.render('chatbot/creative_director', {
          seriesId: context?.series_id || context?.seriesId || 'series_preview',
          seriesTitle: title,
          seriesGenre: genre,
          seriesVisualStyle: visualStyle,
          seriesVisualStylePrompt: visualStylePrompt,
          country,
          language: langInfo.name,
          ratio,
          totalEpisodes,
          totalDurationSeconds,
          synopsis,
        });

        return `${creativeDirectorPrompt}\n\n=== STORY PROJECT PARAMETERS & CORE DIRECTIVES ===\n${corePrompt}\n\n=== CANONICAL STORY SKELETON SKILL (SCRIPT ARCHITECT) ===\n${skeletonSkill}\n\n=== SCRIPT REFINEMENT SKILL ===\n${refineSkill}`;
      }

      const script = episode?.script ? (typeof episode.script === 'string' ? JSON.parse(episode.script) : episode.script) : {};
      const characters = episode?.characters || script.characters || series?.characters || [];
      const locations = episode?.locations || script.locations || series?.locations || [];
      const props = episode?.props || script.props || series?.props || [];
      const scenes = episode?.scenes || script.scenes || [];

      const charactersSummary = characters.map((c: any) => `${c.name} [Image: ${c.imageUrl ? 'YES' : 'NO'}, Wardrobes: ${c.wardrobeVariants?.length || 0}]`).join(', ') || 'None';
      const locationsSummary = locations.map((l: any) => `${l.name} [Image: ${l.imageUrl ? 'YES' : 'NO'}]`).join(', ') || 'None';
      const propsSummary = props.map((p: any) => p.name || p).join(', ') || 'None';
      const scenesSummary = scenes.map((s: any) => `  Scene #${s.index}: ${s.setting || ''} | Dialogue: "${(s.dialogue || '').slice(0, 30)}..." | Storyboard: ${s.storyboardFrameUrl ? 'YES' : 'NO'} | Video: ${s.videoUrl ? 'YES' : 'NO'} | Audio: ${s.audioUrl ? 'YES' : 'NO'}`).join('\n') || '  No scenes loaded yet.';

      const baseInstruction = getRootAgentInstruction({
        seriesId,
        episodeId,
        seriesTitle: series?.title || context?.title || 'Untitled Series',
        genre: series?.genre || context?.genre || 'Drama',
        visualStyle: series?.visual_style || context?.visualStyle || 'Cinematic',
        language: context?.language || (series as any)?.language || 'en-US',
        country: context?.country || (series as any)?.country || 'United States',
        context,
      });

      const copilotMain = PromptLoader.render('chatbot/copilot_agent', {
        seriesTitle: series?.title || context?.title || 'Untitled',
        seriesGenre: series?.genre || context?.genre || 'Drama',
        seriesVisualStyle: series?.visual_style || context?.visualStyle || 'Cinematic',
        seriesVisualStylePrompt: series?.visual_style_prompt || context?.visualStylePrompt || '',
        seriesTargetDuration: series?.master_plan?.totalDurationSeconds || context?.episodeDurationSeconds || (series as any)?.episode_duration || 90,
        episodeNumber: episode?.episode_number || 1,
        episodeTitle: episode?.title || 'Untitled',
        charactersCount: characters.length,
        charactersSummary,
        locationsCount: locations.length,
        locationsSummary,
        propsCount: props.length,
        propsSummary,
        scenesCount: scenes.length,
        scenesSummary,
      });

      return `${baseInstruction}\n\n=== LIVE EPISODE & ASSET CONTEXT ===\n${copilotMain}\n\n=== SCRIPT REFINEMENT SKILL ===\n${refineSkill}`;
    } catch {
      return getRootAgentInstruction({ seriesId, episodeId, context });
    }
  }

  /**
   * Stream a chat response using Google ADK Runner with tool calls and live events
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
    const session = await this.getOrCreateSession(params.userId, params.seriesId, params.episodeId);
    const systemInstruction = await this.buildSystemInstruction(params.seriesId, params.episodeId, params.context);

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

    const isWizard = !params.seriesId || params.seriesId.startsWith('wiz_') || params.seriesId.startsWith('temp_');
    const toolContext = {
      userId: params.userId,
      seriesId: params.seriesId,
      episodeId: params.episodeId,
      context: params.context,
      onChunk: params.onChunk,
      onProgress: params.onProgress,
      onItemUpdated: params.onItemUpdated,
      onToolCall: handleToolCallEvent,
    };

    const agentContext = {
      userId: params.userId,
      seriesId: params.seriesId,
      episodeId: params.episodeId,
      context: params.context,
    };

    // Sub-Agent 1: Master Plan & Story Architect
    const masterPlanAgent = new LlmAgent({
      name: 'master_plan_agent',
      description: 'Shine AI Master Screenplay & Series Architect: Designs character profiles, 3-act story hooks, episodic breakdowns, and verifies compliance.',
      model: EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro',
      instruction: getMasterPlanAgentInstruction(agentContext),
      tools: createMasterPlanTools(toolContext),
    });

    // Sub-Agent 2: Production Pipeline & Asset Specialist
    const productionPipelineAgent = new LlmAgent({
      name: 'production_pipeline_agent',
      description: 'Shine AI Production Pipeline Specialist: Generates character art, location shots, storyboards, voiceovers, video clips, and final video rendering.',
      model: EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro',
      instruction: getProductionPipelineAgentInstruction(agentContext),
      tools: isWizard ? [] : createProductionPipelineTools(toolContext),
    });

    // Sub-Agent 3: Timeline & Studio Editor
    const timelineEditorAgent = new LlmAgent({
      name: 'timeline_editor_agent',
      description: 'Shine AI Studio Video Editor: Modifies video timeline, trims clips, overlays text, applies transitions/effects, and syncs subtitles.',
      model: EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro',
      instruction: getTimelineEditorAgentInstruction(agentContext),
      tools: isWizard ? [] : createTimelineEditorTools(toolContext),
    });

    // Root Agent: Main Orchestrator
    const rootAgent = new LlmAgent({
      name: isWizard ? 'shine_master_plan_architect' : 'shine_copilot_agent',
      description: isWizard ? 'Shine AI Master Screenplay & Series Architect' : 'Shine AI Production Director Copilot Agent',
      model: EnvConfig.geminiModelAgent || EnvConfig.geminiModelText || 'gemini-2.5-pro',
      instruction: systemInstruction,
      tools: isWizard ? createMasterPlanTools(toolContext) : createChatbotTools(toolContext),
      subAgents: [masterPlanAgent, productionPipelineAgent, timelineEditorAgent],
      beforeToolCallback: beforeTool,
      afterToolCallback: afterTool,
      beforeModelCallback: rateLimitCallback,
    });

    const runner = new InMemoryRunner({
      agent: rootAgent,
      appName: 'shine_studio',
    });

    const wizardSyncInstruction = isWizard
      ? `\n\n(CRITICAL REQUIREMENT: If the user approves or confirms to proceed, call create_series. Otherwise, if refining the plan, output the revised Master Plan JSON inside a \`\`\`master_plan \`\`\` code block.)`
      : '';
    const cleanUserMsg = (params.userMessage || '').trim();
    const localizedMessage = `${cleanUserMsg}\n\n[MANDATORY CONVERSATION DIRECTIVE: You MUST write your entire response, explanations, reasoning thoughts, and suggestions in the EXACT SAME LANGUAGE as the user's message above. If the user is writing in English, respond in English. If the user is writing in Vietnamese, respond in Vietnamese. DO NOT switch conversation language to Spanish, Chinese, or any other language unless the user directly speaks in that language.]${wizardSyncInstruction}`;

    const sanitizeMediaUrl = (text: string) => {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/api\/(?:assets\/file|media)\/)/g, '$1');
    };

    try {
        Logger.info(`[ChatbotAgent] Running Google ADK agent for user ${params.userId}...`);

        const generator = runner.runEphemeral({
          userId: params.userId,
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
        }
      } catch (err: any) {
        Logger.error(`[ChatbotAgent-ADK] Error running ADK runner: ${err.message}`, err);
        const errMsg = `\n\n❌ **Error:** ${err.message || 'Execution error'}`;
        fullText += errMsg;
        params.onChunk(errMsg);
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

        const rawJson = await geminiClient.generateText({
          prompt,
          systemInstruction: 'You are an AI production assistant that generates 3-4 next-step action suggestion chips in JSON format in the exact language of the conversation.',
          jsonMode: true,
        });

        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            extractedSuggestions = parsed.filter((p: any) => p.label && p.prompt);
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
