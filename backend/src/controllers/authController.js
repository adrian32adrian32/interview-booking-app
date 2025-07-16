const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Funcție pentru generare token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d' 
    }
  );
};

// Înregistrare utilizator nou
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validare date primite
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Te rog completează toate câmpurile!'
      });
    }

    // Verifică dacă email-ul există deja
    const emailCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email-ul este deja înregistrat!'
      });
    }

    // Verifică dacă username-ul există deja
    const usernameCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username-ul este deja folosit!'
      });
    }

    // Validare parolă (minim 6 caractere)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Parola trebuie să aibă minim 6 caractere!'
      });
    }

    // Hash parolă
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Salvare utilizator în baza de date
    const newUser = await pool.query(
      `INSERT INTO users (email, username, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, username, role, created_at`,
      [email, username, hashedPassword]
    );

    // Creează și profilul utilizatorului
    await pool.query(
      `INSERT INTO user_profiles (user_id) VALUES ($1)`,
      [newUser.rows[0].id]
    );

    // Generează token
    const token = generateToken(newUser.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Cont creat cu succes!',
      data: {
        user: {
          id: newUser.rows[0].id,
          email: newUser.rows[0].email,
          username: newUser.rows[0].username,
          role: newUser.rows[0].role
        },
        token
      }
    });

  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea contului!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login utilizator
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Validare date
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Te rog completează toate câmpurile!'
      });
    }

    // Caută utilizatorul după email sau username
    const user = await pool.query(
      `SELECT * FROM users 
       WHERE email = $1 OR username = $1`,
      [emailOrUsername]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email/username sau parolă incorectă!'
      });
    }

    // Verifică parola
    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email/username sau parolă incorectă!'
      });
    }

    // Verifică dacă contul este activ
    if (user.rows[0].status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Contul tău a fost suspendat. Contactează administratorul.'
      });
    }

    // Generează token
    const token = generateToken(user.rows[0]);

    res.json({
      success: true,
      message: 'Autentificare reușită!',
      data: {
        user: {
          id: user.rows[0].id,
          email: user.rows[0].email,
          username: user.rows[0].username,
          role: user.rows[0].role
        },
        token
      }
    });

  } catch (error) {
    console.error('Eroare la login:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare!',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Celelalte funcții rămân simple pentru moment
const getMe = async (req, res) => {
  res.json({ success: true, message: "GetMe endpoint works!", user: req.user });
};

const updateProfile = async (req, res) => {
  res.json({ success: true, message: "UpdateProfile endpoint works!" });
};

const changePassword = async (req, res) => {
  res.json({ success: true, message: "ChangePassword endpoint works!" });
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
