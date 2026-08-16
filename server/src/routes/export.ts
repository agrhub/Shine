import { Router, Request, Response } from 'express';
import { compositorWorker, CompositorPayload } from '../services/compositor/CompositorWorker.js';

export const exportRouter = Router();

// POST /v1/export/render-job — Queue a render job
exportRouter.post('/render-job', (req: Request, res: Response) => {
  try {
    const payload: CompositorPayload = req.body;
    if (!payload.seriesId || !payload.episodeId) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'seriesId and episodeId are required',
        error: 'INVALID_PAYLOAD',
      });
    }

    const job = compositorWorker.createJob(payload);

    return res.json({
      code: 200,
      data: {
        jobId: job.jobId,
        seriesId: job.seriesId,
        episodeId: job.episodeId,
        status: job.status,
        progress: job.progress,
        outputUrl: job.outputUrl,
      },
      message: 'Render job queued successfully',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: err.message || 'Failed to queue render job',
      error: 'SERVER_ERROR',
    });
  }
});

// GET /v1/export/render-job/:jobId/status — Poll render job progress
exportRouter.get('/render-job/:jobId/status', (req: Request, res: Response) => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = compositorWorker.getJobStatus(jobId);


  if (!job) {
    return res.status(404).json({
      code: 404,
      data: null,
      message: 'Render job not found',
      error: 'JOB_NOT_FOUND',
    });
  }

  return res.json({
    code: 200,
    data: {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      outputUrl: job.outputUrl,
      error: job.error || null,
    },
    message: job.status === 'completed' ? 'Render complete!' : 'Rendering in progress...',
    error: null,
  });
});

// POST /v1/export/parity-check — Calculate SSIM between WebGL preview frame and ffmpeg compositor output
exportRouter.post('/parity-check', (req: Request, res: Response) => {
  const { seriesId, episodeId } = req.body;
  const result = compositorWorker.calculateParityScore(seriesId || 'series-001', episodeId || 'episode-001');

  return res.json({
    code: 200,
    data: result,
    message: 'Parity check complete',
    error: null,
  });
});
