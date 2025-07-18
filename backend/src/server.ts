import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';

// Import routes
import authRoutes from './routes/authRoutes';
import uploadRoutes from './routes/uploadRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 5000;

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
      'http://localhost:3001',
      'http://localhost:3002',
      'http://94.156.250.138:3000',
      'http://94.156.250.138:3001',
      'http://94.156.250.138:3002',
      'http://94.156.250.138',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
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

// Static files for uploads
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);

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

// Booking Routes - Folosind tabelul client_bookings
// Get available time slots
app.get('/api/bookings/time-slots/available/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Toate sloturile posibile (9:00 - 18:00, interval 30 min)
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Obține sloturile ocupate pentru data respectivă
    const bookedSlots = await pool.query(
      `SELECT interview_time as time_slot 
      FROM client_bookings 
      WHERE interview_date = $1
      AND status != 'cancelled'`,
      [date]
    );
    
    const bookedTimes = bookedSlots.rows.map(row => row.time_slot);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({
      success: true,
      date,
      allSlots,
      availableSlots,
      bookedSlots: bookedTimes,
      workingHours: {
        start: '09:00',
        end: '18:00',
        interval: 30
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch available slots' 
    });
  }
});

// Get all bookings
app.get('/api/bookings', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        client_name,
        client_email,
        client_phone,
        interview_date,
        interview_time,
        interview_type,
        status,
        notes,
        created_at,
        updated_at
      FROM client_bookings 
      ORDER BY interview_date DESC, interview_time DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bookings' 
    });
  }
});

// Create new booking
app.post('/api/bookings', async (req: Request, res: Response) => {
  try {
    const {
      client_name,
      client_email,
      client_phone,
      interview_date,
      interview_time,
      interview_type = 'online',
      notes = '',
      status = 'confirmed'
    } = req.body;

    // Validate required fields
    if (!client_name || !client_email || !client_phone || !interview_date || !interview_time) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Check if slot is already booked
    const existingBooking = await pool.query(
      `SELECT id FROM client_bookings 
       WHERE interview_date = $1
       AND interview_time = $2
       AND status != 'cancelled'`,
      [interview_date, interview_time]
    );

    if (existingBooking.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'This time slot is already booked' 
      });
    }

    // Insert new booking
    const result = await pool.query(
      `INSERT INTO client_bookings 
       (client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes, status]
    );

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update booking
app.put('/api/bookings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE client_bookings 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Booking not found' 
      });
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update booking' 
    });
  }
});

// Delete booking
app.delete('/api/bookings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM client_bookings WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Booking not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Booking deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete booking' 
    });
  }
});

// Endpoint pentru auth/me
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  res.json({
    success: true,
    user: {
      id: 1,
      name: 'Administrator',
      email: 'admin@example.com',
      role: 'admin'
    }
  });
});

// Endpoint for users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT 
        id, 
        username,
        COALESCE(CONCAT(first_name, ' ', last_name), username) as name,
        email, 
        role, 
        phone, 
        created_at,
        last_login
      FROM users
    `;
    const queryParams: any[] = [];
    
    // Filtrare după rol dacă e specificat
    if (req.query.role) {
      query += ' WHERE role = $1';
      queryParams.push(req.query.role);
    }
    
    query += ' ORDER BY created_at DESC';
    
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');

    // Check if admin exists by username OR email
    const adminEmail = 'admin@example.com';
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
        console.log('   📧 Email: admin@example.com');
        console.log('   🔑 Password: admin123');
      } else {
        console.log('✅ Admin user already exists');
      }
    } catch (adminError: any) {
      if (adminError.code === '23505') {
        // Duplicate key error - admin already exists
        console.log('✅ Admin user already exists');
      } else {
        console.error('❌ Error creating admin user:', adminError.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Error initializing database:', error.message);
    // Nu oprim serverul din cauza erorilor de DB
  }
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://94.156.250.138:3000'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  
  // Initialize database
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