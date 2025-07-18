"use strict";
// backend/src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
// Import routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Database connection
exports.pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'interview_booking_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined, // Schimbă din '' în undefined
    ssl: false
});
// Test database connection
exports.pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to the database:', err.stack);
    }
    else {
        console.log('✅ Successfully connected to PostgreSQL database');
        release();
    }
});
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, compression_1.default)());
// CORS configuration - IMPORTANT: Must be before routes
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3002',
            'http://94.156.250.138:3000',
            'http://94.156.250.138:3002',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.log('⚠️ CORS blocked origin:', origin);
            callback(null, true); // În development, permite toate originile
            // callback(new Error('Not allowed by CORS')); // În production, blochează
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400 // 24 hours
};
app.use((0, cors_1.default)(corsOptions));
// Handle preflight requests
app.options('*', (0, cors_1.default)(corsOptions));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
else {
    app.use((0, morgan_1.default)('combined'));
}
// Custom request logging
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
    next();
});
// Static files for uploads
app.use('/uploads', express_1.default.static('uploads', {
    setHeaders: (res, path) => {
        res.set('Access-Control-Allow-Origin', '*');
    }
}));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: exports.pool ? 'connected' : 'disconnected'
    });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/upload', uploadRoutes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Interview Booking API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            bookings: '/api/bookings',
            upload: '/api/upload',
            health: '/health'
        }
    });
});
// 404 handler
app.use((req, res) => {
    console.log(`⚠️ 404 - Not found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: err.errors
        });
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }
    // Default error
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
        // Create users table if not exists
        await exports.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'interviewer')),
        phone VARCHAR(50),
        avatar VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Database tables initialized');
        // Check if admin exists
        const adminEmail = 'admin@example.com';
        const checkAdmin = await exports.pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (checkAdmin.rows.length === 0) {
            console.log('📝 Creating default admin user...');
            const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
            await exports.pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', ['Administrator', adminEmail, hashedPassword, 'admin']);
            console.log('✅ Default admin user created');
            console.log('   📧 Email: admin@example.com');
            console.log('   🔑 Password: admin123');
        }
        else {
            console.log('✅ Admin user already exists');
        }
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
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
        exports.pool.end(() => {
            console.log('🛑 Database pool has ended');
            process.exit(0);
        });
    });
});
process.on('SIGINT', () => {
    console.log('📴 SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('🛑 HTTP server closed');
        exports.pool.end(() => {
            console.log('🛑 Database pool has ended');
            process.exit(0);
        });
    });
});
exports.default = app;
