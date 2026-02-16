const authService = require('../services/auth.service');

// Register a new user
const register = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await authService.registerUser(userData);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Get current logged-in user
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await authService.getUserById(userId);

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser
};
