import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getAvailableSlots,
  getAllSlots,
  checkSlotAvailability
} from '../controllers/timeSlotController';

const router = Router();

// Rute publice (pentru clienți să vadă sloturile disponibile)
router.get('/available/:date', getAvailableSlots);
router.post('/check', checkSlotAvailability);

// Rute protejate (pentru admin)
router.get('/', authMiddleware, getAllSlots);

export default router;
