const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { createCustomerSchema, updateCustomerSchema, getCustomersQuerySchema } = require('../validators/customer.validator');
const { sanitizeMiddleware } = require('../utils/sanitize');

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

/*
  GET /api/v1/customers/stats
  Get customer statistics
  Supervisor only
 */
router.get('/stats',
  authenticate,
  authorize(['supervisor']),
  customerController.getCustomerStats
);

/*
  GET /api/v1/customers
  Get all customers with search and pagination
  All authenticated users
 */
router.get('/',
  authenticate,
  validateQuery(getCustomersQuerySchema),
  customerController.getAllCustomers
);

/*
  GET /api/v1/customers/:id
  Get customer by ID
  Private - All authenticated users
 */
router.get('/:id',
  authenticate,
  customerController.getCustomerById
);

/*
  POST /api/v1/customers
  Create new customer
  Private - Supervisor only
 */
router.post('/',
  authenticate,
  authorize(['supervisor']),
  validateRequest(createCustomerSchema),
  customerController.createCustomer
);

/*
   PATCH /api/v1/customers/:id
   Update customer
   Private - Supervisor only
 */
router.patch('/:id',
  authenticate,
  authorize(['supervisor']),
  validateRequest(updateCustomerSchema),
  customerController.updateCustomer
);

/*
  DELETE /api/v1/customers/:id
  Delete customer
  Private - Supervisor only
*/

router.delete('/:id',
  authenticate,
  authorize(['supervisor']),
  customerController.deleteCustomer
);


module.exports = router;