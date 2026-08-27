import { Router, Request, Response } from 'express';
import { ChatbotAgent } from '../agents/ChatbotAgent.js';
import { Logger } from '../utils/logger.js';
import { getUserId } from '@/utils/auth.js';

export const aiAgenticRouter = Router();

/**
 * POST /api/ai/agentic/stream (or POST /api/ai/agentic)
 * Universal Google ADK Streaming SSE Endpoint
 */
const handleAgenticStream = async (req: Request, res: Response): Promise<void> => {
  const { sessionId, seriesId, episodeId, message, context } = req.body;
  const userId = getUserId(req, '') || req.body.userId;

  if (!userId) {
    res.status(401).json({ code: 401, data: null, message: 'Authentication required: userId is missing' });
    return;
  }

  if (!message || typeof message !== 'string') {
    res.status(400).json({ code: 400, data: null, message: 'Message string is required' });
    return;
  }

  const activeSessionId = sessionId || (seriesId ? `${seriesId}_${episodeId || 'main'}` : `wiz_${Date.now()}`);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    Logger.info(`[AgenticStream] Starting stream for user=${userId}, session=${activeSessionId}, series=${seriesId || 'none'}`);

    await ChatbotAgent.chatStream({
      userId,
      seriesId: seriesId || activeSessionId,
      episodeId: episodeId || 'main',
      userMessage: message,
      context,
      onChunk: (chunk: string) => {
        sendEvent('chunk', { text: chunk });
      },
      onToolCall: (toolCall: any) => {
        sendEvent('tool_call', toolCall);
      },
      onItemUpdated: (event: any) => {
        sendEvent('item_updated', event);
      },
      onProgress: (progress: any) => {
        sendEvent('step_progress', progress);
      },
      onSuggestions: (suggestions: any) => {
        sendEvent('suggestions', suggestions);
      },
    });

    sendEvent('done', { status: 'completed', sessionId: activeSessionId });
    res.end();
  } catch (err: any) {
    Logger.error(`[AgenticStream] Stream error: ${err.message}`);
    sendEvent('error', { message: err.message });
    res.end();
  }
};

aiAgenticRouter.post('/stream', handleAgenticStream);
aiAgenticRouter.post('/', handleAgenticStream);

/**
 * GET /api/ai/agentic/history/:seriesId
 * Fetch full continuous conversation history for a series or session
 */
aiAgenticRouter.get('/history/:seriesId', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = req.params.seriesId;
    const userId = getUserId(req, '') || (req.query.userId as string);

    if (!userId) {
      res.status(401).json({ code: 401, data: null, message: 'Authentication required: userId is missing' });
      return;
    }

    const messages = await ChatbotAgent.getSeriesHistory(userId, seriesId);

    res.json({
      code: 200,
      data: {
        seriesId,
        messages,
      },
      message: 'Agentic session history fetched successfully',
    });
  } catch (err: any) {
    res.status(500).json({
      code: 500,
      data: null,
      message: `Failed to load session history: ${err.message}`,
    });
  }
});

/**
 * POST /api/ai/agentic/transfer-session
 * Transfer wizard pre-creation conversation history into the newly created series
 */
aiAgenticRouter.post('/transfer-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { oldSessionId, newSeriesId } = req.body;
    const userId = getUserId(req, '') || req.body.userId;

    if (!userId) {
      res.status(401).json({ code: 401, data: null, message: 'Authentication required: userId is missing' });
      return;
    }

    if (!oldSessionId || !newSeriesId) {
      res.status(400).json({ code: 400, data: null, message: 'oldSessionId and newSeriesId are required' });
      return;
    }

    const transferredCount = await ChatbotAgent.transferSession(userId, oldSessionId, newSeriesId);

    res.json({
      code: 200,
      data: {
        transferredCount,
        oldSessionId,
        newSeriesId,
      },
      message: `Transferred ${transferredCount} messages from session to series`,
    });
  } catch (err: any) {
    res.status(500).json({
      code: 500,
      data: null,
      message: `Failed to transfer session: ${err.message}`,
    });
  }
});
