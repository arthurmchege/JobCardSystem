const Joi = require('joi');

// Validation schema for creating a new customer
const createCustomerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Customer name is required',
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 200 characters'
    }),
  
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be valid'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$'))
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Phone number format is invalid'
    }),
  
  address: Joi.string()
    .min(5)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Address is required',
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 500 characters'
    }),
  
  contact_person: Joi.string()
    .min(2)
    .max(100)
    .allow('', null)
    .messages({
      'string.min': 'Contact person name must be at least 2 characters',
      'string.max': 'Contact person name cannot exceed 100 characters'
    })
});

//Validation schema for updating customer

const updateCustomerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(200)
    .messages({
      'string.min': 'Customer name must be at least 2 characters',
      'string.max': 'Customer name cannot exceed 200 characters'
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Email must be valid'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$'))
    .messages({
      'string.pattern.base': 'Phone number format is invalid'
    }),
  
  address: Joi.string()
    .min(5)
    .max(500)
    .messages({
      'string.min': 'Address must be at least 5 characters',
      'string.max': 'Address cannot exceed 500 characters'
    }),
  
  contact_person: Joi.string()
    .min(2)
    .max(100)
    .allow('', null)
    .messages({
      'string.min': 'Contact person name must be at least 2 characters',
      'string.max': 'Contact person name cannot exceed 100 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Validation schema for query parameters 
const getCustomersQuerySchema = Joi.object({
  search: Joi.string()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Search term must be at least 1 character',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  getCustomersQuerySchema
};