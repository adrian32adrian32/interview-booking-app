const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { sendEmail } = require('../services/emailService');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Generare tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Register - Înregistrare cu nume și prenume obligatorii
const register = async (req, res) => {
  try {
    // Validare input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, firstName, lastName } = req.body;
    
    // Generează username automat din email
    const username = email.split('@')[0].toLowerCase();

    // Verifică dacă email-ul există deja
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Această adresă de email este deja înregistrată!'
      });
    }

    // Hash parolă
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generare token verificare
    const verificationToken = uuidv4();

    // Creare user nou cu username
    const newUser = await pool.query(
      `INSERT INTO users (
        email, username, password_hash, first_name, last_name, 
        role, status, verification_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, first_name, last_name, role`,
      [
        email.toLowerCase(),
        username,
        hashedPassword, 
        firstName, 
        lastName, 
        'user', 
        'active',
        verificationToken
      ]
    );

    const user = newUser.rows[0];

    // Trimite email de verificare
    try {
      await sendEmail({
        to: email,
        subject: 'Verifică-ți contul - Interview Booking',
        html: `
          <h2>Bine ai venit, ${firstName}!</h2>
          <p>Îți mulțumim pentru înregistrare. Te rugăm să-ți verifici adresa de email făcând click pe link-ul de mai jos:</p>
          <a href="${FRONTEND_URL}/verify-email/${verificationToken}" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verifică Email
          </a>
          <p>Dacă nu ai creat tu acest cont, te rugăm să ignori acest email.</p>
        `
      });
    } catch (emailError) {
      console.error('Eroare la trimiterea email-ului de verificare:', emailError);
      // Continuă cu înregistrarea chiar dacă email-ul nu se trimite
    }

    // Generare tokens
    const { accessToken, refreshToken } = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'Cont creat cu succes! Te rugăm să-ți verifici email-ul.',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea contului. Te rugăm să încerci din nou.'
    });
  }
};

// Login - Doar cu email și parolă
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    // Găsește user după email
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email sau parolă incorectă!'
      });
    }

    const user = userQuery.rows[0];

    // Verifică dacă contul este activ
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Contul tău este inactiv. Te rugăm să contactezi administratorul.'
      });
    }

    // Verifică parola
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email sau parolă incorectă!'
      });
    }

    // Generare tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Salvează refresh token în DB dacă rememberMe este true
    if (rememberMe) {
      await pool.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [refreshToken, user.id]
      );
    }

    res.json({
      success: true,
      message: 'Autentificare reușită!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          emailVerified: user.email_verified
        },
        accessToken,
        refreshToken: rememberMe ? refreshToken : null
      }
    });

  } catch (error) {
    console.error('Eroare la login:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare. Te rugăm să încerci din nou.'
    });
  }
};

// Forgot Password - Trimite email cu link de resetare
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Te rugăm să introduci adresa de email!'
      });
    }

    // Verifică dacă user-ul există
    const userQuery = await pool.query(
      'SELECT id, first_name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userQuery.rows.length === 0) {
      // Din motive de securitate, nu dezvăluim dacă email-ul există sau nu
      return res.json({
        success: true,
        message: 'Dacă adresa de email există în sistem, vei primi instrucțiuni de resetare.'
      });
    }

    const user = userQuery.rows[0];

    // Generare token resetare
    const resetToken = uuidv4();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 oră

    // Salvează token în DB
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    // Trimite email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Resetare parolă - Interview Booking',
        html: `
          <h2>Salut ${user.first_name},</h2>
          <p>Ai solicitat resetarea parolei. Făcând click pe link-ul de mai jos poți să-ți setezi o parolă nouă:</p>
          <a href="${FRONTEND_URL}/reset-password/${resetToken}" 
             style="background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Resetează Parola
          </a>
          <p>Link-ul este valid pentru următoarele 60 de minute.</p>
          <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email.</p>
        `
      });
    } catch (emailError) {
      console.error('Eroare la trimiterea email-ului:', emailError);
    }

    res.json({
      success: true,
      message: 'Dacă adresa de email există în sistem, vei primi instrucțiuni de resetare.'
    });

  } catch (error) {
    console.error('Eroare la forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la procesarea cererii. Te rugăm să încerci din nou.'
    });
  }
};

// Reset Password - Resetează parola cu token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Date incomplete!'
      });
    }

    // Verifică token valid și nu expirat
    const userQuery = await pool.query(
      `SELECT id, email, first_name, last_name, role 
       FROM users 
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );

    if (userQuery.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Link-ul de resetare este invalid sau a expirat!'
      });
    }

    const user = userQuery.rows[0];

    // Hash noua parolă
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizează parola și șterge token-ul
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    // Auto-login după resetare
    const { accessToken, refreshToken } = generateTokens(user);

    res.json({
      success: true,
      message: 'Parola a fost resetată cu succes!',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Eroare la reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la resetarea parolei. Te rugăm să încerci din nou.'
    });
  }
};

// Verify Email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const userQuery = await pool.query(
      'UPDATE users SET email_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING id',
      [token]
    );

    if (userQuery.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token invalid sau expirat!'
      });
    }

    res.json({
      success: true,
      message: 'Email verificat cu succes! Te poți autentifica acum.'
    });

  } catch (error) {
    console.error('Eroare la verificare email:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la verificarea email-ului.'
    });
  }
};

// Refresh Token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token lipsește!'
      });
    }

    // Verifică refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Găsește user
    const userQuery = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND refresh_token = $2',
      [decoded.id, refreshToken]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token invalid!'
      });
    }

    const user = userQuery.rows[0];

    // Generează tokens noi
    const tokens = generateTokens(user);

    // Actualizează refresh token în DB
    await pool.query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, user.id]
    );

    res.json({
      success: true,
      data: tokens
    });

  } catch (error) {
    console.error('Eroare la refresh token:', error);
    res.status(401).json({
      success: false,
      message: 'Token invalid sau expirat!'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Verifică dacă req.user există
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Utilizator neautentificat!'
      });
    }

    // Șterge refresh token din DB
    await pool.query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Deconectare reușită!'
    });

  } catch (error) {
    console.error('Eroare la logout:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la deconectare.'
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
  logout
};
