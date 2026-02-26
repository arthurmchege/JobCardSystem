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
const { sanitizeMiddleware } = require('../utils/sanitize');
const emailService = require('../services/email.service');
const {
  createJobCardSchema,
  updateJobCardSchema,
  completeJobCardSchema,
  getJobCardsQuerySchema
} = require('../validators/jobCard.validator');

// ============================================================================
// APPLY SANITIZATION FIRST (BEFORE ANY ROUTES)
// ============================================================================
router.use(sanitizeMiddleware);

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
  filterJobCardsByRole,
  validateQuery(getJobCardsQuerySchema),
  jobCardController.getAllJobCards
);

// ============================================================================
// GENERATE PDF REPORT (MUST BE BEFORE /:id ROUTE)
// ============================================================================
// GET /api/v1/job-cards/:id/pdf
router.get('/:id/pdf',
  authenticate,
  authorize(['supervisor', 'technician']),
  verifyJobCardOwnership,
  jobCardController.generateJobCardPDFReport
);

// COMPLETE JOB CARD (MUST BE BEFORE /:id ROUTE)
// POST /api/v1/job-cards/:id/complete
router.post('/:id/complete',
  authenticate,
  verifyJobCardOwnership,
  validateRequest(completeJobCardSchema),
  jobCardController.completeJobCard
);

// GET SINGLE JOB CARD BY ID
// GET /api/v1/job-cards/:id
router.get('/:id',
  authenticate,
  verifyJobCardOwnership,
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
  verifyJobCardOwnership,
  validateRequest(updateJobCardSchema),
  jobCardController.updateJobCard
);

// DELETE JOB CARD
// DELETE /api/v1/job-cards/:id
router.delete('/:id',
  authenticate,
  authorize(['supervisor']),
  jobCardController.deleteJobCard
);

router.get('/test-email',
  authenticate,
  async (req, res) => {
    try {
      const result = await emailService.sendTestEmail(req.user.email);

      if (result.success) {
        res.json({
           success: true,
           message: `Test email sent to ${req.user.email}`,
           messageId: result.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to send test email',
          details: result.error
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;