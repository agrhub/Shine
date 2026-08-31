import { FunctionTool } from '@google/adk';
import { Type } from '@google/genai';
import { getDatabaseProvider } from '@/database/index.js';
import { PipelineJobService } from '@/services/PipelineJobService.js';
import type { PipelineJobEntity, PipelineJobStepProgress } from '@/types.js';
import { getActiveChatContext, type ToolContextParams, type ToolExecutionResult } from './context.js';

export class JobToolExecutors {
  /**
   * Check status, progress, current step, and generated assets of a pipeline or render job
   */
  static async checkJobStatus(params: {
    jobId?: string;
    seriesId?: string;
    episodeId?: string;
  }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();

      let job: PipelineJobEntity | null = null;
      if (params.jobId) {
        job = await db.getPipelineJobById(params.jobId);
      } else if (params.seriesId && params.episodeId) {
        job = await db.findActivePipelineJob(params.seriesId, params.episodeId);
        if (!job) {
          const allJobs = await db.getPipelineJobs({ series_id: params.seriesId, episode_id: params.episodeId, limit: 1 });
          job = allJobs[0] || null;
        }
      }

      if (!job) {
        return {
          success: false,
          message: params.jobId
            ? `Job ${params.jobId} not found.`
            : `No background jobs found for Series ${params.seriesId} / Episode ${params.episodeId}.`,
        };
      }

      // Collect summary of assets generated so far
      const stepEntries = Object.values(job.step_progress || {}) as PipelineJobStepProgress[];
      const completedAssetsCount = stepEntries.reduce((sum: number, step: PipelineJobStepProgress) => {
        return sum + (step.assets?.length || 0);
      }, 0);

      return {
        success: true,
        message: `Job ${job.id} (${job.title}):\n- Status: ${job.status.toUpperCase()}\n- Progress: ${job.progress}%\n- Current Step: ${job.current_step}\n- Assets Produced: ${completedAssetsCount}`,
        data: {
          job_id: job.id,
          title: job.title,
          status: job.status,
          progress: job.progress,
          current_step: job.current_step,
          step_progress: job.step_progress,
          outputs: job.outputs,
          error: job.error,
          completed_assets_count: completedAssetsCount,
          created_at: job.created_at,
          updated_at: job.updated_at,
        },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to check job status: ${err.message}`, error: err.message };
    }
  }

  /**
   * List active background jobs for the current episode/series
   */
  static async listActiveJobs(params: { seriesId?: string; episodeId?: string }): Promise<ToolExecutionResult> {
    try {
      const db = await getDatabaseProvider();
      const jobs = await db.getPipelineJobs({
        series_id: params.seriesId,
        episode_id: params.episodeId,
        limit: 10,
      });

      return {
        success: true,
        message: `Found ${jobs.length} job(s) for Series ${params.seriesId || 'all'} / Episode ${params.episodeId || 'all'}.`,
        data: { jobs },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to list jobs: ${err.message}`, error: err.message };
    }
  }

  /**
   * Cancel a running background job
   */
  static async cancelJob(params: { jobId: string }): Promise<ToolExecutionResult> {
    try {
      const ok = await PipelineJobService.cancelJob(params.jobId);
      if (!ok) return { success: false, message: `Could not cancel job ${params.jobId}: Job not found.` };
      return {
        success: true,
        message: `Job ${params.jobId} was cancelled successfully.`,
        data: { job_id: params.jobId, status: 'cancelled' },
      };
    } catch (err: any) {
      return { success: false, message: `Failed to cancel job: ${err.message}`, error: err.message };
    }
  }
}

/**
 * Creates ADK FunctionTools for background job management
 */
export function createJobTools(_params?: ToolContextParams): FunctionTool[] {
  return [
    new FunctionTool({
      name: 'check_job_status',
      description: 'Check the real-time progress, current step, generated assets, and completion state of a background pipeline or render job.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          job_id: { type: Type.STRING, description: 'Optional specific job ID (e.g. job_xxx)' },
        },
      },
      execute: async (args: any) => {
        const ctx = getActiveChatContext();
        const jobId = args.job_id || args.jobId;
        const seriesId = ctx?.seriesId;
        const episodeId = ctx?.episodeId;
        return await JobToolExecutors.checkJobStatus({ jobId, seriesId, episodeId });
      },
    }),

    new FunctionTool({
      name: 'list_active_jobs',
      description: 'List all running or recent background jobs for the current series and episode.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
      execute: async () => {
        const ctx = getActiveChatContext();
        return await JobToolExecutors.listActiveJobs({
          seriesId: ctx?.seriesId,
          episodeId: ctx?.episodeId,
        });
      },
    }),

    new FunctionTool({
      name: 'cancel_job',
      description: 'Cancel a running background job.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          job_id: { type: Type.STRING, description: 'The job ID to cancel' },
        },
        required: ['job_id'],
      },
      execute: async (args: any) => {
        const jobId = args.job_id || args.jobId;
        return await JobToolExecutors.cancelJob({ jobId });
      },
    }),
  ];
}
