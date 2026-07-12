import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'venke-finance-dev-secret-change-in-production';

// Augment Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  let token = '';
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Session expired. Please log in again.' });
    } else {
      res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
  }
};
