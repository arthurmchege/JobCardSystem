  // Load environment variables at the start
  require('dotenv').config();
  const express = require('express');
  const helmet = require('helmet');
  const cors = require('cors');
  const pool = require('./src/config/database');


  // Import routes
  const authRoutes = require('./src/routes/auth.routes');
  const userRoutes = require('./src/routes/user.routes');
  const customerRoutes = require('./src/routes/customer.routes');
  const jobCardRoutes = require('./src/routes/jobCard.routes');
  console.log('✅ Auth routes imported, type:', typeof authRoutes);


  // Initialize express app
  const app = express();

  // Get Port 5000
  const PORT = process.env.PORT || 5000;

  // Middleware section
  // Add Security headers to all responses
  app.use(helmet());

  // cors allows frontend to call api
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));

  // Parse JSON request bodies
  app.use(express.json());

  // Parse URL encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Request logger (helpful for debugging)
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);  
    next();
  });

  // ============= ROUTES =============

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

  // Authentication routes
  console.log('Mounting auth routes on /api/v1/auth');
  app.use('/api/v1/auth', authRoutes);

  // User Routes
  console.log('Mounting user routes on /api/v1/users');
  app.use('/api/v1/users', userRoutes);

  // Customer routes
  console.log('Mounting customer routes on /api/v1/customer', customerRoutes);
  app.use('/api/v1/customers', customerRoutes);

  // Job Card routes
  app.use('/api/v1/job-cards', jobCardRoutes);

  // Error Handlers 

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

  // ============= START SERVER =============

  const server = app.listen(PORT, () => {
    console.log('========================================');
    console.log(`Server running on http://localhost:${PORT}`);  // 
    console.log(`Environment: ${process.env.NODE_ENV}`);  
    console.log(`Health Check: http://localhost:${PORT}/api/v1/health`); 
    console.log('========================================');
    console.log('Available endpoints:');
    console.log('  POST   /api/v1/auth/register');
    console.log('  POST   /api/v1/auth/login');
    console.log('  GET    /api/v1/auth/me');
    console.log('  POST   /api/v1/auth/logout');
    console.log('  USERS:');
    console.log('  GET    /api/v1/users      (List all - Supervisor only)');
    console.log('  GET    /api/v1/users/stats (Statistics - Supervisor only)');
    console.log('  GET    /api/v1/users/:id  (Get user)');
    console.log('  PATCH  /api/v1/users/:id  (Update user)');
    console.log('  DELETE /api/v1/users/:id  (Delete - Supervisor only)');
    console.log('  CUSTOMERS:');
    console.log('  GET    /api/v1/customers       (List all - All authenticated users)');
    console.log('  GET    /api/v1/customers/stats (Statistics - Supervisor only)');
    console.log('  GET    /api/v1/customers/:id   (Get customer - All authenticated users)');
    console.log('  POST   /api/v1/customers       (Create - Supervisor only)');
    console.log('  PATCH  /api/v1/customers/:id   (Update - Supervisor only)');
    console.log('  DELETE /api/v1/customers/:id   (Delete - Supervisor only)');
    console.log('  JOB CARDS:');
    console.log('  GET    /api/v1/job-cards/stats        (Statistics - Supervisor only)');
    console.log('  GET    /api/v1/job-cards              (List job cards - Role filtered)');
    console.log('  GET    /api/v1/job-cards/:id          (Get single job card - Ownership check)');
    console.log('  POST   /api/v1/job-cards              (Create job card - Supervisor only)');
    console.log('  PATCH  /api/v1/job-cards/:id          (Update job card - Ownership check)');
    console.log('  POST   /api/v1/job-cards/:id/complete (Complete job card - Ownership check)');
    console.log('  DELETE /api/v1/job-cards/:id          (Delete job card - Supervisor only)');
    console.log('========================================');
  });

  // Prevent process from exiting
  process.stdin.resume();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down ...');
    pool.end(() => {
      console.log('Database pool closed');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    pool.end(() => {
      console.log('Database pool closed');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  });