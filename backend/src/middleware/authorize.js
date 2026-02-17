/*
  Middleware to check if user has required role
  Must be used AFTER authenticate middleware
 */

  const authorize = (allowedRoles) => {
    return (req, res, next) => {
      // Check if user was authenticated
      if (!req.user) {
        return res.status(401).json ({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
        });
      }

       // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
        });
      }
      // User has required role, proceed
      next();
    };
  };

  module.exports = authorize;