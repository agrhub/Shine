import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'shine_jwt_secret_key_2026';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, error: 'Unauthorized', message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Attach user to request
    (req as any).user = {
      id: decoded.userId,
      email: decoded.email,
      tier: decoded.tier
    };

    next();
  } catch (error) {
    return res.status(401).json({ code: 401, error: 'Unauthorized', message: 'Token expired or invalid' });
  }
};
