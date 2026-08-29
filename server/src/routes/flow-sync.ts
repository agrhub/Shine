import { Router, Request, Response } from 'express';
import { getDatabaseProvider } from '@/database/index.js';
import { flowSyncService } from '../integrations/ai/flow/FlowSyncService.js';

const router = Router();

// POST /api/flow-accounts/sync - Manual token refresh for all
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    await flowSyncService.syncAllAccounts();
    const db = await getDatabaseProvider();
    const accounts = await db.getFlowAccounts();
    res.json({ success: true, message: 'Flow account pool synced successfully', accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;