/* JOB CARD ROUTES
   This file defines all HTTP routes for job card operations.
  Routes are protected by authentication and authorization middleware.
*/

const express = require('express');
const router = express.Router();
const jobCardController = require('../controllers/jobCard.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { verifyJobCardOwnership, filterJobCardsByRole } = require('../middleware/jobCardAuth');
const {
  createJobCardSchema,
  updateJobCardSchema,
  completeJobCardSchema,
  getJobCardsQuerySchema
} = require('../validators/jobCard.validator');

// HELPER: Validate Query Parameters

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    req.query = value;
    next();
  };
};

// GET JOB CARD STATISTICS
// GET /api/v1/job-cards/stats

router.get('/stats',
  authenticate,
  authorize(['supervisor']),
  jobCardController.getJobCardStatistics
);

// GET ALL JOB CARDS (WITH FILTERING)
// GET /api/v1/job-cards

router.get('/',
  authenticate,
  filterJobCardsByRole,  // Applies role-based filtering
  validateQuery(getJobCardsQuerySchema),
  jobCardController.getAllJobCards
);

// GET SINGLE JOB CARD BY ID
// GET /api/v1/job-cards/:id

router.get('/:id',
  authenticate,
  verifyJobCardOwnership,  // Verifies user owns the job or is supervisor
  jobCardController.getJobCardById
);

// CREATE NEW JOB CARD
// POST /api/v1/job-cards

router.post('/',
  authenticate,
  authorize(['supervisor']),
  validateRequest(createJobCardSchema),
  jobCardController.createJobCard
);

// UPDATE JOB CARD
// PATCH /api/v1/job-cards/:id

router.patch('/:id',
  authenticate,
  verifyJobCardOwnership,  // Verifies user owns the job or is supervisor
  validateRequest(updateJobCardSchema),
  jobCardController.updateJobCard
);

// COMPLETE JOB CARD (SPECIAL ENDPOINT)
// POST /api/v1/job-cards/:id/complete

router.post('/:id/complete',
  authenticate,
  verifyJobCardOwnership,  // Verifies user owns the job or is supervisor
  validateRequest(completeJobCardSchema),
  jobCardController.completeJobCard
);

// DELETE JOB CARD
// DELETE /api/v1/job-cards/:id

router.delete('/:id',
  authenticate,
  authorize(['supervisor']),
  jobCardController.deleteJobCard
);

module.exports = router;