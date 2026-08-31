import os from 'os';
import { VideoRenderer, RenderOptions } from '@openvideo/video-renderer';
import { nanoid } from 'nanoid';

export interface RendererPoolOptions {
  minInstances?: number;
  maxInstances?: number;
  maxRendersPerInstance?: number;
  idleTimeoutMs?: number;
}

export interface PooledRendererInstance {
  id: string;
  renderer: VideoRenderer;
  busy: boolean;
  rendersCount: number;
  createdAt: number;
  lastUsedAt: number;
  isInitializing: boolean;
}

export interface QueuedRenderJob {
  id: string;
  project: any;
  options?: RenderOptions;
  resolve: (buffer: Buffer) => void;
  reject: (err: any) => void;
  enqueuedAt: number;
}

export class VideoRendererPool {
  private static instance: VideoRendererPool | null = null;
  private instances: PooledRendererInstance[] = [];
  private jobQueue: QueuedRenderJob[] = [];
  private minInstances: number;
  private maxInstances: number;
  private maxRendersPerInstance: number;
  private idleTimeoutMs: number;
  private totalRendersCompleted = 0;
  private isShuttingDown = false;

  constructor(options: RendererPoolOptions = {}) {
    // 1. Calculate dynamic capacity based on available system Memory and CPU
    const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
    const cpuCount = os.cpus()?.length || 2;
    const memPerInstanceMB = 650; // Each Chromium instance with WebCodecs uses ~500-750MB
    const safeMaxByMem = Math.max(1, Math.floor((totalMemMB - 350) / memPerInstanceMB));
    const safeMaxByCpu = Math.max(1, cpuCount * 2);
    const calculatedDefaultMax = Math.min(safeMaxByMem, safeMaxByCpu);

    const envPoolSize = process.env.RENDER_POOL_SIZE || process.env.RENDER_CONCURRENCY;
    const configuredMax = envPoolSize ? parseInt(envPoolSize, 10) : calculatedDefaultMax;

    // Clamp between 1 and 100
    this.maxInstances = Math.min(100, Math.max(1, options.maxInstances || configuredMax || 1));
    this.minInstances = Math.min(this.maxInstances, Math.max(1, options.minInstances || parseInt(process.env.RENDER_POOL_MIN || '1', 10)));
    this.maxRendersPerInstance = options.maxRendersPerInstance || parseInt(process.env.RENDER_MAX_PER_INSTANCE || '25', 10);
    this.idleTimeoutMs = options.idleTimeoutMs || 5 * 60 * 1000; // 5 minutes

    console.log(
      `[VideoRendererPool] Initialized Render Instance Pool: [Min: ${this.minInstances}, Max: ${this.maxInstances}] (Detected: ${cpuCount} CPUs, ${totalMemMB}MB RAM, Safe Max: ${calculatedDefaultMax})`
    );

    // Warm up minimum instances
    this.warmup();

    // Register process shutdown cleanup hooks
    process.on('SIGTERM', () => this.destroyAll());
    process.on('SIGINT', () => this.destroyAll());
  }

  public static getInstance(options?: RendererPoolOptions): VideoRendererPool {
    if (!VideoRendererPool.instance) {
      VideoRendererPool.instance = new VideoRendererPool(options);
    }
    return VideoRendererPool.instance;
  }

  /**
   * Warm up initial minimum renderer instances
   */
  private async warmup(): Promise<void> {
    for (let i = 0; i < this.minInstances; i++) {
      this.createInstance().catch((err) => {
        console.warn(`[VideoRendererPool] Warmup instance creation warning: ${err.message}`);
      });
    }
  }

  /**
   * Creates and initializes a new VideoRenderer instance
   */
  private async createInstance(): Promise<PooledRendererInstance> {
    const id = `renderer_${nanoid(6)}`;
    const pooled: PooledRendererInstance = {
      id,
      renderer: new VideoRenderer(),
      busy: false,
      rendersCount: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      isInitializing: true,
    };

    this.instances.push(pooled);

    try {
      console.log(`[VideoRendererPool] Initializing new VideoRenderer instance ${id}...`);
      await pooled.renderer.init();
      pooled.isInitializing = false;
      console.log(`[VideoRendererPool] VideoRenderer instance ${id} is ready for rendering.`);
      return pooled;
    } catch (err: any) {
      pooled.isInitializing = false;
      this.removeInstance(id);
      console.error(`[VideoRendererPool] Failed to initialize instance ${id}:`, err);
      throw err;
    }
  }

