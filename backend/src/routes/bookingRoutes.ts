import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingsByDate
} from '../controllers/bookingController';

const router = Router();

// Rute publice (pentru clienți să creeze programări)
router.post('/', createBooking);

// Rute protejate (necesită autentificare)
router.get('/', authMiddleware, getAllBookings);
router.get('/:id', authMiddleware, getBookingById);
router.get('/date/:date', authMiddleware, getBookingsByDate);
router.put('/:id', authMiddleware, updateBooking);
router.delete('/:id', authMiddleware, deleteBooking);

export default router;
