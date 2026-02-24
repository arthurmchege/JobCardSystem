const xss = require('xss');

// XSS SANITIZATION OPTIONS

// Custom XSS filter options
const xssOptions = {
  whiteList: {}, // Don't allow any HTML tags
  stripIgnoreTag: true, // Remove all HTML tags
  stripIgnoreTagBody: ['script', 'style'], // Remove script and style tags
};

// SANITIZATION FUNCTIONS
const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  // Trim whitespace
  let sanitized = value.trim();

  // Apply xss filter
  sanitized = xss(sanitized, xssOptions);

  return sanitized;
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') {
        return sanitizeString(item);
      } else if (typeof item === 'object') {
        return sanitizeObject(item);
      }
      return item;
    });
  }

  // Handle objects
  const sanitized = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

const sanitizeFields = (data, fields) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  fields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeString(sanitized[field]);
    }
  });

  return sanitized;
};

// EXPRESS MIDDLEWARE
const sanitizeMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeFields,
  sanitizeMiddleware
};