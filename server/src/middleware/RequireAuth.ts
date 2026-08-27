import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { EnvConfig } from '@/config/env.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, error: 'Unauthorized', message: 'Missing or invalid authentication token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, EnvConfig.jwtSecret) as any;
    
    // Attach authenticated user to request
    (req as any).user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      email: decoded.email,
      role: (decoded.role || 'user').toLowerCase(),
      tier: decoded.tier || 'FREE',
    };

    next();
  } catch (error) {
    return res.status(401).json({ code: 401, error: 'Unauthorized', message: 'Token expired or invalid' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const role = (user?.role || '').toLowerCase();
  if (!user || (role !== 'admin' && role !== 'owner' && role !== 'superadmin')) {
    return res.status(403).json({ code: 403, error: 'Forbidden', message: 'Administrator permissions required' });
  }
  next();
};
