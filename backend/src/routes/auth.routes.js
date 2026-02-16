const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

console.log('✅ Auth routes file loaded successfully');
  
// Register a user
// POST /api/v1/auth/register
router.post('/register',
  validateRequest(registerSchema),
  authController.register);  

// Login a user
// POST /api/v1/auth/login
router.post('/login',
  validateRequest(loginSchema),
  authController.login
);

// Get current Logged in user's profile
// GET /api/v1/auth/me  
router.get('/me',
  authenticate,
  authController.getCurrentUser
);

// Log out user
// POST /api/v1/auth/logout
router.post('/logout',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      message: 'Logout successful.'
    });
  }
);

module.exports = router;