const userService = require('../services/user.service');

/*
  Get all users
  GET /api/v1/users
 */
const getAllUsers = async (req, res) => {  
  try {
    const filters = {
      role: req.query.role,
      search: req.query.search,
      page: parseInt(req.query.page) || 1,  
      limit: parseInt(req.query.limit) || 10
    };
    
    const result = await userService.getAllUsers(filters);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Get all users error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get users'
    });
  }
};

/*
  Get single user by ID
  GET /api/v1/users/:id
 */
const getUserById = async (req, res) => {
  try {
    // UUID is kept as string - NO parseInt or isNaN check
    const userId = req.params.id;
    
    const user = await userService.getUserById(userId);
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get user'
    });
  }
};

/*
  Update user
  PATCH /api/v1/users/:id
 */
const updateUser = async (req, res) => {
  try {
    // UUID is kept as string - NO parseInt or isNaN check
    const userId = req.params.id;
    
    // Check authorization
    // Technicians can only update their own profile
    // Supervisors can update anyone
    if (req.user.role === 'technician' && req.user.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own profile'
      });
    }
    
    const updates = req.body;
    const updatedUser = await userService.updateUser(userId, updates);  
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }  
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update user'
    });
  }
};

/*
  Delete user
  DELETE /api/v1/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    // UUID is kept as string - NO parseInt or isNaN check
    const userId = req.params.id;
    
    // Prevent users from deleting themselves
    if (req.user.userId === userId) {
      return res.status(403).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }
    
    await userService.deleteUser(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);  
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
};

/*
  Get user statistics
  GET /api/v1/users/stats
 */
const getUserStats = async (req, res) => {  
  try {
    const stats = await userService.getUserStats();
    
    res.json({
      success: true,
      data: { stats }
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get user statistics'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats
};