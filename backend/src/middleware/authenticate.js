const { verifyToken } = require('../utils/authHelpers');

/**
 * Middleware to authenticate requests using JWT token
 * Extracts and verifies token from Authorization header
 * Attaches user info to req.user if valid
 */
const authenticate = async (req, res, next) => {  
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
        message: 'Please include Authorization header with Bearer token'
      });
    }
    
    // Check if header follows "Bearer <token>" format
    if (!authHeader.startsWith('Bearer ')) {  
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization format',
        message: 'Authorization header must be in format: Bearer <token>'
      });
    }
    
    // Extract token (remove "Bearer " prefix)
    const token = authHeader.substring(7);  
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        message: 'Token is missing from Authorization header'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request object for use in next middleware/controller
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    // Token is valid, proceed to next middleware
    next();
    
  } catch (error) {
    // Token verification failed
    console.error('Authentication error:', error.message);
    
    // Check specific JWT errors
    if (error.name === 'TokenExpiredError') {  
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',  
        message: 'The provided token is invalid'
      });
    }
    
    // Generic error
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message || 'Could not authenticate request'
    });
  }
};

module.exports = authenticate;