  /**
   * Renders a video project using a managed instance from the pool.
   * If all instances are busy, the task is queued until an instance becomes available.
   */
  public async render(project: any, options?: RenderOptions): Promise<Buffer> {
    if (this.isShuttingDown) {
      throw new Error('VideoRendererPool is shutting down. Cannot accept new render jobs.');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const job: QueuedRenderJob = {
        id: `job_${nanoid(8)}`,
        project,
        options,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };

      this.jobQueue.push(job);
      this.processQueue();
    });
  }

  /**
   * Dispatches queued render jobs to available renderer instances
   */
  private async processQueue(): Promise<void> {
    if (this.jobQueue.length === 0 || this.isShuttingDown) return;

    // 1. Find an idle, initialized instance
    let available = this.instances.find((inst) => !inst.busy && !inst.isInitializing);

    // 2. If no idle instance and we haven't reached max capacity, create a new one
    if (!available && this.instances.length < this.maxInstances) {
      try {
        available = await this.createInstance();
      } catch (err) {
        console.warn(`[VideoRendererPool] Failed to scale up instance, waiting for existing: ${err}`);
      }
    }

    // If still no instance available, job stays in queue and will be picked up on next release
    if (!available || available.busy || available.isInitializing) {
      return;
    }

    const nextJob = this.jobQueue.shift();
    if (!nextJob) return;

    available.busy = true;
    available.lastUsedAt = Date.now();
    const startTime = Date.now();
    const waitTimeMs = startTime - nextJob.enqueuedAt;

    if (waitTimeMs > 100) {
      console.log(`[VideoRendererPool] Job ${nextJob.id} dequeued after waiting ${waitTimeMs}ms. Assigned to instance ${available.id}.`);
    }

    try {
      const videoBuffer = await available.renderer.render(nextJob.project, nextJob.options);
      available.rendersCount++;
      this.totalRendersCompleted++;

      nextJob.resolve(videoBuffer);

      // Check if instance needs recycling after max renders to avoid memory leaks
      if (available.rendersCount >= this.maxRendersPerInstance) {
        console.log(`[VideoRendererPool] Instance ${available.id} reached ${available.rendersCount} renders. Recycling instance for memory hygiene...`);
        this.recycleInstance(available);
      } else {
        available.busy = false;
        // Trigger next job in queue immediately
        setImmediate(() => this.processQueue());
      }
    } catch (renderErr: any) {
      console.error(`[VideoRendererPool] Render failed on instance ${available.id}:`, renderErr);
      nextJob.reject(renderErr);

      // Destroy crashed instance (e.g. browser crash or target page closed) and replace
      this.recycleInstance(available);
    }
  }

  /**
   * Recycles an instance by destroying it and replacing with a fresh one if below minInstances or queue is pending
   */
  private async recycleInstance(inst: PooledRendererInstance): Promise<void> {
    this.removeInstance(inst.id);
    try {
      await inst.renderer.destroy();
    } catch (e) {
      // Ignore destroy errors
    }

    // If queue has pending jobs or below minimum instances, spawn a replacement
    if (this.jobQueue.length > 0 || this.instances.length < this.minInstances) {
      this.createInstance()
        .then(() => {
          this.processQueue();
        })
        .catch((err) => {
          console.warn(`[VideoRendererPool] Instance replacement warning: ${err.message}`);
        });
    } else {
      this.processQueue();
    }
  }

  private removeInstance(id: string): void {
    const idx = this.instances.findIndex((i) => i.id === id);
    if (idx >= 0) {
      this.instances.splice(idx, 1);
    }
  }

  /**
   * Cleanly destroys all instances in the pool
   */
  public async destroyAll(): Promise<void> {
    this.isShuttingDown = true;
    console.log(`[VideoRendererPool] Destroying all ${this.instances.length} pooled renderer instances...`);
    const all = [...this.instances];
    this.instances = [];

    await Promise.all(
      all.map(async (inst) => {
        try {
          await inst.renderer.destroy();
        } catch {}
      })
    );
  }

  /**
   * Pool telemetry & health statistics
   */
  public getStats() {
    const busyCount = this.instances.filter((i) => i.busy).length;
    const idleCount = this.instances.filter((i) => !i.busy && !i.isInitializing).length;
    const initializingCount = this.instances.filter((i) => i.isInitializing).length;
    const totalMemMB = Math.round(os.totalmem() / (1024 * 1024));
    const freeMemMB = Math.round(os.freemem() / (1024 * 1024));
    const processRssMB = Math.round(process.memoryUsage().rss / (1024 * 1024));

    return {
      pool: {
        totalInstances: this.instances.length,
        busyInstances: busyCount,
        idleInstances: idleCount,
        initializingInstances: initializingCount,
        minInstances: this.minInstances,
        maxInstances: this.maxInstances,
        queueLength: this.jobQueue.length,
        totalRendersCompleted: this.totalRendersCompleted,
      },
      system: {
        totalMemMB,
        freeMemMB,
        processRssMB,
        cpuCount: os.cpus()?.length || 1,
        loadAvg: os.loadavg(),
      },
    };
  }
}

export const videoRendererPool = VideoRendererPool.getInstance();
