import { defineStore } from 'pinia';
import http from '@/utils/http';
import { useTimelineStore } from '@/stores/timelineStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import type { ChatMessage, Command, CostGuardrails } from '@/types/api';
import i18n from '@/i18n';
import { ElMessage } from 'element-plus';

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: 'Hello! I am AI Director. Ask me to move clips, add cliffhangers, or refine scene pacing.',
        timestamp: Date.now() - 60000,
      },
    ] as ChatMessage[],
    isThinking: false,
    suggestions: [
      'Move clip 1 to 00:05',
      'Add cliffhanger zoom at end',
      'Auto-trim quiet pauses in audio',
      'Enhance character lighting',
    ] as string[],
    costGuardrails: {
      maxBudgetUsd: 3.50,
      currentSpendUsd: 1.25,
      lowResProxyMode: false,
    } as CostGuardrails,
  }),

  actions: {
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
        const res = (await http.post('/ai/assistant/command-edit', {
          prompt: content,
          sessionId: 'session-edit-001',
          seriesId: 'series-001',
        })) as any;

        const data = res.data?.data;
        const commands: Command[] = data?.commands || [];
        const responseMessage = data?.responseMessage || 'Executed timeline update command.';

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: responseMessage,
          timestamp: Date.now(),
          commands,
        };
        this.messages.push(assistantMsg);

        // Dispatch commands to OpenVideo core & timeline store
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

        if (data?.promptChips && data.promptChips.length > 0) {
          this.suggestions = data.promptChips.map((c: any) => c.actionPrompt || c.label);
        }

        ElMessage.success(i18n.global.t('toast.commandExecuted') || 'AI Director command executed on timeline!');

      } catch (err: any) {
        ElMessage.error(err.message || 'Failed to communicate with AI Director');
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

    async fetchSuggestions() {
      try {
        const res = (await http.get('/ai/assistant/suggestions')) as any;
        if (res.data?.data?.suggestions) {
          this.suggestions = res.data.data.suggestions;
        }
      } catch (e) {
        // Fallback default suggestions retained
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
