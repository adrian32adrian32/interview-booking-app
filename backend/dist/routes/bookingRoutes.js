"use strict";
// backend/src/routes/bookingRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const router = (0, express_1.Router)();
const bookingController = new bookingController_1.BookingController();
// Toate rutele necesită autentificare
router.use(auth_1.authenticateToken);
// Rute pentru programări
// GET /api/bookings - Obține toate programările
// Admin vede toate, user vede doar ale lui
router.get('/', async (req, res) => {
    // Dacă nu e admin, filtrează doar programările userului
    if (req.user?.role !== 'admin') {
        req.query.candidate_id = req.user?.id;
    }
    await bookingController.getAllBookings(req, res);
});
// GET /api/bookings/available-slots - Obține sloturile disponibile
router.get('/available-slots', bookingController.getAvailableSlots);
// GET /api/bookings/:id - Obține o programare specifică
router.get('/:id', async (req, res) => {
    await bookingController.getBookingById(req, res);
});
// POST /api/bookings - Creează o nouă programare
router.post('/', async (req, res) => {
    await bookingController.createBooking(req, res);
});
// PUT /api/bookings/:id - Actualizează o programare
// Doar admin sau proprietarul pot actualiza
router.put('/:id', async (req, res) => {
    // Verifică dacă userul are dreptul să modifice
    if (req.user?.role !== 'admin') {
        // Verifică dacă e proprietarul programării
        const bookingController = new bookingController_1.BookingController();
        const bookingRes = await bookingController.getBookingById(req, res);
        // Implementează logica de verificare aici
    }
    await bookingController.updateBooking(req, res);
});
// POST /api/bookings/:id/cancel - Anulează o programare
router.post('/:id/cancel', async (req, res) => {
    await bookingController.cancelBooking(req, res);
});
// Rute admin-only
// POST /api/bookings/:id/confirm - Confirmă o programare
router.post('/:id/confirm', (0, authorize_1.authorize)(['admin']), async (req, res) => {
    req.body = { status: 'confirmed' };
    await bookingController.updateBooking(req, res);
});
// POST /api/bookings/:id/complete - Marchează ca finalizată
router.post('/:id/complete', (0, authorize_1.authorize)(['admin']), async (req, res) => {
    req.body = { status: 'completed', completed_at: new Date() };
    await bookingController.updateBooking(req, res);
});
// POST /api/bookings/:id/feedback - Adaugă feedback
router.post('/:id/feedback', (0, authorize_1.authorize)(['admin']), async (req, res) => {
    const { feedback } = req.body;
    req.body = { interviewer_feedback: feedback };
    await bookingController.updateBooking(req, res);
});
exports.default = router;
