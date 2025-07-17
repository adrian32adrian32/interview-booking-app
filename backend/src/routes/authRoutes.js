const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Test route pentru verificare
router.get('/test', (req, res) => {
  console.log('✅ Auth routes test endpoint hit');
  res.json({
    success: true,
    message: 'Auth routes working!',
    timestamp: new Date().toISOString()
  });
});

// Test login direct
router.post('/test-login', (req, res) => {
  console.log('📧 TEST LOGIN BODY:', req.body);
  res.json({ 
    success: true, 
    message: 'Test login received',
    body: req.body 
  });
});

// Validator simplu temporar pentru login
const simpleValidateLogin = (req, res, next) => {
  console.log('🔐 Validating login request:', req.body);
  console.log('🔐 Body type:', typeof req.body);
  console.log('🔐 Headers:', req.headers['content-type']);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    console.log('❌ Validation failed: missing email or password');
    return res.status(400).json({
      success: false,
      message: 'Email și parola sunt obligatorii',
      errors: []
    });
  }
  
  // Validare simplă email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Validation failed: invalid email format');
    return res.status(400).json({
      success: false,
      message: 'Format email invalid',
      errors: []
    });
  }
  
  console.log('✅ Validation passed, calling next()');
  next();
  console.log('✅ After next() call');
};

// Validator simplu pentru register
const simpleValidateRegister = (req, res, next) => {
  console.log('🔐 Validating register request:', req.body);
  const { email, password, firstName, lastName } = req.body;
  
  const errors = [];
  
  if (!email) errors.push('Email este obligatoriu');
  if (!password) errors.push('Parola este obligatorie');
  if (!firstName) errors.push('Prenumele este obligatoriu');
  if (!lastName) errors.push('Numele este obligatoriu');
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Date incomplete',
      errors: errors
    });
  }
  
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Parola trebuie să aibă minim 8 caractere',
      errors: ['Parola prea scurtă']
    });
  }
  
  console.log('✅ Register validation passed');
  next();
};

// Wrapper pentru a verifica că funcțiile există
const safeController = (controllerFunction, functionName) => {
  return (req, res, next) => {
    console.log(`🎯 Calling ${functionName}...`);
    if (typeof controllerFunction === 'function') {
      return controllerFunction(req, res, next);
    } else {
      console.error(`❌ ${functionName} is not a function!`);
      res.status(500).json({
        success: false,
        message: `Internal error: ${functionName} not found`
      });
    }
  };
};

// Verifică că authController are toate funcțiile
console.log('📦 AuthController functions:', Object.keys(authController || {}));

// Rute publice
router.post('/register', 
  simpleValidateRegister, 
  safeController(authController.register, 'register')
);

// Login - cu validator simplu și wrapper
router.post('/login', 
  simpleValidateLogin, 
  safeController(authController.login, 'login')
);

// Login fără validare pentru test
router.post('/login-no-validation', 
  (req, res, next) => {
    console.log('🚀 Direct login call with body:', req.body);
    next();
  },
  safeController(authController.login, 'login-direct')
);

// Forgot password
router.post('/forgot-password', 
  (req, res, next) => {
    console.log('📧 Forgot password request:', req.body);
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: 'Email este obligatoriu'
      });
    }
    next();
  },
  safeController(authController.forgotPassword, 'forgotPassword')
);

// Reset password
router.post('/reset-password', 
  safeController(authController.resetPassword, 'resetPassword')
);

// Verify email
router.get('/verify-email/:token', 
  safeController(authController.verifyEmail, 'verifyEmail')
);

// Refresh token
router.post('/refresh-token', 
  safeController(authController.refreshToken, 'refreshToken')
);

// Rute protejate
router.post('/logout', 
  protect, 
  safeController(authController.logout, 'logout')
);

// Debug route pentru a vedea toate rutele
router.get('/debug/routes', (req, res) => {
  const routes = [];
  router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      routes.push({
        path: r.route.path,
        methods: Object.keys(r.route.methods)
      });
    }
  });
  res.json({
    success: true,
    routes: routes,
    authControllerFunctions: Object.keys(authController || {})
  });
});

module.exports = router;