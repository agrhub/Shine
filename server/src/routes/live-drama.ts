import { Router, Request, Response } from 'express';

export const liveDramaRouter = Router();

// POST /api/live/polling — Start interactive live-stream drama audience poll
liveDramaRouter.post('/polling', (req: Request, res: Response) => {
  const { episodeId, question, options } = req.body;

  return res.json({
    code: 200,
    data: {
      pollId: `poll_${Date.now()}`,
      episodeId: episodeId || 'episode-001',
      question: question || 'Should the heroine forgive the CEO?',
      options: options || [
        { id: 'opt-a', label: 'Forgive & reconcile', votes: 1420 },
        { id: 'opt-b', label: 'Expose his secrets', votes: 3890 },
      ],
      active: true,
      expiresInSeconds: 60,
    },
    message: 'Live drama polling session initialized',
    error: null,
  });
});
