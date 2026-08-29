import { defineStore } from 'pinia';
import http from '@/utils/http';
import { useTimelineStore } from '@/stores/timelineStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { ChatMessage, Command, CostGuardrails } from '@/types/api';
import i18n from '@/i18n';
import { ElMessage } from 'element-plus';

export interface AssistantSuggestion {
  text: string;
  category?: string;
  actionPrompt?: string;
}

export const PAGE_SUGGESTIONS: Record<string, AssistantSuggestion[]> = {
  dashboard: [
    { text: 'Summarize series performance & viewer retention', category: 'Analytics' },
    { text: 'Suggest top 5 viral drama hooks for next series', category: 'Creative' },
    { text: 'Plan a new 24-episode CEO Revenge mini-drama', category: 'Planning' },
    { text: 'Audit credit consumption and render velocity', category: 'System' },
  ],
  wizard: [
    { text: 'Draft 24-episode Master Plan with 3-act arcs', category: 'Planning' },
    { text: 'Create protagonist and antagonist character profiles', category: 'Characters' },
    { text: 'Generate high-tension cliffhangers for every episode', category: 'Creative' },
    { text: 'Suggest optimal visual style & aesthetic prompt', category: 'Visuals' },
  ],
  workspace: [
    { text: 'Breakdown screenplay into 6-second cinematic shots', category: 'Storyboard' },
    { text: 'Generate 8-angle facial consistency anchors for cast', category: 'Cast' },
    { text: 'Auto-mix 3D binaural spatial audio track', category: 'Audio' },
    { text: 'Translate dialogue & generate voiceover dubs', category: 'Voice' },
    { text: 'Auto-generate synchronized subtitle captions', category: 'Captions' },
    { text: 'Move clip 1 to 00:05 and add cliffhanger zoom', category: 'Timeline' },
  ],
  assets: [
    { text: 'Search cinematic stock footage on Pexels', category: 'Stock' },
    { text: 'Generate modern luxury penthouse location asset', category: 'Generation' },
    { text: 'Create custom prop asset with clean background', category: 'Props' },
    { text: 'Audit storage usage and sync missing media', category: 'Storage' },
  ],
  analytics: [
    { text: 'Evaluate viewer drop-off points in Episode 1', category: 'Retention' },
    { text: 'Calculate estimated return on credits for active series', category: 'ROI' },
    { text: 'Compare conversion rates across target countries', category: 'Markets' },
  ],
  settings: [
    { text: 'Audit AI model endpoints and API health', category: 'Diagnostics' },
    { text: 'Check storage adapter and CDN latency', category: 'Infrastructure' },
    { text: 'Configure credit budget guardrails', category: 'Budget' },
  ],
};

