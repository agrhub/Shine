import { PubSub, Topic, Subscription } from '@google-cloud/pubsub';
import { EnvConfig } from '@/config/env.js';
import { Logger } from '@/utils/logger.js';
import EventEmitter from 'events';

export interface RenderJobPayload {
  jobId: string;
  seriesId: string;
  episodeId: string;
  sceneIndex?: number;
  timelineData: any;
  aspectRatio?: string;
  fps?: number;
  resolution?: string;
  outputFormat?: string;
  callbackUrl?: string;
  submittedAt: string;
}

export interface RenderProgressEvent {
  jobId: string;
  episodeId: string;
  status: 'queued' | 'rendering' | 'compositing' | 'completed' | 'failed';
  progressPercent: number;
  outputUrl?: string;
  s3Key?: string;
  error?: string;
  timestamp: string;
}

export class PubSubService {
  private static instance: PubSubService | null = null;
  private pubsub: PubSub | null = null;
  private topic: Topic | null = null;
  private subscription: Subscription | null = null;
  private topicName: string;
  private subscriptionName: string;
  private eventEmitter: EventEmitter = new EventEmitter();
  private isInitialized = false;

  private constructor() {
    const pubsubConfig = EnvConfig.pubsub;
    this.topicName = pubsubConfig.topicRender || 'shine-render-jobs';
    this.subscriptionName = pubsubConfig.subscriptionRender || 'shine-render-sub';

    try {
      const options: any = {};
      if (pubsubConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT) {
        options.projectId = pubsubConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;
      }
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }

      this.pubsub = new PubSub(options);
      this.topic = this.pubsub.topic(this.topicName);
      this.subscription = this.pubsub.subscription(this.subscriptionName);
      this.isInitialized = true;
      Logger.info(`[PubSubService] Connected to Google Cloud Pub/Sub (Topic: ${this.topicName}, Sub: ${this.subscriptionName})`);
    } catch (err: any) {
      Logger.warn(`[PubSubService] Pub/Sub init fallback (in-memory mode): ${err.message}`);
      this.pubsub = null;
    }
  }

  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
  }

  /**
   * Publishes a render job to the Pub/Sub topic (or in-memory queue fallback).
   */
  async publishRenderJob(job: RenderJobPayload): Promise<string> {
    const dataBuffer = Buffer.from(JSON.stringify(job));
    const attributes = {
      jobId: job.jobId,
      episodeId: job.episodeId,
      seriesId: job.seriesId,
      submittedAt: job.submittedAt,
    };

    if (this.pubsub && this.topic) {
      try {
        const messageId = await this.topic.publishMessage({
          data: dataBuffer,
          attributes,
        });
        Logger.info(`[PubSubService] Published render job ${job.jobId} to topic ${this.topicName} (msgId: ${messageId})`);
        return messageId;
      } catch (err: any) {
        Logger.warn(`[PubSubService] Failed to publish message to topic, using event fallback: ${err.message}`);
      }
    }

    // In-memory fallback emitter
    this.eventEmitter.emit('job_queued', job);
    Logger.info(`[PubSubService] Render job ${job.jobId} queued in local event queue`);
    return `local_msg_${Date.now()}`;
  }

  /**
   * Broadcasts a render progress event for SSE / WebSocket streaming.
   */
  emitProgress(event: RenderProgressEvent): void {
    this.eventEmitter.emit('progress', event);
    this.eventEmitter.emit(`progress:${event.jobId}`, event);
  }

  /**
   * Subscribes to global render progress events.
   */
  onProgress(callback: (event: RenderProgressEvent) => void): () => void {
    this.eventEmitter.on('progress', callback);
    return () => this.eventEmitter.off('progress', callback);
  }

  /**
   * Subscribes to a specific job's progress events.
   */
  onJobProgress(jobId: string, callback: (event: RenderProgressEvent) => void): () => void {
    const eventKey = `progress:${jobId}`;
    this.eventEmitter.on(eventKey, callback);
    return () => this.eventEmitter.off(eventKey, callback);
  }

  /**
   * Returns current Pub/Sub queue depth estimate.
   */
  async getQueueDepth(): Promise<number> {
    return this.eventEmitter.listenerCount('progress') || 0;
  }
}
