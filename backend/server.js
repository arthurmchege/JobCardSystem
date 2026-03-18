// Load environment variables at the start
require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./src/config/database');

// Import rate limiters
const { apiLimiter, authLimiter, createLimiter } = require('./src/middleware/rateLimiter');

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const customerRoutes = require('./src/routes/customer.routes');
const jobCardRoutes = require('./src/routes/jobCard.routes');
const paymentRoutes = require('./src/routes/payment.routes')
const paystackRoutes = require('./src/routes/paystack.routes')

console.log('✅ All routes imported successfully');

// Initialize express app
const app = express();


// Get Port
const PORT = process.env.PORT || 5000;

// ============================================================================
// CORS CONFIGURATION (PRODUCTION-READY)
// ============================================================================

const getCorsOptions = () => {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost',
      ];

  return {
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
    maxAge: 86400,
    optionsSuccessStatus: 200
  };
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.set('trust proxy', 1)
app.use(helmet());
app.use(cors(getCorsOptions()));
app.post('/api/v1/webhook', express.raw({ type: 'application/json' }),
  require('./src/controllers/paystack.controller').handleWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// General rate limiting
app.use('/api/v1', apiLimiter);

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Job Card API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    protocol: req.protocol,
  });
});

app.get('/api/v1/db-test', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() as current_time, current_database() as database'
    );
    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        database: result.rows[0].database
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Job Card API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      customers: '/api/v1/customers',
      jobCards: '/api/v1/job-cards'
    }
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', createLimiter, userRoutes);
app.use('/api/v1/customers', createLimiter, customerRoutes);
app.use('/api/v1/job-cards', createLimiter, jobCardRoutes);
app.use('/api/v1/payments', createLimiter, paymentRoutes);
app.use('/api/v1/', paystackRoutes)

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 HTTP Server running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 Health: http://localhost:${PORT}/api/v1/health`);
  console.log('========================================');
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

pool.connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection error:', err));

// Prevent process from exiting
process.stdin.resume();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  server.close(() => {
    console.log('✅ Server closed');
    pool.end(() => {
      console.log('✅ Database pool closed');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;