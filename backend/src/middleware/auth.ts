import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

export const authenticateToken = authMiddleware;

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// Adaugă această funcție înainte de "export default authMiddleware;"
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Mai întâi verifică dacă utilizatorul este autentificat
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nu ești autentificat'
      });
    }

    // Apoi verifică dacă are rolul necesar
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să accesezi această resursă'
      });
    }

    next();
  };
};

export default authMiddleware;