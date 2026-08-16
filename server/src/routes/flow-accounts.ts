import { Router, Request, Response } from 'express';
import { AIAccount, AIAccountType, AIAccountStatus } from '../models/AIAccount.js';
import { flowSyncService } from '../integrations/ai/flow/FlowSyncService.js';
import { captchaService } from '../integrations/ai/flow/CaptchaService.js';

const router = Router();

// GET /api/admin/flow-accounts - List all google-flow accounts
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await AIAccount.find({ accountType: AIAccountType.GOOGLE_FLOW }).select('-flowAT');
    res.json({ success: true, count: accounts.length, accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/flow-accounts - Add or update google-flow session token
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, sessionToken } = req.body;
    if (!email || !sessionToken) {
      res.status(400).json({ error: 'Email and sessionToken are required' });
      return;
    }

    let account = await AIAccount.findOne({ email, accountType: AIAccountType.GOOGLE_FLOW });
    
    if (!account) {
      account = new AIAccount({
        email,
        accountType: AIAccountType.GOOGLE_FLOW,
        status: AIAccountStatus.UNAUTHORIZED,
        flowST: sessionToken,
        isActive: true
      });
    } else {
      account.flowST = sessionToken;
      account.status = AIAccountStatus.UNAUTHORIZED;
    }
    
    await account.save();

    // Trigger an immediate sync for this account
    try {
      await flowSyncService.refreshAccountTokens(account);
    } catch (refreshErr: any) {
      // Account is saved, but sync failed
    }

    const updatedAccount = await AIAccount.findById(account._id).select('-flowAT');
    res.status(201).json({ success: true, account: updatedAccount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/flow-accounts/:id - Remove an account
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await AIAccount.findByIdAndDelete(id);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/flow-accounts/sync - Manual token refresh for all
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  try {
    await flowSyncService.syncAllAccounts();
    const accounts = await AIAccount.find({ accountType: AIAccountType.GOOGLE_FLOW }).select('-flowAT');
    res.json({ success: true, message: 'Flow account pool synced successfully', accounts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/flow-accounts/status - Pool health check
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await AIAccount.find({ accountType: AIAccountType.GOOGLE_FLOW, status: AIAccountStatus.READY });
    let testRecaptcha: string | null = null;
    
    // Test recaptcha if there are accounts
    if (accounts.length > 0) {
      try {
        testRecaptcha = await captchaService.solve({
            projectId: accounts[0].projectId || 'test',
            action: 'IMAGE_GENERATION'
        });
      } catch (e) {}
    }

    res.json({
      success: true,
      poolHealth: accounts.length > 0 ? 'HEALTHY' : 'DEGRADED',
      activeAccounts: accounts.length,
      recaptchaSolverStatus: testRecaptcha ? 'OPERATIONAL' : 'FAILED',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
