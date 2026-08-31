import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import type { PatchEvent, Command, CollaboratorSession } from '@/types/api';

const socketRef = ref<Socket | null>(null);
const isConnected = ref(false);
const activeCollaborators = ref<CollaboratorSession[]>([]);

export function useWebSocket() {
  const connect = (seriesId: string, user?: Partial<CollaboratorSession>) => {
    if (socketRef.value?.connected) {
      socketRef.value.emit('join:series', { seriesId, user });
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      isConnected.value = true;
      socket.emit('join:series', { seriesId, user });
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.on('collaborator:update', (users: CollaboratorSession[]) => {
      activeCollaborators.value = users;
    });

    socketRef.value = socket;
  };

  const broadcastPatch = (seriesId: string, commands: Command[], sessionId: string = 'session-1', userId: string = 'user-1') => {
    if (!socketRef.value || !isConnected.value) return;
    const event: PatchEvent = {
      user_id: userId,
      session_id: sessionId,
      series_id: seriesId,
      commands,
      timestamp: Date.now(),
    };
    socketRef.value.emit('patch:broadcast', event);
  };

  const onPatchReceive = (callback: (event: PatchEvent) => void) => {
    if (!socketRef.value) return;
    socketRef.value.on('patch:receive', callback);
  };

  const onPipelineJobUpdated = (callback: (job: any) => void) => {
    if (!socketRef.value) return;
    socketRef.value.on('pipeline_job:updated', callback);
  };

  const onPipelineJobCompleted = (callback: (job: any) => void) => {
    if (!socketRef.value) return;
    socketRef.value.on('pipeline_job:completed', callback);
  };

  const onEpisodeUpdated = (callback: (episode: any) => void) => {
    if (!socketRef.value) return;
    socketRef.value.on('episode:updated', callback);
  };

  const onChatMessage = (callback: (data: { sessionId: string; message: any }) => void) => {
    if (!socketRef.value) return;
    socketRef.value.on('chat:message', callback);
  };

  const disconnect = (seriesId?: string) => {
    if (socketRef.value) {
      if (seriesId) {
        socketRef.value.emit('leave:series', seriesId);
      }
      socketRef.value.disconnect();
      socketRef.value = null;
      isConnected.value = false;
    }
  };

  onUnmounted(() => {
    // Keep connection alive across sub-components unless explicitly torn down
  });

  return {
    isConnected,
    activeCollaborators,
    connect,
    broadcastPatch,
    onPatchReceive,
    onPipelineJobUpdated,
    onPipelineJobCompleted,
    onEpisodeUpdated,
    onChatMessage,
    disconnect,
  };
}
