import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2024';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
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
      (req as any).userEmail = decoded.email;
      (req as any).userRole = decoded.role;
      
      // Verifică dacă user-ul încă există și e activ
      const userCheck = await pool.query(
        'SELECT id, role, status FROM users WHERE id = $1',
        [(req as any).userId]
      );
      
      if (userCheck.rows.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Utilizator negăsit' 
        });
      }
      
      if (userCheck.rows[0].status === 'inactive') {
        return res.status(401).json({ 
          success: false, 
          message: 'Contul tău este dezactivat' 
        });
      }
      
      // Actualizează rolul în caz că s-a schimbat
      (req as any).userRole = userCheck.rows[0].role;
      
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

// Middleware opțional pentru a verifica dacă utilizatorul poate accesa o resursă
export const canAccessResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const resourceUserId = req.params.userId || req.body.userId;
    
    // Admin poate accesa orice
    if (userRole === 'admin') {
      return next();
    }
    
    // User poate accesa doar propriile resurse
    if (userId.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să accesezi această resursă'
      });
    }
    
    next();
  } catch (error) {
    console.error('Access control error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare verificare permisiuni'
    });
  }
};