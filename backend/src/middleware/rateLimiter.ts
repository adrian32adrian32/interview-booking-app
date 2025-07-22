// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter pentru login - mai restrictiv
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 5, // maxim 5 încercări
  message: 'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
  skipSuccessfulRequests: true // Nu conta requesturile de succes
});

// Rate limiter general pentru API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100, // maxim 100 requests
  message: 'Prea multe request-uri de la această adresă IP.'
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
  max: 20, // maxim 20 upload-uri pe oră
  message: 'Ați atins limita de upload-uri. Încercați din nou peste o oră.'
});