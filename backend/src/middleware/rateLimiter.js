// Rate limiting to prevent abuse and brute force attacks

const rateLimit = require("express-rate-limit");

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, Please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,

  // skip rate limiting for certain conditions
  skip: (req) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return false;
  },

  // Custom handler when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Too many requests from this IP, Please try again after 15 minutes",
      retryAfter: "15 minutes",
    });
  },
});

// STRICT AUTH RATE LIMITER
// Applied specifically to login/register endpoints

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Each IP is limited to 5 login attempts per windowMs
  message: {
    success: false,
    error:
      "To many login attempts from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,

  skipSuccessfulRequests: true,

  skip: (req) => {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return false;
  },

  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);

    res.status(429).json({
      success: false,
      error: "Too many login attempts, please try again after 15 minutes.",
      retryAfter: "15 minutes",
      hint: "If you forgot your password, use the forgot password feature or contact support.",
    });
  },
});

// MODERATE RATE LIMITER
// For create/update/delete operations
// More generous than auth limiter but stricter that General API

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 75,
  message: {
    success: false,
    error:
      "Too many create/update operations, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    if (process.env.NODE_ENV === "test") {
      return true;
    }
    return false;
  },

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error:
        "Too many operations, please slow down and try again in 15 minutes.",
      retryAfter: "15 minutes",
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter,
};
