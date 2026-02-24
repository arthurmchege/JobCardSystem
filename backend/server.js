// Load environment variables at the start
require('dotenv').config();
const express = require('express');
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

console.log('✅ All routes imported successfully');

// Initialize express app
const app = express();

// Get Port 5000
const PORT = process.env.PORT || 5000;

// CORS CONFIGURATION (PRODUCTION--READY)

const getCorsOptions = () => {
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : ['http://localhost:5173']; //Default for development
   return {
    origin: function (origin, callback) {
      if (!origin) {
        return callback (null, true);
      } 
      if (allowedOrigins.includes(origin)) {
        callback (null, true);
      } else {
        console.warn(`CORS blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
      }
    },

    // Allow credentials (cookies, authorized headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    // Allowed HTTP headers
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],

    // Expose headers (what frontend can access)
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],

    // Max age for preflight requests (in seconds)
    maxAge: 600,

    // Catch preflight requests for 24 hours
    maxAge: 86400,

    // Reject unauthorized requests
    optionsSuccessStatus: 200
   };
};

// ============================================================================
// MIDDLEWARE (Order matters!)
// ============================================================================

// 1. Security headers
app.use(helmet());

// 2. CORS - Allow frontend to call API
app.use(cors(getCorsOptions()));

// 3. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Request logger (helpful for debugging)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);  
  next();
});

// 5. Apply GENERAL rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// ============================================================================
// HEALTH CHECK ROUTES (Before authentication)
// ============================================================================

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    message: 'Job Card API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Database connection test endpoint
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

// ============================================================================
// API ROUTES (With specific rate limiters)
// ============================================================================

// Authentication routes - STRICT rate limiting (5 attempts per 15 min)
console.log('Mounting auth routes on /api/v1/auth');
app.use('/api/v1/auth', authLimiter, authRoutes);

// User routes - CREATE rate limiting (30 operations per 15 min)
console.log('Mounting user routes on /api/v1/users');
app.use('/api/v1/users', createLimiter, userRoutes);

// Customer routes - CREATE rate limiting (30 operations per 15 min)
console.log('Mounting customer routes on /api/v1/customers');
app.use('/api/v1/customers', createLimiter, customerRoutes);

// Job Card routes - CREATE rate limiting (30 operations per 15 min)
console.log('Mounting job card routes on /api/v1/job-cards');
app.use('/api/v1/job-cards', createLimiter, jobCardRoutes);

// ============================================================================
// ERROR HANDLERS (Must be last)
// ============================================================================

// 404 handler - route does not exist
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler
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

const server = app.listen(PORT, () => {
  console.log('========================================');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/api/v1/health`);
  console.log('========================================');
  console.log('📡 Available endpoints:');
  console.log('');
  console.log('AUTH:');
  console.log('  POST   /api/v1/auth/register');
  console.log('  POST   /api/v1/auth/login');
  console.log('  GET    /api/v1/auth/me');
  console.log('');
  console.log('USERS:');
  console.log('  GET    /api/v1/users           (List all - Supervisor only)');
  console.log('  GET    /api/v1/users/stats     (Statistics - Supervisor only)');
  console.log('  GET    /api/v1/users/:id       (Get user)');
  console.log('  PATCH  /api/v1/users/:id       (Update user)');
  console.log('  DELETE /api/v1/users/:id       (Delete - Supervisor only)');
  console.log('');
  console.log('CUSTOMERS:');
  console.log('  GET    /api/v1/customers       (List all)');
  console.log('  GET    /api/v1/customers/stats (Statistics - Supervisor only)');
  console.log('  GET    /api/v1/customers/:id   (Get customer)');
  console.log('  POST   /api/v1/customers       (Create - Supervisor only)');
  console.log('  PATCH  /api/v1/customers/:id   (Update - Supervisor only)');
  console.log('  DELETE /api/v1/customers/:id   (Delete - Supervisor only)');
  console.log('');
  console.log('JOB CARDS:');
  console.log('  GET    /api/v1/job-cards       (List - Role filtered)');
  console.log('  GET    /api/v1/job-cards/stats (Statistics - Supervisor only)');
  console.log('  GET    /api/v1/job-cards/:id   (Get single - Ownership check)');
  console.log('  POST   /api/v1/job-cards       (Create - Supervisor only)');
  console.log('  PATCH  /api/v1/job-cards/:id   (Update - Ownership check)');
  console.log('  POST   /api/v1/job-cards/:id/complete (Complete - Ownership check)');
  console.log('  DELETE /api/v1/job-cards/:id   (Delete - Supervisor only)');
  console.log('');
  console.log('🛡️  RATE LIMITS:');
  console.log('  General API: 100 requests per 15 minutes');
  console.log('  Auth routes: 5 attempts per 15 minutes');
  console.log('  Create/Update/Delete: 30 operations per 15 minutes');
  console.log('========================================');
});

// Prevent process from exiting
process.stdin.resume();

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    pool.end(() => {
      console.log('✅ Database pool closed');
      console.log('👋 Goodbye!');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app; // For testing purposes