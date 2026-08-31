import { Server, Socket } from 'socket.io';

export interface CommandPayload {
  type: string;
  targetModule: string;
  payload: any;
}

export interface PatchEvent {
  userId: string;
  sessionId: string;
  seriesId: string;
  commands: CommandPayload[];
  timestamp: number;
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  joinedAt: number;
}

export class PatchSyncService {
  private static instance: PatchSyncService | null = null;
  private io: Server;
  private roomCollaborators: Map<string, Map<string, CollaboratorInfo>> = new Map();

  constructor(io: Server) {
    this.io = io;
    PatchSyncService.instance = this;
    this.initListeners();
  }

  public static getInstance(): PatchSyncService | null {
    return PatchSyncService.instance;
  }

  public static broadcast(seriesId: string, eventName: string, data: any) {
    if (PatchSyncService.instance) {
      PatchSyncService.instance.io.to(`series:${seriesId}`).emit(eventName, data);
      PatchSyncService.instance.io.emit(eventName, data);
    }
  }

  private initListeners() {
    this.io.on('connection', (socket: Socket) => {
      let currentSeriesId: string | null = null;

      socket.on('join:series', (data: { seriesId: string; user?: Partial<CollaboratorInfo> }) => {
        const { seriesId, user } = data;
        currentSeriesId = seriesId;
        socket.join(`series:${seriesId}`);

        const userInfo: CollaboratorInfo = {
          userId: user?.userId || socket.id,
          name: user?.name || `Editor ${socket.id.substring(0, 4)}`,
          avatarUrl: user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
          color: user?.color || '#3ecf8e',
          joinedAt: Date.now(),
        };

        if (!this.roomCollaborators.has(seriesId)) {
          this.roomCollaborators.set(seriesId, new Map());
        }
        this.roomCollaborators.get(seriesId)!.set(socket.id, userInfo);

        const activeUsers = Array.from(this.roomCollaborators.get(seriesId)!.values());
        this.io.to(`series:${seriesId}`).emit('collaborator:update', activeUsers);
      });

      socket.on('patch:broadcast', (event: PatchEvent) => {
        if (!event || !event.seriesId) return;
        const validatedEvent: PatchEvent = {
          ...event,
          timestamp: event.timestamp || Date.now(),
        };
        socket.to(`series:${event.seriesId}`).emit('patch:receive', validatedEvent);
      });

      socket.on('render:progress', (data: { seriesId: string; episodeId: string; progress: number; status: string }) => {
        if (data.seriesId) {
          this.io.to(`series:${data.seriesId}`).emit('render:progress', data);
        }
      });

      socket.on('leave:series', (seriesId: string) => {
        socket.leave(`series:${seriesId}`);
        if (this.roomCollaborators.has(seriesId)) {
          this.roomCollaborators.get(seriesId)!.delete(socket.id);
          const activeUsers = Array.from(this.roomCollaborators.get(seriesId)!.values());
          this.io.to(`series:${seriesId}`).emit('collaborator:update', activeUsers);
        }
      });

      socket.on('disconnect', () => {
        if (currentSeriesId && this.roomCollaborators.has(currentSeriesId)) {
          this.roomCollaborators.get(currentSeriesId)!.delete(socket.id);
          const activeUsers = Array.from(this.roomCollaborators.get(currentSeriesId)!.values());
          this.io.to(`series:${currentSeriesId}`).emit('collaborator:update', activeUsers);
        }
      });
    });
  }

  public broadcastToSeries(seriesId: string, eventName: string, data: any) {
    this.io.to(`series:${seriesId}`).emit(eventName, data);
  }
}
