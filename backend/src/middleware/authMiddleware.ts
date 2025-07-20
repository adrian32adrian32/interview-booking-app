import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2024';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autentificare lipsă'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).userId = decoded.userId || decoded.id;
      (req as any).userRole = decoded.role;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalid sau expirat'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare de autentificare'
    });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userRole = (req as any).userRole;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acces interzis - doar pentru administratori'
    });
  }
  
  next();
};
