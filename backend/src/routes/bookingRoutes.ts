import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
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
router.get('/', authenticateToken, getAllBookings);
router.get('/date/:date', authenticateToken, getBookingsByDate);
router.get('/:id', authenticateToken, getBookingById);
router.put('/:id', authenticateToken, updateBooking);
router.delete('/:id', authenticateToken, deleteBooking);

export default router;