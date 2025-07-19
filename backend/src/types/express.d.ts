import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: any; // sau un tip mai specific
      file?: any;
      files?: any;
    }
  }
}

export {};
