import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token is required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET'));

    if (typeof decoded === 'string') {
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    req.user = {
      ...decoded,
      userId: String(decoded.userId),
      email: String(decoded.email)
    };

    next();
  } catch (_error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
