import { Router, Request, Response } from 'express';
import { EnvConfig } from '@/config/env.js';
import { Logger } from '@/utils/logger.js';

export const pexelsRouter = Router();

/**
 * GET /api/pexels — Proxy video and image search to Pexels API
 */
pexelsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || 'video';
    const query = (req.query.query as string) || 'nature';
    const perPage = Number(req.query.per_page || 15);
    const page = Number(req.query.page || 1);

    const apiKey = EnvConfig.pexels?.apiKey || process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return res.json({
        code: 200,
        data: [],
        total_results: 0,
        message: 'Pexels API key not configured',
      });
    }

    const endpoint =
      type === 'video'
        ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`
        : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}`;

    const apiRes = await fetch(endpoint, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      Logger.warn(`[PexelsProxy] Pexels API returned ${apiRes.status}: ${errText}`);
      return res.status(apiRes.status).json({ code: apiRes.status, error: errText });
    }

    const json = await apiRes.json();
    return res.json(json);
  } catch (err: any) {
    Logger.error(`[PexelsProxy] Search failed: ${err.message}`);
    return res.status(500).json({ code: 500, error: err.message });
  }
});
