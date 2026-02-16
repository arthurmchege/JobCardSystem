const Joi = require('joi');

/**
 * Validation schema for updating user profile
 */
const updateUserSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Email must be valid'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^[+]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[(]?[0-9]{1,4}[)]?[-\\s\\.]?[0-9]{1,9}$'))
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number format is invalid'
    }),
  
  role: Joi.string()
    .valid('technician', 'supervisor')
    .messages({
      'any.only': 'Role must be either technician or supervisor'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for query parameters (filtering/pagination)
 */
const getUsersQuerySchema = Joi.object({
  role: Joi.string()
    .valid('technician', 'supervisor')
    .messages({
      'any.only': 'Role must be either technician or supervisor'
    }),
  
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
  updateUserSchema,
  getUsersQuerySchema
};