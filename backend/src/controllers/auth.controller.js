const authService = require("../services/auth.service");

// Register a new user
const register = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await authService.registerUser(userData);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
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

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result.user,
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
      message: "User profile retrieved",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Logout endpoint to clear cookies from browser
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
