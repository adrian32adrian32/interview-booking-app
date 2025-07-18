const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getDashboardStats, getAllUsers, createAdmin, updateUserStatus, updateUserRole, deleteUser, getAllBookings, resetUserPassword, sendEmailToUsers } = require('../controllers/adminController');
// Toate rutele admin necesită autentificare și rol de admin
router.use(protect, adminOnly);
// Dashboard
router.get('/dashboard/stats', getDashboardStats);
// Gestionare utilizatori
router.get('/users', getAllUsers);
router.post('/users/create-admin', createAdmin);
router.patch('/users/:userId/status', updateUserStatus);
router.patch('/users/:userId/role', updateUserRole);
router.delete('/users/:userId', deleteUser);
router.get('/bookings', getAllBookings);
router.post('/users/:userId/reset-password', resetUserPassword);
// Email
router.post('/email/send', sendEmailToUsers);
// Test route pentru verificare
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Admin routes funcționează!',
        user: req.user
    });
});
module.exports = router;
