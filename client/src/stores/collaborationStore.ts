import { defineStore } from 'pinia';
import { useWebSocket } from '@/composables/useWebSocket';
import { useTimelineStore } from '@/stores/timelineStore';
import type { CollaboratorSession, PatchEvent, Command } from '@/types/api';
import i18n from '@/i18n';
import { ElNotification } from 'element-plus';

export const useCollaborationStore = defineStore('collaboration', {
  state: () => ({
    seriesId: 'series-001',
    activeUsers: [] as CollaboratorSession[],
    isConnected: false,
    wsComposable: null as any,
  }),

  actions: {
    initCollaboration(seriesId: string) {
      this.seriesId = seriesId;
      const ws = useWebSocket();
      this.wsComposable = ws;

      ws.connect(seriesId, {
        user_id: `user-${Math.random().toString(36).substr(2, 5)}`,
        name: `Editor ${Math.floor(Math.random() * 100)}`,
      });

      this.isConnected = ws.isConnected.value;

      ws.onPatchReceive((event: PatchEvent) => {
        this.applyRemotePatch(event);
      });
    },

    applyRemotePatch(event: PatchEvent) {
      const timelineStore = useTimelineStore();
      if (event.commands && Array.isArray(event.commands)) {
        event.commands.forEach((cmd: Command) => {
          if (cmd.target_module === 'timeline') {
            if (cmd.type === 'MOVE_CLIP' || cmd.type === 'clip.update') {
              const startSec = cmd.payload.newStartTime ?? cmd.payload.startTime ?? 5;
              const durationSec = cmd.payload.duration ?? 5;
              timelineStore.clipUpdate(cmd.payload.clipId || 'clip-v1', {
                display: { from: startSec * 1_000_000, to: (startSec + durationSec) * 1_000_000 },
              });
            } else if (cmd.type === 'SPLIT_CLIP' || cmd.type === 'clip.split') {
              timelineStore.clipSplit(cmd.payload.clipId || 'clip-v1', cmd.payload.splitTime || 3.5);
            }
          }
        });
      }

      const toastMessage = i18n.global.t('toast.collaboratorJoined', { name: `Editor (${event.user_id.substring(0, 4)})` });
      ElNotification({
        title: 'Real-time Patch Received',
        message: toastMessage,
        type: 'info',
        duration: 3000,
      });
    },

    broadcastLocalPatch(commands: Command[]) {
      if (this.wsComposable) {
        this.wsComposable.broadcastPatch(this.seriesId, commands);
      }
    },
  },
});
