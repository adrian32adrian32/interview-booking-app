const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  getMe, 
  updateProfile, 
  changePassword 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Rute publice
router.post('/login', login);
router.post('/register', register);

// Rute protejate
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;