const customerService = require('../services/customer.service');


// Get all customers
// GET /api/v1/customers
 
const getAllCustomers = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10
    };
    
    const result = await customerService.getAllCustomers(filters);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Get all customers error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get customers'
    });
  }
};

// Get single customer by ID
// GET /api/v1/customers/:id

const getCustomerById = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer ID'
      });
    }
    
    const customer = await customerService.getCustomerById(customerId);
    
    res.json({
      success: true,
      data: { customer }
    });
    
  } catch (error) {
    console.error('Get customer by ID error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get customer'
    });
  }
};

// Create new customer
// POST /api/v1/customers

const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    
    const customer = await customerService.createCustomer(customerData);
    
    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
    
  } catch (error) {
    console.error('Create customer error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to create customer'
    });
  }
};

// Update customer
// PATCH /api/v1/customers/:id

const updateCustomer = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer ID'
      });
    }
    
    const updates = req.body;
    const updatedCustomer = await customerService.updateCustomer(customerId, updates);
    
    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer: updatedCustomer }
    });
    
  } catch (error) {
    console.error('Update customer error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to update customer'
    });
  }
};

// Delete customer
// DELETE /api/v1/customers/:id

const deleteCustomer = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    
    if (isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid customer ID'
      });
    }
    
    await customerService.deleteCustomer(customerId);
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete customer error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to delete customer'
    });
  }
};

// Get customer statistics
// GET /api/v1/customers/stats

const getCustomerStats = async (req, res) => {
  try {
    const stats = await customerService.getCustomerStats();
    
    res.json({
      success: true,
      data: { stats }
    });
    
  } catch (error) {
    console.error('Get customer stats error:', error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get customer statistics'
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
};