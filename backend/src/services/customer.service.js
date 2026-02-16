const pool = require('../config/database');

// Get all customers with optional search and pagination
const getAllCustomers = async (filters = {}) => {
  const { search, page = 1, limit = 10 } = filters;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, name, email, phone, address, contact_person, created_at, updated_at FROM customers';
  let countQuery = 'SELECT COUNT(*) FROM customers';
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  // Add search filter if provided (search across name, email, or phone)
  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  // Add WHERE clause if there are conditions
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  // Add ordering
  query += ' ORDER BY created_at DESC';
  
  // Add pagination
  query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);
  
  // Execute queries
  const [customersResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2))
  ]);
  
  const totalCustomers = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(totalCustomers / limit);
  
  return {
    customers: customersResult.rows,
    pagination: {
      currentPage: page,
      totalPages,
      totalCustomers,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Get customer by ID

const getCustomerById = async (customerId) => {
  const result = await pool.query(
    'SELECT id, name, email, phone, address, contact_person, created_at, updated_at FROM customers WHERE id = $1',
    [customerId]
  );
  
  if (result.rows.length === 0) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  
  return result.rows[0];
};

// Create new customer

const createCustomer = async (customerData) => {
  const { name, email, phone, address, contact_person } = customerData;
  
  // Check if email already exists
  const emailCheck = await pool.query(
    'SELECT id FROM customers WHERE email = $1',
    [email]
  );
  
  if (emailCheck.rows.length > 0) {
    const error = new Error('Email already registered for another customer');
    error.statusCode = 409;
    throw error;
  }
  
  // Insert customer
  const result = await pool.query(
    `INSERT INTO customers (name, email, phone, address, contact_person)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, address, contact_person, created_at, updated_at`,
    [name, email, phone, address, contact_person || null]
  );
  
  return result.rows[0];
};

// Update customer

const updateCustomer = async (customerId, updates) => {
  const { name, email, phone, address, contact_person } = updates;
  
  // Check if customer exists
  const customerCheck = await pool.query(
    'SELECT id FROM customers WHERE id = $1',
    [customerId]
  );
  
  if (customerCheck.rows.length === 0) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  
  // If email is being updated, check if it's already taken by another customer
  if (email) {
    const emailCheck = await pool.query(
      'SELECT id FROM customers WHERE email = $1 AND id != $2',
      [email, customerId]
    );
    
    if (emailCheck.rows.length > 0) {
      const error = new Error('Email already in use by another customer');
      error.statusCode = 409;
      throw error;
    }
  }
  
  // Build update query dynamically
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
  
  if (address !== undefined) {
    fields.push(`address = $${paramIndex}`);
    values.push(address);
    paramIndex++;
  }
  
  if (contact_person !== undefined) {
    fields.push(`contact_person = $${paramIndex}`);
    values.push(contact_person);
    paramIndex++;
  }
  
  // Add updated_at timestamp
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  
  // Add customer ID to values
  values.push(customerId);
  
  // Execute update
  const query = `
    UPDATE customers 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, email, phone, address, contact_person, created_at, updated_at
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete customer

const deleteCustomer = async (customerId) => {
  // Check if customer exists
  const customerCheck = await pool.query(
    'SELECT id FROM customers WHERE id = $1',
    [customerId]
  );
  
  if (customerCheck.rows.length === 0) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }
  
  // Check if customer has associated job cards
  const jobCheck = await pool.query(
    'SELECT COUNT(*) FROM job_cards WHERE customer_id = $1',
    [customerId]
  );
  
  const jobCount = parseInt(jobCheck.rows[0].count);
  
  if (jobCount > 0) {
    const error = new Error(
      `Cannot delete customer. Customer has ${jobCount} associated job card(s). Please delete or reassign these job cards first.`
    );
    error.statusCode = 409;
    throw error;
  }
  
  // Safe to delete
  await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
};

// Get customer statistics

const getCustomerStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_customers,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_customers_last_30_days,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_customers_last_7_days
    FROM customers
  `);
  
  return result.rows[0];
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
};