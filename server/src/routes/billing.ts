import { Router, Request, Response } from 'express';

export const billingRouter = Router();

// GET /v1/billing/tier — Return current user tier and AI credit balance
billingRouter.get('/tier', (req: Request, res: Response) => {
  return res.json({
    code: 200,
    data: {
      tier: 'creator',
      creditBalance: 850,
      creditQuota: 1000,
      features: ['series.create', 'script.generate', 'voice.tts', 'publish.multi', 'cover.generate'],
      monthlyPriceUsd: 29,
    },
    message: 'Subscription tier retrieved',
    error: null,
  });
});

// POST /v1/billing/checkout — Create Stripe Checkout Session
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
        url: `http://localhost:3000/billing?checkout_success=true&tier=${encodeURIComponent(tier)}`,
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

// POST /v1/billing/webhook — Handle Stripe webhook events
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

// POST /v1/billing/revenue-splits — Creator revenue share calculation
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

// GET /api/billing/usage-history — Return credit deduction history
billingRouter.get('/usage-history', (req: Request, res: Response) => {
  const history = [
    { id: 'tx_01', type: 'Script Generation', detail: 'The Secret CEO (Ep 1-3)', credits: -45, date: '2026-03-12 14:30', status: 'Success' },
    { id: 'tx_02', type: 'Video Render', detail: 'Episode 1 Veo-2 9:16 Render', credits: -150, date: '2026-03-11 18:22', status: 'Success' },
    { id: 'tx_03', type: 'Voiceover Synthesis', detail: 'Character Audio Track (12 lines)', credits: -20, date: '2026-03-10 09:15', status: 'Success' },
    { id: 'tx_04', type: 'Plan Renewal Bonus', detail: 'Monthly Creator Quota Auto-add', credits: 1000, date: '2026-03-01 00:00', status: 'Success' },
  ];
  return res.json({
    code: 200,
    data: history,
    message: 'Usage history retrieved',
    error: null,
  });
});
