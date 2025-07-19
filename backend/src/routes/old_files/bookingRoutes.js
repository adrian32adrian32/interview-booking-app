const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Rute publice (necesită doar autentificare)
router.use(protect);

// User routes
router.get('/available-slots', bookingController.getAvailableSlots);
router.post('/create', bookingController.createBooking);
router.get('/my-bookings', bookingController.getUserBookings);
router.patch('/:bookingId/cancel', bookingController.cancelBooking);

// Admin routes
router.get('/all', adminOnly, bookingController.getAllBookings);
router.post('/time-slots', adminOnly, bookingController.createTimeSlots);

module.exports = router;