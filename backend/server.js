const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');
dotenv.config();

// Importă configurația bazei de date
const db = require('./src/config/database');

// Importă toate rutele
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const userRoutes = require('./src/routes/userRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

// Crează aplicația Express
const app = express();

// Trust proxy pentru Nginx
app.set('trust proxy', 1);

// Port din .env sau 5000
const PORT = process.env.PORT || 5000;

// Middleware-uri pentru securitate și logging
app.use(helmet()); // Securitate headers
app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://94.156.250.138:3002',
    'http://94.156.250.138'
  ],
  credentials: true
}));
// Permite cereri cross-origin
app.use(compression()); // Compresie răspunsuri
app.use(morgan('dev')); // Logging în consolă
app.use(express.json()); // Parsare JSON body
app.use(express.urlencoded({ extended: true })); // Parsare form data

// Rate limiting pentru protecție împotriva spam
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 100, // maxim 100 cereri per IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rute API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Test route pentru a verifica că serverul funcționează
app.get('/', (req, res) => {
  res.json({
    message: 'Bine ai venit la API-ul pentru Interview Booking App!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      bookings: '/api/bookings'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint negăsit'
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Eroare internă server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Pornește serverul
app.listen(PORT, () => {
  console.log('\n🚀 Server pornit cu succes!');
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📅 Started at: ${new Date().toLocaleString('ro-RO')}`);
  console.log('');
});