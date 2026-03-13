const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validateRequest = require('../middleware/validateRequest');
const { initiatePaymentSchema, getJobPaymentsSchema } = require('../validators/payment.validator');
const { sanitizeMiddleware } = require('../utils/sanitize');

// APPLY SANITIZATION
router.use(sanitizeMiddleware);

// INITIATE PAYMENT
// POST /api/v1/payments/initiate
router.post('/initiate',
  authenticate,
  validateRequest(initiatePaymentSchema),
  paymentController.initiatePayment
);

// POST /api/v1/payments/callback
router.post('/callback',
  paymentController.handleCallback
);

// GET PAYMENT STATUS
// GET /api/v1/payments/:id
router.get('/:id',
  authenticate,
  paymentController.getPaymentStatus
);

// GET ALL PAYMENTS FOR A JOB
// GET /api/v1/payments/job/:jobId
router.get('/job/:jobId',
  authenticate,
  authorize(['supervisor']),
  paymentController.getJobPayments
);

module.exports = router;