const { body, validationResult } = require('express-validator');

// Validatoare pentru înregistrare
const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Te rugăm să introduci o adresă de email validă')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Parola trebuie să aibă minim 8 caractere')
    .matches(/^(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Parola trebuie să conțină cel puțin o literă mare și o cifră'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Numele este obligatoriu')
    .isLength({ min: 2, max: 50 })
    .withMessage('Numele trebuie să aibă între 2 și 50 de caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/)
    .withMessage('Numele poate conține doar litere, spații și cratime'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Prenumele este obligatoriu')
    .isLength({ min: 2, max: 50 })
    .withMessage('Prenumele trebuie să aibă între 2 și 50 de caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/)
    .withMessage('Prenumele poate conține doar litere, spații și cratime'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im)
    .withMessage('Număr de telefon invalid')
];

// Validatoare pentru login
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Te rugăm să introduci o adresă de email validă')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Parola este obligatorie')
];

// Validator pentru forgot password
const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Te rugăm să introduci o adresă de email validă')
    .normalizeEmail()
];

// Validator pentru reset password
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token-ul de resetare este obligatoriu'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Parola nouă trebuie să aibă minim 8 caractere')
    .matches(/^(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Parola trebuie să conțină cel puțin o literă mare și o cifră')
];

// Validator pentru schimbare parolă (user autentificat)
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Parola curentă este obligatorie'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Parola nouă trebuie să aibă minim 8 caractere')
    .matches(/^(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Parola trebuie să conțină cel puțin o literă mare și o cifră')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('Parola nouă trebuie să fie diferită de cea curentă')
];

// Validator pentru actualizare profil
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Numele trebuie să aibă între 2 și 50 de caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/)
    .withMessage('Numele poate conține doar litere, spații și cratime'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Prenumele trebuie să aibă între 2 și 50 de caractere')
    .matches(/^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/)
    .withMessage('Prenumele poate conține doar litere, spații și cratime'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im)
    .withMessage('Număr de telefon invalid (acceptăm numere internaționale)')
];

// Validator pentru creare programare
const validateBooking = [
  body('client_name')
    .trim()
    .notEmpty()
    .withMessage('Numele este obligatoriu')
    .isLength({ min: 2, max: 100 })
    .withMessage('Numele trebuie să aibă între 2 și 100 de caractere'),
  
  body('client_email')
    .isEmail()
    .withMessage('Email invalid')
    .normalizeEmail(),
  
  body('client_phone')
    .notEmpty()
    .withMessage('Telefonul este obligatoriu')
    .matches(/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/im)
    .withMessage('Număr de telefon invalid (acceptăm numere internaționale)'),
  
  body('interview_date')
    .notEmpty()
    .withMessage('Data este obligatorie')
    .isISO8601()
    .withMessage('Format dată invalid'),
  
  body('interview_time')
    .notEmpty()
    .withMessage('Ora este obligatorie')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format oră invalid (HH:MM)'),
  
  body('interview_type')
    .optional()
    .isIn(['online', 'in_person', 'onsite'])
    .withMessage('Tip interviu invalid')
];

// Middleware pentru a procesa erorile de validare
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Date invalide',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateBooking,
  handleValidationErrors
};