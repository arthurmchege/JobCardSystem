const Joi = require('joi');
const kenyanPhonePattern = /^254[0-9]{9}$/;

// INITIATE PAYMENT
// POST /api/v1/payments/initiate

const initiatePaymentSchema = Joi.object({
  job_card_id: Joi.string().uuid().required()
    .messages({
      'string.uuid': 'job_card_id must be a valid UUID',
      'any.required': 'job_card_id is required'
  }),

  phone_number: Joi.string()
    .pattern(kenyanPhonePattern)
    .required()
    .messages({
      'string.pattern.base': 'phone_number must be in format 254XXXXXXXXX',
      'any.required': 'phone_number is required'
  })
});

// SCHEMA: GET PAYMENTS FOR A JOB
// GET /api/v1/payments/job

const getJobPaymentsSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'page must be a number',
      'number.min': 'page must be at least 1',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'limit must be a number',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit cannot exceed 100'
    }),

  payment_status: Joi.string()
    .valid('pending', 'success', 'failed', 'cancelled', 'pending_review')
    .messages({
      'any.only': 'payment_status must be one of: pending, success, failed, cancelled, pending_review'
    })
});

module.exports = {
  initiatePaymentSchema,
  getJobPaymentsSchema
};

