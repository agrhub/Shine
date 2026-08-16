import { Router, Request, Response } from 'express';

export const costGuardrailsRouter = Router();

let currentGuardrails = {
  maxBudgetUsd: 3.50,
  currentSpendUsd: 1.25,
  lowResProxyMode: false,
};

// GET /v1/admin/cost-guardrails
costGuardrailsRouter.get('/', (req: Request, res: Response) => {
  return res.status(200).json({
    code: 200,
    data: currentGuardrails,
    message: 'Cost guardrails retrieved',
    error: null,
  });
});

// PUT /v1/admin/cost-guardrails
costGuardrailsRouter.put('/', (req: Request, res: Response) => {
  const { maxBudgetUsd, lowResProxyMode } = req.body;
  if (typeof maxBudgetUsd === 'number') {
    currentGuardrails.maxBudgetUsd = maxBudgetUsd;
  }
  if (typeof lowResProxyMode === 'boolean') {
    currentGuardrails.lowResProxyMode = lowResProxyMode;
  }
  return res.status(200).json({
    code: 200,
    data: currentGuardrails,
    message: 'Cost guardrails updated',
    error: null,
  });
});
