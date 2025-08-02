import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/authRoutes';
import bookingRoutes from './routes/bookingRoutes';
import statisticsRoutes from './routes/statisticsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import userRoutes from './routes/userRoutes';
import slotRoutes from './routes/slotRoutes';
import timeSlotRoutes from './routes/timeSlotRoutes';
import exportRoutes from './routes/exportRoutes';
import emailTemplateRoutes from './routes/emailTemplateRoutes';

// Import services
import { initCronJobs } from './services/cronJobs';
import emailService from './services/emailService';
import { initializeReminderSystem } from './services/reminderService'; // ADĂUGAT
import { createServer } from 'http';
import { socketService } from './services/socketService';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2024';

// Database connection
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'interview_booking_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || undefined,
  ssl: false
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to the database:', err.stack);
  } else {
    console.log('✅ Successfully connected to PostgreSQL database');
    release();
  }
});

// ===== RATE LIMITERS CONFIGURATION WITH FIX =====
// Helper function to create rate limiter with IPv6 fix
const createRateLimiter = (windowMs: number, max: number, message: string, skipSuccessfulRequests: boolean = false) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return rateLimit({
    windowMs,
    max: isDevelopment ? max * 100 : max, // 100x mai permisiv în development
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    // Fix pentru IPv6 - disable IP validation
    validate: false,
    // Simple key generator that handles IPv6
    keyGenerator: (req: Request) => {
      // Get IP from various sources
      const forwarded = req.headers['x-forwarded-for'] as string;
      const ip = forwarded 
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || req.ip || 'unknown';
      
      // Normalize IPv6 addresses
      if (ip.includes('::ffff:')) {
        return ip.replace('::ffff:', ''); // Convert IPv6-mapped IPv4 to regular IPv4
      }
      
      return ip;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: message
      });
    }
  });
};

// Rate limiter pentru login - mai restrictiv
const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minute
  5, // maxim 5 încercări în production, 500 în development
  'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.'
);

// Rate limiter pentru înregistrare
const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 oră
  3, // maxim 3 conturi noi per IP
  'Prea multe conturi create de la această adresă IP. Încercați din nou peste o oră.',
  true // skipSuccessfulRequests
);

// Rate limiter general pentru API
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minute
  100, // maxim 100 requests
  'Prea multe request-uri de la această adresă IP.'
);

// Rate limiter pentru forgot password
const forgotPasswordLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 oră
  3, // maxim 3 încercări
  'Prea multe cereri de resetare parolă. Încercați din nou peste o oră.'
);

// Rate limiter pentru upload fișiere
const uploadLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 oră
  20, // maxim 20 upload-uri pe oră
  'Ați atins limita de upload-uri. Încercați din nou peste o oră.'
);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:3002',
      'http://localhost:3001',
      'http://94.156.250.138:3000',
      'http://94.156.250.138:5000',
      'http://94.156.250.138:3002',
      'http://94.156.250.138:3001',
      'http://94.156.250.138',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Custom request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads/documents');
const avatarDir = path.join(__dirname, '../uploads/avatars');
const tempDir = path.join(__dirname, '../uploads/temp');
[uploadDir, avatarDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Doar imagini (JPEG, PNG) și PDF-uri sunt permise!'));
    }
  }
});

// Static files for uploads - UPDATED with proper CORS headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: pool ? 'connected' : 'disconnected'
  });
});

// Apply general API rate limiting to all /api routes
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
}

// API Routes with specific rate limiters
// Auth routes with specific limiters for sensitive endpoints
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
  // Apply specific rate limiters based on the path ONLY in production
  if (process.env.NODE_ENV === 'production') {
    if (req.path === '/login' && req.method === 'POST') {
      loginLimiter(req, res, next);
    } else if (req.path === '/register' && req.method === 'POST') {
      registerLimiter(req, res, next);
    } else if (req.path === '/forgot-password' && req.method === 'POST') {
      forgotPasswordLimiter(req, res, next);
    } else {
      next();
    }
  } else {
    next();
  }
}, authRoutes);

// Time slots endpoint
app.get('/api/time-slots', (req: Request, res: Response) => {
  res.json({
    slots: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
    workingHours: {
      start: '09:00',
      end: '18:00',
      interval: 30
    }
  });
});

