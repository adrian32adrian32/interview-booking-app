const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Login
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Te rog completează toate câmpurile!'
      });
    }

    const userQuery = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [emailOrUsername]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email/username sau parolă incorectă!'
      });
    }

    const user = userQuery.rows[0];

    // Verifică parola cu password_hash (nu password!)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email/username sau parolă incorectă!'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Eroare la login:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la autentificare!'
    });
  }
};

// Register
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Toate câmpurile sunt obligatorii!'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Parola trebuie să aibă minim 6 caractere!'
      });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email-ul sau username-ul există deja!'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      'INSERT INTO users (email, username, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, role',
      [email, username, hashedPassword, 'user', 'active']
    );

    const user = newUser.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Eroare la înregistrare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la înregistrare!'
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT id, email, username, role, status FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator negăsit!'
      });
    }

    res.json({
      success: true,
      data: userQuery.rows[0]
    });

  } catch (error) {
    console.error('Eroare la getMe:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea datelor!'
    });
  }
};

const updateProfile = async (req, res) => {
  res.json({ success: true, message: "Update profile - în dezvoltare" });
};

const changePassword = async (req, res) => {
  res.json({ success: true, message: "Change password - în dezvoltare" });
};

module.exports = {
  login,
  register,
  getMe,
  updateProfile,
  changePassword
};