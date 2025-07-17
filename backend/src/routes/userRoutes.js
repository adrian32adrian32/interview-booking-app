const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Controller temporar până creăm userController.js
const userController = {
  getProfile: (req, res) => {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role
      }
    });
  },
  
  updateProfile: (req, res) => {
    res.json({
      success: true,
      message: 'Update profile - în dezvoltare'
    });
  },
  
  changePassword: (req, res) => {
    res.json({
      success: true,
      message: 'Change password - în dezvoltare'
    });
  },
  
  uploadDocuments: (req, res) => {
    res.json({
      success: true,
      message: 'Upload documents - în dezvoltare'
    });
  },
  
  getDocuments: (req, res) => {
    res.json({
      success: true,
      message: 'Get documents - în dezvoltare',
      data: []
    });
  }
};

// Toate rutele necesită autentificare
router.use(protect);

// Profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);

// Documents routes
router.post('/documents', userController.uploadDocuments);
router.get('/documents', userController.getDocuments);

module.exports = router;