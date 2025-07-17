const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Verifică dacă adminController există, dacă nu, creează funcții temporare
let adminController;
try {
  adminController = require('../controllers/adminController');
} catch (error) {
  console.log('⚠️ AdminController nu există încă, folosesc funcții temporare');
  adminController = {
    getDashboardStats: (req, res) => res.json({ success: true, message: 'Dashboard stats - în dezvoltare' }),
    getAllUsers: (req, res) => res.json({ success: true, message: 'Get all users - în dezvoltare' }),
    createAdmin: (req, res) => res.json({ success: true, message: 'Create admin - în dezvoltare' }),
    updateUserStatus: (req, res) => res.json({ success: true, message: 'Update user status - în dezvoltare' }),
    resetUserPassword: (req, res) => res.json({ success: true, message: 'Reset password - în dezvoltare' }),
    sendEmailToUsers: (req, res) => res.json({ success: true, message: 'Send email - în dezvoltare' })
  };
}

// Toate rutele admin necesită autentificare și rol de admin
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Gestionare utilizatori
router.get('/users', adminController.getAllUsers);
router.post('/users/create-admin', adminController.createAdmin);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.post('/users/:userId/reset-password', adminController.resetUserPassword);

// Email
router.post('/email/send', adminController.sendEmailToUsers);

// Test route pentru verificare
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes funcționează!',
    user: req.user
  });
});

module.exports = router;