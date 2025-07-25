// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Extend Request type pentru a include user
interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// Rate limiter pentru login - mai restrictiv
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 5, // maxim 5 încercări
  message: 'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.',
      retryAfter: req.rateLimit?.resetTime
    });
  }
});

// Rate limiter pentru înregistrare
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 oră
  max: 3, // maxim 3 conturi noi per IP
  message: 'Prea multe conturi create de la această adresă IP. Încercați din nou peste o oră.',
  skipSuccessfulRequests: true
});

// Rate limiter general pentru API - mai permisiv
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 300, // crescut de la 100 la 300 requests
  message: 'Prea multe request-uri de la această adresă IP.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip pentru admin
  skip: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.role === 'admin';
  }
});

// Rate limiter special pentru admin - foarte permisiv
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 1000, // 1000 requests pentru admin
  message: 'Limită administrativă atinsă.',
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter pentru forgot password
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 oră
  max: 3, // maxim 3 încercări
  message: 'Prea multe cereri de resetare parolă. Încercați din nou peste o oră.',
  skipFailedRequests: false
});

// Rate limiter pentru upload fișiere
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 oră
  max: 50, // crescut de la 20 la 50 upload-uri pe oră
  message: 'Ați atins limita de upload-uri. Încercați din nou peste o oră.'
});