export const useChatStore = defineStore('chat', {
  state: () => ({
    isSidebarOpen: localStorage.getItem('shine_assistant_open') === 'true',
    currentPageContext: 'dashboard' as string,
    activeSeriesId: null as string | null,
    activeEpisodeId: null as string | null,
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: 'Hello! I am **Shine Copilot**. I can help you direct stories, generate character anchors, breakdown scenes, mix spatial audio, or manipulate timeline clips.',
        timestamp: Date.now() - 60000,
      },
    ] as ChatMessage[],
    isThinking: false,
    costGuardrails: {
      max_budget_usd: 3.50,
      current_spend_usd: 1.25,
      low_res_proxy_mode: false,
    } as CostGuardrails,
  }),

  getters: {
    currentSuggestions(state): AssistantSuggestion[] {
      const pageKey = state.currentPageContext?.toLowerCase() || 'dashboard';
      return PAGE_SUGGESTIONS[pageKey] || PAGE_SUGGESTIONS.dashboard;
    },
  },

  actions: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
      localStorage.setItem('shine_assistant_open', String(this.isSidebarOpen));
    },

    openSidebar() {
      this.isSidebarOpen = true;
      localStorage.setItem('shine_assistant_open', 'true');
    },

    closeSidebar() {
      this.isSidebarOpen = false;
      localStorage.setItem('shine_assistant_open', 'false');
    },

    setPageContext(context: string, seriesId?: string, episodeId?: string) {
      this.currentPageContext = context;
      if (seriesId) this.activeSeriesId = seriesId;
      if (episodeId) this.activeEpisodeId = episodeId;
    },

    resetConversation() {
      const pageName = this.currentPageContext.toUpperCase();
      this.messages = [
        {
          id: `msg-welcome-${Date.now()}`,
          role: 'assistant',
          content: `Welcome to **Shine Assistant** (${pageName} context). How can I assist you with your production workflow today?`,
          timestamp: Date.now(),
        },
      ];
      ElMessage.info('Assistant conversation reset.');
    },

    async sendMessage(content: string, attachments?: string[]) {
      if (!content.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments,
      };
      this.messages.push(userMsg);

      this.isThinking = true;
      try {
        const payload = {
          prompt: content,
          sessionId: `session-${this.currentPageContext}`,
          seriesId: this.activeSeriesId || 'series-001',
          episodeId: this.activeEpisodeId || undefined,
          pageContext: this.currentPageContext,
        };

        const res = (await http.post('/ai/assistant/command-edit', payload)) as any;
        const data = res.data?.data || res.data;
        const commands: Command[] = data?.commands || [];
        const responseMessage = data?.responseMessage || data?.reply || 'Processed your request successfully.';

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: responseMessage,
          timestamp: Date.now(),
          commands,
        };
        this.messages.push(assistantMsg);

        // Dispatch commands to OpenVideo core & timeline store if in workspace
        const timelineStore = useTimelineStore();
        if (commands.length > 0) {
          commands.forEach((cmd: any) => {
            try {
              if (cmd.type === 'clip.update' || cmd.type === 'MOVE_CLIP' || cmd.type === 'ADJUST_VOLUME') {
                const clipId = cmd.payload?.clipId || 'clip_vid_01';
                const patch = cmd.payload?.patch || { startTime: cmd.payload?.newStartTime || 5 };
                timelineStore.clipUpdate(clipId, patch);
              } else if (cmd.type === 'clip.split' || cmd.type === 'SPLIT_CLIP') {
                const clipId = cmd.payload?.clipId || 'clip_vid_01';
                const splitSec = (cmd.payload?.splitTimeUs ? cmd.payload.splitTimeUs / 1000000 : cmd.payload?.splitTime) || 3.0;
                timelineStore.clipSplit(clipId, splitSec);
              } else if (cmd.type === 'clip.add' || cmd.type === 'ADD_EFFECT') {
                if (cmd.payload?.clip) {
                  timelineStore.clipAdd(cmd.payload.trackId || 'track_video_01', cmd.payload.clip);
                }
              }
            } catch (cmdErr) {
              console.warn('[ChatStore] Command execution notice:', cmdErr);
            }
          });

          // Trigger visual outline glow animation on affected timeline clips
          const affectedClips = document.querySelectorAll('.timeline-clip-active, .selected-clip');
          affectedClips.forEach((el) => {
            el.classList.add('animate-pulse-glow');
            setTimeout(() => el.classList.remove('animate-pulse-glow'), 1500);
          });

          // Broadcast patch to collaborators
          const collabStore = useCollaborationStore();
          collabStore.broadcastLocalPatch(commands);
        }

        ElMessage.success(i18n.global.t('toast.commandExecuted') || 'Assistant command executed!');
      } catch (err: any) {
        ElMessage.error(err.message || 'Failed to communicate with Shine Assistant');
      } finally {
        this.isThinking = false;
      }
    },

    async searchMemory(query: string) {
      try {
        const res = (await http.get(`/ai/assistant/memory/search?query=${encodeURIComponent(query)}`)) as any;
        ElMessage.info(i18n.global.t('toast.memorySearched') || 'Searched series knowledge base.');
        return res.data?.data?.results || [];
      } catch (err: any) {
        ElMessage.error('Memory search failed');
        return [];
      }
    },

    async fetchCostGuardrails() {
      try {
        const res = (await http.get('/admin/cost-guardrails')) as any;
        if (res.data?.data) {
          this.costGuardrails = res.data.data;
        }
      } catch (e) {
        // Keep default guardrails
      }
    },
  },
});
