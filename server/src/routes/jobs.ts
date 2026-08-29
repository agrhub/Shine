import { Router, Request, Response } from 'express';
import { getDatabaseProvider } from '@/database/index.js';
import { PipelineJobService } from '@/services/PipelineJobService.js';
import { getUserId } from '@/utils/auth.js';
import { Logger } from '@/utils/logger.js';

export const jobsRouter = Router();

// GET /api/jobs/active — Get active and recent pipeline jobs for an episode or series
jobsRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const user_id = getUserId(req);
    const series_id = req.query.series_id as string;
    const episode_id = req.query.episode_id as string;

    const db = await getDatabaseProvider();
    const jobs = await db.getPipelineJobs({
      user_id: user_id || undefined,
      series_id: series_id || undefined,
      episode_id: episode_id || undefined,
      limit: 10,
    });

    const activeJob = jobs.find(j => j.status === 'running' || j.status === 'queued') || null;

    return res.json({
      code: 200,
      data: {
        active_job: activeJob,
        jobs,
      },
      message: 'Active pipeline jobs fetched successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// GET /api/jobs/:id — Get status and logs of a single job
jobsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const job_id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const db = await getDatabaseProvider();
    const job = await db.getPipelineJobById(job_id);

    if (!job) {
      return res.status(404).json({ code: 404, data: null, message: `Job ${job_id} not found`, error: 'NOT_FOUND' });
    }

    return res.json({
      code: 200,
      data: job,
      message: 'Job status retrieved successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /api/jobs/start-pipeline — Trigger asynchronous pipeline job
jobsRouter.post('/start-pipeline', async (req: Request, res: Response) => {
  try {
    const user_id = getUserId(req);
    const { series_id, episode_id, type = 'full_pipeline', force_regenerate = false, session_id, title } = req.body;

    if (!user_id) {
      return res.status(401).json({ code: 401, data: null, message: 'Authentication required: user_id is missing' });
    }
    if (!series_id) {
      return res.status(400).json({ code: 400, data: null, message: 'series_id is required', error: 'INVALID_PAYLOAD' });
    }
    if (!episode_id) {
      return res.status(400).json({ code: 400, data: null, message: 'episode_id is required', error: 'INVALID_PAYLOAD' });
    }

    const { job, is_new } = await PipelineJobService.startOrGetPipelineJob({
      user_id,
      series_id,
      episode_id,
      type,
      force_regenerate: Boolean(force_regenerate),
      session_id,
      title,
    });

    return res.json({
      code: 200,
      data: {
        job,
        is_new,
      },
      message: is_new ? 'Pipeline job started in background' : 'Existing active pipeline job attached',
      error: null,
    });
  } catch (err: any) {
    Logger.error(`[jobsRouter.start-pipeline] Error: ${err.message}`);
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});

// POST /api/jobs/:id/cancel — Cancel running pipeline job
jobsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = await PipelineJobService.cancelJob(jobId);
    return res.json({
      code: 200,
      data: { job_id: jobId, cancelled: success },
      message: success ? 'Job cancelled successfully' : 'Job not found',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({ code: 500, data: null, message: err.message, error: 'SERVER_ERROR' });
  }
});
