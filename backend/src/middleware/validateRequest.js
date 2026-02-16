// Middleware to validate request body against Joi schema
const validateRequest = (schema) => {
  return (req, res, next) => {  
    // Validate request body
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,  // Return all errors, not just first
      stripUnknown: true  // Remove fields not in schema
    });
    
    if (error) {
      // Extract error details
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
    
    // Replace req.body with validated and sanitized value
    req.body = value;
    
    // Proceed to next middleware
    next();
  };
};

module.exports = validateRequest;