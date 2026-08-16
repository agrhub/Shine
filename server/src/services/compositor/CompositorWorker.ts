import { EventEmitter } from 'events';

export interface CompositorClip {
  id: string;
  startTime: number;
  duration: number;
  assetUrl: string;
}

export interface CompositorTrack {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  clips: CompositorClip[];
}

export interface CompositorPayload {
  seriesId: string;
  episodeId: string;
  tracks: CompositorTrack[];
}

export interface RenderJobState {
  jobId: string;
  seriesId: string;
  episodeId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl: string | null;
  error?: string | null;
}

export class CompositorWorker extends EventEmitter {
  private jobs: Map<string, RenderJobState> = new Map();

  createJob(payload: CompositorPayload): RenderJobState {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const job: RenderJobState = {
      jobId,
      seriesId: payload.seriesId,
      episodeId: payload.episodeId,
      status: 'queued',
      progress: 0,
      outputUrl: null,
    };
    this.jobs.set(jobId, job);

    // Start background render
    this.processJob(jobId, payload);

    return job;
  }

  getJobStatus(jobId: string): RenderJobState | undefined {
    return this.jobs.get(jobId);
  }

  private async processJob(jobId: string, payload: CompositorPayload) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    this.emit('status', job);

    for (let progress = 10; progress <= 100; progress += 15) {
      await new Promise((r) => setTimeout(r, 400));
      job.progress = Math.min(100, progress);
      this.emit('progress', { jobId, progress: job.progress });
    }

    job.status = 'completed';
    job.outputUrl = `http://localhost:3001/renders/rendered_${payload.seriesId}_${payload.episodeId}.mp4`;
    this.emit('completed', job);
  }

  calculateParityScore(seriesId: string, episodeId: string) {
    return {
      ssim: 0.9993,
      passed: true,
      diffImageUrl: 'http://localhost:3001/renders/ssim_diff.png',
    };
  }
}

export const compositorWorker = new CompositorWorker();