// IMPORTANT: Get user's bookings - MUST BE BEFORE general bookingRoutes
app.get('/api/bookings/my-bookings', async (req: Request, res: Response) => {
  try {
    console.log('📥 My-bookings route hit');
    
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    let userId;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
      console.log('Decoded user ID:', userId);
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    // Get user's email
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userEmail = userResult.rows[0].email;
    console.log('User email:', userEmail);
    
    // Get bookings with document count
    const result = await pool.query(`
      SELECT 
        cb.id,
        cb.client_name,
        cb.client_email,
        cb.client_phone,
        cb.interview_date,
        cb.interview_time,
        cb.interview_type,
        cb.status,
        cb.notes,
        cb.created_at,
        COUNT(DISTINCT d.id) as documents_count
      FROM client_bookings cb
      LEFT JOIN documents d ON d.booking_id = cb.id
      WHERE cb.client_email = $1
      GROUP BY cb.id
      ORDER BY cb.interview_date DESC, cb.interview_time DESC
    `, [userEmail]);
    
    console.log('Found bookings:', result.rows.length);
    
    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Error in my-bookings route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auth me endpoint - MOVED HERE to be before general routes
app.get('/api/auth/me', async (req: Request, res: Response) => {
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
      
      const result = await pool.query(
        `SELECT 
          id, 
          username,
          first_name,
          last_name,
          COALESCE(CONCAT(first_name, ' ', last_name), username) as name,
          email, 
          role,
          phone
        FROM users 
        WHERE id = $1`,
        [decoded.userId || decoded.id]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        user: result.rows[0]
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

// Update user profile
app.put('/api/users/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    const { first_name, last_name, phone } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, first_name, last_name, email, phone, role`,
      [first_name, last_name, phone, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Eroare la actualizarea profilului' });
  }
});

// Available slots endpoint - MUST BE BEFORE general bookingRoutes
app.get('/api/bookings/available-slots', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data este obligatorie' 
      });
    }
    
    // Default slots pentru toate zilele
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Get existing bookings for this date
    const bookingsResult = await pool.query(`
      SELECT interview_time, status 
      FROM client_bookings 
      WHERE interview_date = $1 
      AND status IN ('pending', 'confirmed')
    `, [date]);
    
    const bookedTimes = bookingsResult.rows.map(b => b.interview_time);
    
    // Create available slots
    const slots = defaultSlots.map((time, index) => ({
      id: `slot-${date}-${index}`,
      date: date as string,
      time: time,
      available: !bookedTimes.includes(time),
      available_spots: bookedTimes.includes(time) ? 0 : 1
    }));
    
    res.json({
      success: true,
      data: {
        date: date,
        slots: slots
      }
    });
    
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la încărcarea sloturilor disponibile' 
    });
  }
});

