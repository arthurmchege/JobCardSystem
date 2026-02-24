const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { updateUserSchema, getUsersQuerySchema } = require('../validators/user.validator');
const { sanitizeMiddleware } = require('../utils/sanitize');

// ============================================================================
// APPLY SANITIZATION FIRST (BEFORE ANY ROUTES)
// ============================================================================
router.use(sanitizeMiddleware);

// Middleware to validate query parameters
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    req.query = value;
    next();
  };
};

// GET /api/v1/users/stats
// Get user statistics
// Private - Supervisor only
router.get('/stats',
  authenticate,
  authorize(['supervisor']),
  userController.getUserStats
);

// GET /api/v1/users
// Get all users with filtering and pagination
// Private - Supervisor only
router.get('/',
  authenticate,
  authorize(['supervisor']),
  validateQuery(getUsersQuerySchema),
  userController.getAllUsers
);

// GET /api/v1/users/:id
// Get user by ID
router.get('/:id',
  authenticate,
  userController.getUserById
);

// PATCH /api/v1/users/:id
// Update user
router.patch('/:id',
  authenticate,
  validateRequest(updateUserSchema),
  userController.updateUser
);

// DELETE /api/v1/users/:id
// Delete user
router.delete('/:id',
  authenticate,
  authorize(['supervisor']),
  userController.deleteUser
);

module.exports = router;