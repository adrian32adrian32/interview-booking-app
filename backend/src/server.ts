import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// ===== RATE LIMITERS CONFIGURATION =====
const createRateLimiter = (windowMs: number, max: number, message: string, skipSuccessfulRequests: boolean = false) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return rateLimit({
    windowMs,
    max: isDevelopment ? max * 100 : max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    validate: false,
    keyGenerator: (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'] as string;
      const ip = forwarded 
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || req.ip || 'unknown';
      
      if (ip.includes('::ffff:')) {
        return ip.replace('::ffff:', '');
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

// Rate limiters
const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Prea multe încercări de autentificare. Vă rugăm încercați din nou peste 15 minute.'
);

const registerLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Prea multe conturi create de la această adresă IP. Încercați din nou peste o oră.',
  true
);

const apiLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Prea multe request-uri de la această adresă IP.'
);

const forgotPasswordLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Prea multe cereri de resetare parolă. Încercați din nou peste o oră.'
);

const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  20,
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
      'http://94.156.250.138:3000',
      'http://94.156.250.138:5000',
      'http://94.156.250.138',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true);
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

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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

export const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Static files for uploads
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

// ===== MOUNT ROUTES WITH PROPER ORDER =====
// Auth routes with specific rate limiters
app.use('/api/auth', (req: Request, res: Response, next: NextFunction) => {
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

// Mount all route modules
app.use('/api/bookings', bookingRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/time-slots', slotRoutes);

// ===== STANDALONE ENDPOINTS =====
// Upload endpoints
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
    
    uploadMiddleware.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nu a fost încărcat niciun fișier' });
      }
      
      const { docType = 'other', bookingId } = req.body;
      
      try {
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        const result = await pool.query(
          `INSERT INTO documents (user_id, type, filename, original_name, path, size, mime_type, status, file_url, file_name, file_size, booking_id, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [userId, docType, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, 'pending', fileUrl, req.file.originalname, req.file.size, bookingId || null, 'user']
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

app.get('/api/upload/documents', async (req: Request, res: Response) => {
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
    
    const result = await pool.query(
      `SELECT *, 
        CASE 
          WHEN uploaded_by = 'admin' THEN 'Încărcat de admin'
          ELSE 'Încărcat de tine'
        END as upload_source
      FROM documents 
      WHERE user_id = $1 
      ORDER BY uploaded_at DESC`,
      [userId]
    );
    
    res.json({ success: true, documents: result.rows });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, message: 'Eroare la obținerea documentelor' });
  }
});

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
      
      const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [adminId]);
      if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
      }
    } catch (error: any) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    uploadMiddleware.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nu a fost încărcat niciun fișier' });
      }
      
      const { userId, type = 'identity' } = req.body;
      
      try {
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
      
      const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length > 0 && userCheck.rows[0].role === 'admin') {
        isAdmin = true;
      }
    } catch (error: any) {
      console.error("Eroare JWT verify:", error.message);
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
    
    const { id } = req.params;
    
    let doc;
    if (isAdmin) {
      doc = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    } else {
      doc = await pool.query(
        'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    }
    
    if (doc.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document negăsit' });
    }
    
    if (fs.existsSync(doc.rows[0].path)) {
      fs.unlinkSync(doc.rows[0].path);
    }
    
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Document șters cu succes' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Eroare la ștergere' });
  }
});

// Download document endpoint
app.get('/api/download/document/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/documents', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const docResult = await pool.query(
      'SELECT original_name FROM documents WHERE filename = $1',
      [filename]
    );
    
    const originalName = docResult.rows[0]?.original_name || filename;
    
    res.download(filePath, originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
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
      timeSlots: '/api/time-slots',
      statistics: '/api/statistics',
      upload: '/api/upload',
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
    // Create tables if not exist
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(20) DEFAULT 'user'
    `).catch(() => {});

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

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://94.156.250.138'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`🔒 Rate limiting: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled in development'}`);
  
  initializeDatabase();
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('🛑 HTTP server closed');
    pool.end(() => {
      console.log('🛑 Database pool has ended');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('🛑 HTTP server closed');
    pool.end(() => {
      console.log('🛑 Database pool has ended');
      process.exit(0);
    });
  });
});

export default app;