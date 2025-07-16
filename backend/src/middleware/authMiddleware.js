const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware pentru verificare token JWT
const protect = async (req, res, next) => {
  try {
    let token;

    // Verifică dacă există token în header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extrage token-ul din header
      token = req.headers.authorization.split(' ')[1];
    }

    // Verifică dacă token-ul există
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Nu ești autentificat! Te rog loghează-te pentru acces.'
      });
    }

    try {
      // Verifică și decodează token-ul
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Caută utilizatorul în baza de date
      const user = await pool.query(
        `SELECT id, email, username, role, status, 
                preferred_language, theme_preference 
         FROM users 
         WHERE id = $1`,
        [decoded.id]
      );

      if (user.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Utilizatorul asociat cu acest token nu mai există!'
        });
      }

      // Verifică dacă contul este activ
      if (user.rows[0].status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Contul tău a fost suspendat. Contactează administratorul.'
        });
      }

      // Adaugă utilizatorul la request
      req.user = user.rows[0];
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token-ul tău a expirat! Te rog loghează-te din nou.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token invalid! Te rog loghează-te din nou.'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Eroare în middleware de autentificare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la verificarea autentificării!'
    });
  }
};

// Middleware pentru a restricționa accesul doar pentru admin
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acces interzis! Această rută este doar pentru administratori.'
    });
  }
};

// Middleware pentru a verifica rolurile specifice
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nu ești autentificat!'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rolul tău (${req.user.role}) nu are acces la această resursă!`
      });
    }

    next();
  };
};

// Middleware opțional - verifică autentificarea dar nu o cere
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await pool.query(
          `SELECT id, email, username, role, status 
           FROM users 
           WHERE id = $1 AND status = 'active'`,
          [decoded.id]
        );

        if (user.rows.length > 0) {
          req.user = user.rows[0];
        }
      } catch (error) {
        // Token invalid, dar continuăm fără user
        console.log('Token invalid în optionalAuth:', error.message);
      }
    }

    // Continuă chiar dacă nu există token sau e invalid
    next();
  } catch (error) {
    console.error('Eroare în optionalAuth:', error);
    next();
  }
};

module.exports = {
  protect,
  adminOnly,
  authorize,
  optionalAuth
};
