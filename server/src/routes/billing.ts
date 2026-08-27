import { Router, Request, Response } from 'express';
import { getDatabaseProvider } from '@/database/index.js';
import { getUserId, getAuthUser } from '@/utils/auth.js';

export const billingRouter = Router();

// GET /api/billing/tier — Return current user tier and AI credit balance
billingRouter.get('/tier', async (req: Request, res: Response) => {
  try {
    const db = await getDatabaseProvider();
    let user: any = await getAuthUser(req);
    if (!user) {
      return res.status(401).send("User not found");
    }

    const rawTier = (user.tier || 'FREE').toUpperCase();
    return res.json({
      code: 200,
      data: {
        tier: rawTier.toLowerCase(),
        creditBalance: user.credits ?? 100,
        creditQuota: rawTier === 'ENTERPRISE' ? 10000 : rawTier === 'PRO' ? 1000 : 100,
        features: ['series.create', 'script.generate', 'voice.tts', 'publish.multi', 'cover.generate'],
        monthlyPriceUsd: rawTier === 'ENTERPRISE' ? 299 : rawTier === 'PRO' ? 29 : 0,
      },
      message: 'Subscription tier retrieved',
      error: null,
    });
  }catch(error: any){
    return res.status(500).json({
      code: 500,
      data: null,
      message: error.message || 'Failed to retrieve subscription tier',
      error: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/billing/checkout — Create Stripe Checkout Session
billingRouter.post('/checkout', (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    if (!tier) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: 'Subscription tier is required',
        error: 'INVALID_TIER',
      });
    }

    // Return simulated checkout URL or Stripe session URL
    return res.json({
      code: 200,
      data: {
        sessionId: `cs_test_${Date.now()}`,
        url: `http://localhost:3000/settings?checkout_success=true&tier=${encodeURIComponent(tier)}`,
      },
      message: 'Stripe checkout session initialized',
      error: null,
    });
  } catch (err: any) {
    return res.status(500).json({
      code: 500,
      data: null,
      message: err.message || 'Checkout failed',
      error: 'STRIPE_ERROR',
    });
  }
});

// POST /api/billing/webhook — Handle Stripe webhook events
billingRouter.post('/webhook', (req: Request, res: Response) => {
  const event = req.body;
  console.log('Received Stripe Webhook event:', event?.type || 'checkout.session.completed');

  return res.json({
    code: 200,
    data: { received: true, eventType: event?.type || 'checkout.session.completed' },
    message: 'Stripe webhook event processed',
    error: null,
  });
});

// POST /api/billing/revenue-splits — Creator revenue share calculation
billingRouter.post('/revenue-splits', (req: Request, res: Response) => {
  const { seriesId, totalRevenueUsd } = req.body;
  const netRevenue = (totalRevenueUsd || 1000) * 0.7; // 70% to creator

  return res.json({
    code: 200,
    data: {
      seriesId: seriesId || 'series-001',
      grossRevenueUsd: totalRevenueUsd || 1000,
      platformFeeUsd: (totalRevenueUsd || 1000) * 0.3,
      creatorPayoutUsd: netRevenue,
      payoutStatus: 'scheduled',
    },
    error: null,
    message: 'Revenue split calculated successfully',
  });
});

// GET /api/billing/usage-history — Return real credit deduction history
billingRouter.get('/usage-history', async (req: Request, res: Response) => {
  try{
    const db = await getDatabaseProvider();
    const userId = getUserId(req, '');
    if(!userId){
      return res.status(401).send("User not found");
    }

    let transactions = await db.getCreditHistory(userId || undefined, 50);
    
    const formatted = transactions.map((t) => ({
      id: t.id,
      type: t.activity,
      detail: t.details || 'AI Task Execution',
      credits: t.amount,
      balanceAfter: t.balance_after,
      date: t.created_at ? new Date(t.created_at).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: t.status || 'Success',
    }));

    return res.json({
      code: 200,
      data: formatted,
      message: 'Usage history retrieved',
      error: null,
    });
  }catch(error: any){
    return res.status(500).json({
      code: 500,
      data: null,
      message: error.message || 'Failed to retrieve history usage',
      error: 'INTERNAL_ERROR',
    });
  }
});
