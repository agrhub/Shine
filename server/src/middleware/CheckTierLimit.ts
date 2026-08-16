import { Request, Response, NextFunction } from 'express';

const TIER_FEATURES: Record<string, string[]> = {
  free: ['series.create', 'script.generate'],
  creator: ['series.create', 'script.generate', 'voice.tts', 'publish.single', 'publish.multi', 'cover.generate'],
  studio: ['series.create', 'script.generate', 'voice.tts', 'publish.single', 'publish.multi', 'cover.generate', 'persona.advanced', 'marketplace.purchase'],
  enterprise: ['*'],
};

const FEATURE_REQUIRED_TIERS: Record<string, string> = {
  'publish.multi': 'creator',
  'cover.generate': 'creator',
  'marketplace.purchase': 'studio',
  'admin.access': 'enterprise',
};

export function checkTierLimit(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userTier = (req as any).user?.subscriptionTier || 'creator';
    const allowedFeatures = TIER_FEATURES[userTier] || TIER_FEATURES['free'];

    if (!allowedFeatures.includes('*') && !allowedFeatures.includes(feature)) {
      const requiredTier = FEATURE_REQUIRED_TIERS[feature] || 'creator';
      return res.status(403).json({
        code: 403,
        data: null,
        message: `Feature '${feature}' requires a higher subscription tier (${requiredTier.toUpperCase()})`,
        error: { requiredTier },
      });
    }

    next();
  };
}
