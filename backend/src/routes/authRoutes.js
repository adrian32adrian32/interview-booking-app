const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors
} = require('../utils/authValidators');

// Rute publice
router.post('/register', 
  validateRegister, 
  handleValidationErrors, 
  authController.register
);

router.post('/login', 
  validateLogin, 
  handleValidationErrors, 
  authController.login
);

router.post('/forgot-password', 
  validateForgotPassword, 
  handleValidationErrors, 
  authController.forgotPassword
);

router.post('/reset-password', 
  validateResetPassword, 
  handleValidationErrors, 
  authController.resetPassword
);

router.get('/verify-email/:token', authController.verifyEmail);

router.post('/refresh-token', authController.refreshToken);

// Rute protejate
router.post('/logout', protect, authController.logout);

module.exports = router;