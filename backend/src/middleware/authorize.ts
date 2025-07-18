// backend/src/middleware/authorize.ts

import { AuthRequest } from './auth';
import { Request, Response, NextFunction } from 'express';

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neautentificat'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea pentru această acțiune'
      });
    }

    next();
  };
};
