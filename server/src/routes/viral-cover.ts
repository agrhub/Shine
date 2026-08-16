import { Router, Request, Response } from 'express';
import { geminiClient } from '../integrations/ai/gemini/GeminiClient.js';

export const viralCoverRouter = Router();

// POST /v1/ai/viral-cover/generate — AI scanning video frames to produce 3 viral cover thumbnails
viralCoverRouter.post('/viral-cover/generate', async (req: Request, res: Response) => {
  const { episodeId = 'episode-001', seriesTitle = 'The Neon Betrayal' } = req.body;

  try {
    const prompt = `Generate 3 high-CTR clickbait viral cover titles and predicted CTR scores (80-99) for a micro-drama episode:
Series: ${seriesTitle}
Episode: ${episodeId}

Respond in strict JSON:
[
  { "id": "c-01", "url": "https://picsum.photos/seed/cover1/400/600", "title": "The Betrayal Reveal", "score": 96 },
  { "id": "c-02", "url": "https://picsum.photos/seed/cover2/400/600", "title": "Climax Showdown", "score": 91 },
  { "id": "c-03", "url": "https://picsum.photos/seed/cover3/400/600", "title": "Emotional Confrontation", "score": 88 }
]`;

    const raw = await geminiClient.generateText({
      prompt,
      systemInstruction: 'You are a Viral TikTok/Shorts Thumbnail & Title Optimization Engine predicting click-through rates.',
      jsonMode: true,
    });

    const parsed = JSON.parse(raw);
    const variants = Array.isArray(parsed) ? parsed : (parsed.variants || []);
    return res.json({
      code: 200,
      data: {
        episodeId,
        variants,
      },
      message: '3 viral cover variants generated successfully via Gemini',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: 'Failed to generate viral cover variants',
      error: err.message,
    });
  }
});

