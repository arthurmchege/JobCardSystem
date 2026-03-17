const express = require('express');
const router = express.Router();
const paystackController = require('../controllers/paystack.controller');

// POST /webhook
router.post('/webhook', express.raw({
    type: 'application/json'
}),
  paystackController.handleWebhook
);

// GET /pay/:token      - Get payment details
router.get('/pay/:token', paystackController.getPaymentDetails);

// GET /pay/:token/verify   -Verify payment
router.get('/pay/:token/verify', paystackController.verifyPayment);

// POST /pay/:token/initialize  - initialize Payment
router.post('/pay/:token/initialize', paystackController.initializePayment);

module.exports = router;