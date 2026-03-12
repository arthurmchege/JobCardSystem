const db = require('../config/database');
const { initiateSTKPush, queryTransactionStatus } = require('../services/mpesa.service');

// INITIATE PAYMENTS
// POST /api/v1/payments/initiate

const initiatePayment = async (req, res) => {
  try {
    const { job_card_id, phone_number } = req.body;

    // Check if Job exists
    const jobResult = await db.query(
      'SELECT * FROM job_cards WHERE id = $1',
      [job_card_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job card not found'
      });
    }

    const jobCard = jobResult.rows[0];

    // Check job is completed
    if (jobCard.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Payment can only be initiated for completed jobs'
      });
    }

    // Check if job is not already paid
    if (jobCard.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'The job has already been paid'
      });
    }
    
    if (!jobCard.payment_amount || jobCard.payment_amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount has not been set for this job'
      });
    }

  } catch (error) {
    console.error('Initiate payment error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to initiate payment'
    });
  }
};