const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hash a plain text password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare plain text password with hash

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRY || '24h';
  
  if (!secret) {
    throw new Error('JWT_SECRET not defined in environment variables');
  }
  
  return jwt.sign(payload, secret, { expiresIn });
};

// Verify and decode JWT token
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET not defined in environment variables');
  }
  
  return jwt.verify(token, secret);
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken
};