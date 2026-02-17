const pool = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/authHelpers');

// Register a new user

const registerUser = async( userData ) => {
  const { name, email, password, role, phone } = userData;

  // Check if email already exists
  const emailCheck = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (emailCheck.rows.length > 0) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Insert user into database
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, role, phone, created_at`,
    [name, email, passwordHash, role, phone || null]
  );

  return result.rows[0];
};

// Login user and generate token
const loginUser = async (email, password) => {
    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, password, role, phone FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    const user = result.rows[0];

    // Compared user with hash
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  // Return token and user data (without password hash)
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    }
  };
};

// Get user by ID
const getUserById = async (userId) => {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

  return result.rows[0];
};

module.exports = { registerUser, loginUser, getUserById };
