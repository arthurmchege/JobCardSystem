// src/services/user.service.js
// Complete User Service with all CRUD operations

const pool = require('../config/database');

/**
 * Get all users with optional filtering and pagination
 * @param {Object} filters - Filter options (role, search, page, limit)
 * @returns {Promise<Object>} Users and pagination info
 */
const getAllUsers = async (filters = {}) => {
  const { role, search, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, name, email, role, phone, created_at, updated_at FROM users';
  let countQuery = 'SELECT COUNT(*) FROM users';
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  // Filter by role
  if (role) {
    conditions.push(`role = $${paramIndex}`);
    params.push(role);
    paramIndex++;
  }
  
  // Search by name or email
  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  // Build WHERE clause if conditions exist
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  // Add ordering and pagination
  query += ' ORDER BY created_at DESC';
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  // Execute both queries in parallel
  const [usersResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2))
  ]);
  
  const totalUsers = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalUsers / limit);
  
  return {
    users: usersResult.rows,
    pagination: {
      currentPage: page,
      totalPages,
      totalUsers,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Get a single user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
const getUserById = async (userId) => {
  const result = await pool.query(
    'SELECT id, name, email, role, phone, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  return result.rows[0];
};

/**
 * Update user information
 * @param {number} userId - User ID to update
 * @param {Object} updates - Fields to update (name, email, phone, role)
 * @returns {Promise<Object>} Updated user object
 * @throws {Error} If user not found or email already in use
 */
const updateUser = async (userId, updates) => {
  const { name, email, phone, role } = updates;
  
  // Check if user exists
  const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  
  if (userCheck.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Check if email is being changed and if it's already in use
  if (email) {
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, userId]
    );
    
    if (emailCheck.rows.length > 0) {
      const error = new Error('Email already in use by another user');
      error.statusCode = 409;
      throw error;
    }
  }
  
  // Build dynamic UPDATE query
  const fields = [];
  const values = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    fields.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }
  
  if (email !== undefined) {
    fields.push(`email = $${paramIndex}`);
    values.push(email);
    paramIndex++;
  }
  
  if (phone !== undefined) {
    fields.push(`phone = $${paramIndex}`);
    values.push(phone);
    paramIndex++;
  }
  
  if (role !== undefined) {
    fields.push(`role = $${paramIndex}`);
    values.push(role);
    paramIndex++;
  }
  
  // Always update the updated_at timestamp
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(userId);
  
  const query = `
    UPDATE users 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, role, phone, created_at, updated_at
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

/**
 * Delete a user from the system
 * @param {number} userId - User ID to delete
 * @returns {Promise<void>}
 * @throws {Error} If user not found or has assigned job cards
 */
const deleteUser = async (userId) => {
  try {
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const user = userCheck.rows[0];
    
    // Check if user has any job cards (active or completed)
    const jobCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs
       FROM job_cards 
       WHERE technician_id = $1`,
      [userId]
    );
    
    const jobStats = jobCheck.rows[0];
    const totalJobs = parseInt(jobStats.total_jobs);
    const activeJobs = parseInt(jobStats.pending_jobs) + parseInt(jobStats.in_progress_jobs);
    
    // Prevent deletion if user has any active jobs
    if (activeJobs > 0) {
      const error = new Error(
        `Cannot delete user. ${user.name} has ${activeJobs} active job card(s) (${jobStats.pending_jobs} pending, ${jobStats.in_progress_jobs} in progress). Please reassign or complete them first.`
      );
      error.statusCode = 400;
      throw error;
    }
    
    // If the user has any job cards (even completed ones), deleting will likely fail
    // due to foreign key constraints (job_cards.technician_id -> users.id).
    // This check gives a clearer error message to the client.
    if (totalJobs > 0) {
      const error = new Error(
        `Cannot delete user. ${user.name} has ${totalJobs} job card(s) in the system. Reassign or remove them before deleting the user.`
      );
      error.statusCode = 400;
      throw error;
    }
    
    // Delete the user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    return;
  } catch (error) {
    // Re-throw errors that already have status codes
    if (error.statusCode) {
      throw error;
    }

    // Handle common foreign key constraint errors (deleting user with related records)
    if (error.code === '23503') {
      const err = new Error(
        'Cannot delete user because there are existing records linked to them (e.g. job cards). Reassign or remove those records first.'
      );
      err.statusCode = 400;
      throw err;
    }

    // Log and throw generic error for unexpected issues
    console.error('Delete user service error:', error);
    const err = new Error('Failed to delete user');
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE role = 'technician') as total_technicians,
      COUNT(*) FILTER (WHERE role = 'supervisor') as total_supervisors,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_last_30_days
    FROM users
  `);
  
  return result.rows[0];
};

/**
 * Get user with job statistics
 * Useful for admin dashboards
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User with job stats
 */
const getUserWithStats = async (userId) => {
  const result = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.role,
      u.phone,
      u.created_at,
      u.updated_at,
      COUNT(jc.id) as total_jobs,
      COUNT(jc.id) FILTER (WHERE jc.status = 'pending') as pending_jobs,
      COUNT(jc.id) FILTER (WHERE jc.status = 'in_progress') as in_progress_jobs,
      COUNT(jc.id) FILTER (WHERE jc.status = 'completed') as completed_jobs
    FROM users u
    LEFT JOIN job_cards jc ON u.id = jc.technician_id
    WHERE u.id = $1
    GROUP BY u.id
  `, [userId]);
  
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  
  return result.rows[0];
};

/**
 * Check if user can be deleted
 * Returns detailed info about what's blocking deletion
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Deletion eligibility info
 */
const checkUserDeletionEligibility = async (userId) => {
  const userCheck = await pool.query(
    'SELECT id, name, role FROM users WHERE id = $1',
    [userId]
  );
  
  if (userCheck.rows.length === 0) {
    return {
      canDelete: false,
      reason: 'User not found',
      user: null
    };
  }

  const user = userCheck.rows[0];
  
  const jobCheck = await pool.query(
    `SELECT 
      COUNT(*) as total_jobs,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_jobs
     FROM job_cards 
     WHERE technician_id = $1`,
    [userId]
  );
  
  const stats = jobCheck.rows[0];
  const activeJobs = parseInt(stats.pending_jobs) + parseInt(stats.in_progress_jobs);
  
  if (activeJobs > 0) {
    return {
      canDelete: false,
      reason: `User has ${activeJobs} active job(s)`,
      user,
      jobStats: stats
    };
  }
  
  return {
    canDelete: true,
    reason: null,
    user,
    jobStats: stats
  };
};

// Export all functions
module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getUserWithStats,
  checkUserDeletionEligibility
};