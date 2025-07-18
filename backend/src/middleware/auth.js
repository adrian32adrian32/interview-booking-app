// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    // Obține token din header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token lipsă sau format invalid'
      });
    }

    const token = authHeader.substring(7); // Elimină "Bearer "

    // Verifică și decodează token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obține utilizatorul din baza de date
    const result = await pool.query(
      'SELECT id, email, username, role, first_name, last_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Utilizator negăsit'
      });
    }

    // Adaugă utilizatorul la request
    req.user = result.rows[0];
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirat'
      });
    }

    console.error('Eroare autentificare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server la autentificare'
    });
  }
};

module.exports = { authenticate };