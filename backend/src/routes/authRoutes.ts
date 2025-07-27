import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../server';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2024';

// Login
router.post('/login', async (req: Request, res: Response) => {
  console.log('=================== LOGIN ATTEMPT ===================');
  console.log('🔍 Full body:', JSON.stringify(req.body));
  console.log('📧 Email:', req.body.email, 'Type:', typeof req.body.email);
  console.log('🔑 Has password:', !!req.body.password);
  console.log('🔑 Headers:', req.headers['content-type']);
  console.log('==================================================');
  
  try {
    let { email, password } = req.body;
    
    // Fix pentru cazul în care datele vin într-un obiect nested
    if (!email && req.body.data) {
      console.log('⚠️ Detected nested data structure, extracting...');
      email = req.body.data.email;
      password = req.body.data.password;
    }
    
    // Validare
    if (!email || !password) {
      console.error('❌ Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Email și parola sunt obligatorii' 
      });
    }
    
    // Normalizare email
    email = email.trim().toLowerCase();
    console.log('✅ Normalized email:', email);

    // Query pentru utilizator
    const result = await pool.query(
      `SELECT id, username, email, password_hash, role, status,
       first_name, last_name,
       COALESCE(CONCAT(first_name, ' ', last_name), username) as name
       FROM users 
       WHERE email = $1 OR username = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const user = result.rows[0];
    console.log('👤 User found:', { id: user.id, email: user.email, status: user.status });
    
    // Verifică status
    if (user.status !== 'active') {
      console.log('❌ User not active:', user.status);
      return res.status(403).json({
        success: false,
        message: 'Contul tău este inactiv. Contactează administratorul.'
      });
    }
    
    // Verifică parola
    console.log('🔐 Checking password...');
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      console.log('❌ Invalid password for user:', user.email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Password valid, generating token...');
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generare token cu structură consistentă
    const token = jwt.sign(
      { 
        id: user.id, 
        userId: user.id, // pentru compatibilitate
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', user.email);
    
    // Răspuns consistent cu ce așteaptă frontend-ul
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name || `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  console.log('=================== REGISTER ATTEMPT ===================');
  console.log('📝 Body:', req.body);
  
  try {
    let { email, password, firstName, lastName } = req.body;
    
    // Fix pentru date nested
    if (!email && req.body.data) {
      email = req.body.data.email;
      password = req.body.data.password;
      firstName = req.body.data.firstName;
      lastName = req.body.data.lastName;
    }
    
    // Validare
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Toate câmpurile sunt obligatorii'
      });
    }
    
    // Normalizare
    email = email.trim().toLowerCase();
    const username = email.split('@')[0];

    // Verifică dacă există deja
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, username, first_name, last_name, role`,
      [email, username, hashedPassword, firstName, lastName, 'user', 'active']
    );

    const newUser = result.rows[0];
    
    const token = jwt.sign(
      { 
        id: newUser.id,
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.first_name} ${newUser.last_name}`,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('🔍 Decoded token:', { id: decoded.id, userId: decoded.userId });
      
      const userId = decoded.userId || decoded.id;
      
      const result = await pool.query(
        `SELECT 
          id, 
          username,
          first_name,
          last_name,
          COALESCE(CONCAT(first_name, ' ', last_name), username) as name,
          email, 
          role,
          phone,
          status
        FROM users 
        WHERE id = $1`,
        [userId]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const user = result.rows[0];
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          phone: user.phone,
          status: user.status
        }
      });
      
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;