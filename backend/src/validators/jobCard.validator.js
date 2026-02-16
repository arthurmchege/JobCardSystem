const Joi = require('joi');

// Custom date validator
// This ensures dates are valid ISO 8601 format strings
const isoDateString = Joi.string().isoDate().messages({
    'string.isoDate': 'Must be a valid ISO 8601 date (YYYY-MM-DDTHH:mm:ss.sssZ)'
});

// SCHEMA: CREATE JOB CARD
// POST /api/v1/job-cards

const createJobCardSchema = Joi.object({
    customer_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'customer_id must be a number',
            'number.integer': 'customer_id must be an integer',
            'number.positive': 'customer_id must be positive',
            'any.required': 'customer_id is required'
        }),

    technician_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'technician_id must be a number',
            'number.integer': 'technician_id must be an integer',
            'number.positive': 'technician_id must be positive',
            'any.required': 'technician_id is required'
        }),

    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.empty': 'title is required',
            'string.min': 'title must be at least 3 characters',
            'string.max': 'title cannot exceed 200 characters',
            'any.required': 'title is required'
        }),

    description: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'description cannot exceed 2000 characters'
        }),

    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .default('medium')
        .messages({
            'any.only': 'priority must be one of: low, medium, high, urgent'
        }),

    scheduled_date: isoDateString
        .required()
        .messages({
            'any.required': 'scheduled_date is required'
        }),

    estimated_duration: Joi.number()
        .integer()
        .positive()
        .max(1440) // Max 24 hours (in minutes)
        .allow(null)
        .messages({
            'number.base': 'estimated_duration must be a number',
            'number.integer': 'estimated_duration must be an integer (minutes)',
            'number.positive': 'estimated_duration must be positive',
            'number.max': 'estimated_duration cannot exceed 1440 minutes (24 hours)'
        }),

    notes: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'notes cannot exceed 1000 characters'
        })
});

// SCHEMA: UPDATE JOB CARD
// PATCH /api/v1/job-cards/:id

const updateJobCardSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .messages({
            'string.min': 'title must be at least 3 characters',
            'string.max': 'title cannot exceed 200 characters'
        }),

    description: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'description cannot exceed 2000 characters'
        }),

    status: Joi.string()
        .valid('pending', 'in_progress', 'completed')
        .messages({
            'any.only': 'status must be one of: pending, in_progress, completed'
        }),

    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'priority must be one of: low, medium, high, urgent'
        }),

    scheduled_date: isoDateString,

    estimated_duration: Joi.number()
        .integer()
        .positive()
        .max(1440)
        .allow(null)
        .messages({
            'number.base': 'estimated_duration must be a number',
            'number.integer': 'estimated_duration must be an integer (minutes)',
            'number.positive': 'estimated_duration must be positive',
            'number.max': 'estimated_duration cannot exceed 1440 minutes'
        }),

    actual_start_time: isoDateString.allow(null),

    actual_end_time: isoDateString.allow(null),

    work_performed: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'work_performed cannot exceed 5000 characters'
        }),

    notes: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'notes cannot exceed 1000 characters'
        })
})
.min(1) // At least one field must be provided
.messages({
    'object.min': 'At least one field must be provided for update'
});

// SCHEMA: COMPLETE JOB CARD
// POST /api/v1/job-cards/:id/complete

// This schema is STRICT - all completion fields are required.

const completeJobCardSchema = Joi.object({
    actual_start_time: isoDateString
        .allow(null)
        .messages({
            'string.isoDate': 'actual_start_time must be a valid ISO 8601 date'
        }),

    actual_end_time: isoDateString
        .required()
        .messages({
            'any.required': 'actual_end_time is required for completion'
        }),

    work_performed: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.empty': 'work_performed is required',
            'string.min': 'work_performed must be at least 10 characters (describe what was done)',
            'string.max': 'work_performed cannot exceed 5000 characters',
            'any.required': 'work_performed is required for completion'
        }),

    customer_signature: Joi.string()
        .optional()
        .allow('', null)
        .pattern(/^data:image\/(png|jpeg|jpg);base64,/)
        .messages({
            'string.empty': 'customer_signature is required',
            'string.pattern.base': 'customer_signature must be a base64 encoded image (data:image/png;base64,... or data:image/jpeg;base64,...)',
            'any.required': 'customer_signature is required for completion'
        }),

    notes: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'notes cannot exceed 1000 characters'
        })
});

// SCHEMA: QUERY PARAMETERS (for GET /api/v1/job-cards)
// GET /api/v1/job-cards?status=pending&technician_id=5&page=2

const getJobCardsQuerySchema = Joi.object({
    // Status can be single value or comma-separated array
    status: Joi.alternatives()
        .try(
            Joi.string().valid('pending', 'in_progress', 'completed'),
            Joi.array().items(Joi.string().valid('pending', 'in_progress', 'completed'))
        )
        .messages({
            'any.only': 'status must be one of: pending, in_progress, completed'
        }),

    technician_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().valid('me') // Special value: 'me' = current user
        )
        .messages({
            'number.base': 'technician_id must be a number or "me"',
            'number.integer': 'technician_id must be an integer',
            'number.positive': 'technician_id must be positive'
        }),

    customer_id: Joi.number()
        .integer()
        .positive()
        .messages({
            'number.base': 'customer_id must be a number',
            'number.integer': 'customer_id must be an integer',
            'number.positive': 'customer_id must be positive'
        }),

    start_date: isoDateString,

    end_date: isoDateString,

    search: Joi.string()
        .max(200)
        .messages({
            'string.max': 'search query cannot exceed 200 characters'
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
            'number.base': 'page must be a number',
            'number.integer': 'page must be an integer',
            'number.min': 'page must be at least 1'
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
            'number.base': 'limit must be a number',
            'number.integer': 'limit must be an integer',
            'number.min': 'limit must be at least 1',
            'number.max': 'limit cannot exceed 100'
        })
});

// SCHEMA: ID PARAMETER VALIDATION
// GET/PATCH/DELETE /api/v1/job-cards/:id

const jobCardIdParamSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Job card ID must be a number',
            'number.integer': 'Job card ID must be an integer',
            'number.positive': 'Job card ID must be positive',
            'any.required': 'Job card ID is required'
        })
});

module.exports = {
    createJobCardSchema,
    updateJobCardSchema,
    completeJobCardSchema,
    getJobCardsQuerySchema,
    jobCardIdParamSchema
};