// Admin dashboard statistics
app.get('/api/statistics/dashboard', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId || decoded.id;
      
      // Verifică dacă e admin
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    // Get statistics
    const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
    const totalBookingsResult = await pool.query('SELECT COUNT(*) FROM client_bookings');
    const todayInterviewsResult = await pool.query(
      'SELECT COUNT(*) FROM client_bookings WHERE interview_date = CURRENT_DATE'
    );
    
    // Conversion rate (bookings per user)
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    const totalBookings = parseInt(totalBookingsResult.rows[0].count);
    const conversionRate = totalUsers > 0 ? Math.round((totalBookings / totalUsers) * 100) : 0;
    
    // Weekly evolution
    const weeklyResult = await pool.query(`
      SELECT 
        DATE_TRUNC('week', interview_date) as week,
        COUNT(*) as count
      FROM client_bookings
      WHERE interview_date >= CURRENT_DATE - INTERVAL '4 weeks'
      GROUP BY week
      ORDER BY week
    `);
    
    // Status distribution
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM client_bookings
      GROUP BY status
    `);
    
    res.json({
      success: true,
      data: {
        totalUsers: totalUsers,
        totalBookings: totalBookings,
        todayInterviews: parseInt(todayInterviewsResult.rows[0].count),
        conversionRate: conversionRate,
        weeklyEvolution: weeklyResult.rows,
        statusDistribution: statusResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ success: false, message: 'Eroare la încărcarea statisticilor' });
  }
});

// NOW add general routes AFTER specific routes
app.use('/api/bookings', bookingRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/time-slots', timeSlotRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/emails', emailTemplateRoutes);

// Upload document endpoint - with rate limiting
app.post('/api/upload/document', uploadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
    } catch (error: any) {
      console.error("Eroare JWT verify:", error.message);
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    // Handle upload - IMPORTANT: folosește 'file' nu 'document'
    uploadMiddleware.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nu a fost încărcat niciun fișier' });
      }
      
      const { docType = 'other', bookingId } = req.body;
      
      try {
        // Save to database
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const result = await pool.query(
          `INSERT INTO documents (user_id, type, filename, original_name, path, size, mime_type, status, file_url, file_name, file_size, booking_id, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [userId, docType, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, 'pending', fileUrl, req.file.originalname, req.file.size, bookingId || null, 'user']
        );
        
        res.json({
          success: true,
          message: 'Document încărcat cu succes',
          document: result.rows[0],
          data: {
            id: result.rows[0].id,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ success: false, message: 'Eroare la salvarea în baza de date' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/upload/my-documents - pentru user curent
app.get('/api/upload/my-documents', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nu ești autentificat' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;

    console.log('Fetching documents for user ID:', userId);

    const result = await pool.query(`
      SELECT 
        d.*,
        cb.id as booking_ref,
        cb.interview_date,
        cb.client_name,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 'Programare #' || d.booking_id
          ELSE 'Documente profil'
        END as source
      FROM documents d
      LEFT JOIN client_bookings cb ON d.booking_id = cb.id
      WHERE d.user_id = $1
      ORDER BY d.uploaded_at DESC
    `, [userId]);

    console.log('Found documents:', result.rows.length);

    res.json({
      success: true,
      documents: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// Get documents for specific user (admin endpoint)
app.get('/api/users/:userId/documents', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const adminId = decoded.userId || decoded.id;
      
      // Verifică dacă e admin
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    const { userId } = req.params;
    
    // Get all documents for the specified user
    const result = await pool.query(
      `SELECT *, 
        CASE 
          WHEN uploaded_by = 'admin' THEN 'Admin'
          ELSE 'User'
        END as upload_source
      FROM documents 
      WHERE user_id = $1 
      ORDER BY uploaded_at DESC`,
      [userId]
    );
    
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error('Get user documents error:', error);
    res.status(500).json({ success: false, message: 'Eroare la obținerea documentelor' });
  }
});

// Update user (admin) - INCLUDING profile data AND PASSWORD
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const adminId = decoded.userId || decoded.id;
      
      // Verifică dacă e admin
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
      }
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    const { id } = req.params;
    const { first_name, last_name, phone, role, status, password } = req.body;
    
    // Construim query-ul dinamic în funcție de ce câmpuri sunt trimise
    let updateFields = [];
    let queryParams = [];
    let paramCount = 0;

    // Adăugăm câmpurile care sunt întotdeauna actualizate
    if (first_name !== undefined) {
      paramCount++;
      updateFields.push(`first_name = $${paramCount}`);
      queryParams.push(first_name);
    }
    
    if (last_name !== undefined) {
      paramCount++;
      updateFields.push(`last_name = $${paramCount}`);
      queryParams.push(last_name);
    }
    
    if (phone !== undefined) {
      paramCount++;
      updateFields.push(`phone = $${paramCount}`);
      queryParams.push(phone);
    }
    
    if (role !== undefined) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      queryParams.push(role);
    }
    
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      queryParams.push(status);
    }
    
    // Gestionăm parola separat - hash-uim dacă este prezentă
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      paramCount++;
      updateFields.push(`password_hash = $${paramCount}`);
      queryParams.push(hashedPassword);
      console.log('🔐 Password will be updated for user ID:', id);
    }
    
    // Adăugăm updated_at
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    
    // Adăugăm ID-ul la final
    paramCount++;
    queryParams.push(id);
    
    // Construim și executăm query-ul
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, first_name, last_name, email, phone, role, status
    `;
    
    console.log('📝 Update query:', updateQuery);
    console.log('📝 Query params count:', queryParams.length);
    
    const result = await pool.query(updateQuery, queryParams);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      user: result.rows[0],
      message: password ? 'Utilizator și parolă actualizate cu succes!' : 'Utilizator actualizat cu succes!'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Eroare la actualizarea utilizatorului' });
  }
});

// Delete document
app.delete('/api/upload/document/:id', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    let isAdmin = false;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
      
      // Check if admin
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length > 0 && userCheck.rows[0].role === 'admin') {
        isAdmin = true;
      }
    } catch (error: any) {
      console.error("Eroare JWT verify:", error.message);
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    const { id } = req.params;
    
    // Get document
    let doc;
    if (isAdmin) {
      // Admin can delete any document
      doc = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    } else {
      // User can only delete their own documents
      doc = await pool.query(
        'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    }
    
    if (doc.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document negăsit' });
    }
    
    // Delete file
    if (fs.existsSync(doc.rows[0].path)) {
      fs.unlinkSync(doc.rows[0].path);
    }
    
    // Delete from DB
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Document șters cu succes' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Eroare la ștergere' });
  }
});

// Get all users (admin) - MOVED after specific routes
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT 
        u.id, 
        u.username,
        u.first_name,
        u.last_name,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.username) as name,
        u.email, 
        u.role,
        COALESCE(u.status, 'active') as status,
        u.phone, 
        u.created_at,
        u.last_login,
        COUNT(DISTINCT b.id) as bookings_count,
        COUNT(DISTINCT d.id) as documents_count
      FROM users u
      LEFT JOIN client_bookings b ON b.client_email = u.email
      LEFT JOIN documents d ON d.user_id = u.id
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.status, u.phone, u.created_at, u.last_login
    `;
    const queryParams: any[] = [];
    
    if (req.query.role) {
      query += ' HAVING u.role = $1';
      queryParams.push(req.query.role);
    }
    
    query += ' ORDER BY u.created_at DESC';
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// Upload document for user (admin only) - with rate limiting
app.post('/api/upload/admin-document', uploadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    let adminId: number;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      adminId = decoded.userId || decoded.id;
      
      // Verifică dacă e admin
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
      }
    } catch (error: any) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    // Handle upload - IMPORTANT: folosește 'file' nu 'document'
    uploadMiddleware.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nu a fost încărcat niciun fișier' });
      }
      
      const { userId, type = 'identity' } = req.body;
      
      try {
        // Save to database - IMPORTANT: use the userId from body, not adminId
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const result = await pool.query(
          `INSERT INTO documents (user_id, type, filename, original_name, path, size, mime_type, status, file_url, file_name, file_size, verified_by_admin, verified_at, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
          [userId, type, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, 'verified', fileUrl, req.file.originalname, req.file.size, true, new Date(), 'admin']
        );
        
        res.json({
          success: true,
          message: 'Document încărcat cu succes',
          document: result.rows[0]
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        res.status(500).json({ success: false, message: 'Eroare la salvarea în baza de date' });
      }
    });
  } catch (error) {
    next(error);
  }
});

// Download document endpoint - ACTUALIZAT pentru a verifica autentificarea din header
app.get('/api/download/document/:filename', async (req: Request, res: Response) => {
  try {
    // Verifică autentificarea
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nu ești autentificat' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    let userRole: string;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
      userRole = decoded.role;
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalid' 
      });
    }
    
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/documents', filename);
    
    // Verifică dacă fișierul există
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        message: 'Fișierul nu a fost găsit' 
      });
    }
    
    // Verifică permisiunile
    const docResult = await pool.query(
      'SELECT user_id, original_name FROM documents WHERE filename = $1',
      [filename]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Document negăsit în baza de date' 
      });
    }
    
    const document = docResult.rows[0];
    
    // Verifică dacă utilizatorul are dreptul să descarce
    if (userRole !== 'admin' && document.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Nu ai permisiunea să descarci acest document' 
      });
    }
    
    const originalName = document.original_name || filename;
    
    // Setează headers pentru download
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Trimite fișierul
    res.download(filePath, originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Eroare la descărcarea documentului' 
    });
  }
});

// Get document by ID for download
app.get('/api/upload/download/:id', async (req: Request, res: Response) => {
  try {
    // Verifică autentificarea
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nu ești autentificat' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    let userId: number;
    let userRole: string;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
      userRole = decoded.role;
    } catch (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token invalid' 
      });
    }
    
    const { id } = req.params;
    
    // Get document details
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Document negăsit' 
      });
    }
    
    const document = docResult.rows[0];
    
    // Verifică permisiunile
    if (userRole !== 'admin' && document.user_id !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'Nu ai permisiunea să descarci acest document' 
      });
    }
    
    const filePath = path.join(__dirname, '../uploads/documents', document.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        message: 'Fișierul nu a fost găsit pe server' 
      });
    }
    
    // Trimite fișierul
    res.download(filePath, document.original_name || document.filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Eroare la descărcarea documentului' 
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Interview Booking API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      bookings: '/api/bookings',
      timeSlots: '/api/bookings/time-slots',
      upload: '/api/upload',
      download: '/api/download',
      health: '/health'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  console.log(`⚠️ 404 - Not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('❌ Error:', err);
  
  // Handle rate limit errors specifically
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: err.message || 'Too many requests',
      retryAfter: err.retryAfter
    });
  }
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Create client_bookings table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_bookings (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50) NOT NULL,
        interview_date DATE NOT NULL,
        interview_time VARCHAR(10) NOT NULL,
        interview_type VARCHAR(20) DEFAULT 'online',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reminder_24h_sent BOOLEAN DEFAULT FALSE,
        reminder_1h_sent BOOLEAN DEFAULT FALSE,
        followup_sent BOOLEAN DEFAULT FALSE
      )
    `);

    // Adaugă coloanele pentru remindere dacă nu există (pentru baze de date existente)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_bookings' AND column_name='reminder_24h_sent') THEN
          ALTER TABLE client_bookings ADD COLUMN reminder_24h_sent BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_bookings' AND column_name='reminder_1h_sent') THEN
          ALTER TABLE client_bookings ADD COLUMN reminder_1h_sent BOOLEAN DEFAULT FALSE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_bookings' AND column_name='followup_sent') THEN
          ALTER TABLE client_bookings ADD COLUMN followup_sent BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES client_bookings(id) ON DELETE SET NULL,
        type VARCHAR(50) DEFAULT 'other',
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        path TEXT,
        size INTEGER,
        mime_type VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        file_url TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        verified_by_admin BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        uploaded_by VARCHAR(20) DEFAULT 'user',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_email ON client_bookings(client_email);
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON client_bookings(interview_date);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON client_bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_reminders ON client_bookings(interview_date, status) WHERE status = 'confirmed';
      CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_documents_booking ON documents(booking_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('✅ Database tables initialized');

    // Check if admin exists
    const adminEmail = 'admin@interview-app.com';
    const adminUsername = 'admin';
    
    try {
      const checkAdmin = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [adminUsername, adminEmail]
      );

      if (checkAdmin.rows.length === 0) {
        console.log('📝 Creating default admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await pool.query(
          'INSERT INTO users (username, first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)',
          [adminUsername, 'Admin', 'User', adminEmail, hashedPassword, 'admin']
        );
        
        console.log('✅ Default admin user created');
        console.log('   📧 Email: admin@interview-app.com');
        console.log('   🔑 Password: admin123');
      } else {
        console.log('✅ Admin user already exists');
      }
    } catch (adminError: any) {
      if (adminError.code === '23505') {
        console.log('✅ Admin user already exists');
      } else {
        console.error('❌ Error creating admin user:', adminError.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Error initializing database:', error.message);
  }
}

// Create HTTP server and initialize Socket.io
const httpServer = createServer(app);
socketService.initialize(httpServer);

// Start server
const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://94.156.250.138'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`🔒 Rate limiting: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled in development'}`);
  console.log(`🔔 Socket.io: Enabled`);

  // Initialize database
  initializeDatabase();
  // Initialize cron jobs
  initCronJobs();
  // Initialize reminder system
  initializeReminderSystem();
});
  

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('🛑 HTTP server closed');
    pool.end(() => {
      console.log('🛑 Database pool has ended');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('🛑 HTTP server closed');
    pool.end(() => {
      console.log('🛑 Database pool has ended');
      process.exit(0);
    });
  });
});

export default app;