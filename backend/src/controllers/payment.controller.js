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
    if (jobCard.payment_status === 'paid') {
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

    // Create Payment Record
    const paymentResult = await db.query(
      `INSERT INTO payments (
      job_card_id,
      phone_number,
      amount,
      account_reference,
      payment_status
      ) VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
       [
        job_card_id,
        phone_number,
        jobCard.payment_amount,
        `Job-${job_card_id.substring(0, 8)}`
       ]
    );

    const payment = paymentResult.rows[0];

    // UPDATE JOB CARD STATUS TO PENDING
    await db.query(
      'UPDATE job_cards SET payment_status = $1 WHERE id = $2',
      ['pending', job_card_id]
    )

    // INITIATE STK Push
    const stkResult = await initiateSTKPush(
      phone_number,
      jobCard.payment_amount,
      job_card_id,
      `Payment for Job-${job_card_id.substring(0, 8)}`
    );

    // If STKPush fails, revert everything
    if (!stkResult.success) {
      await db.query(
        'UPDATE payments SET payment_status = $1 WHERE id = $2',
        ['failed', payment.id]
      );
      await db.query(
        'UPDATE job_cards SET payment_status = $1 WHERE id = $2',
        ['unpaid', job_card_id]
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate M-Pesa payment. Please try again.'
      });
    }

    // Save CheckoutRequestID
    await db.query(
      `UPDATE payments SET checkout_request_id = $1 WHERE id = $2`,
      [stkResult.data.CheckoutRequestID, payment.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        payment_id: payment.id,
        amount: jobCard.payment_amount,
        phone_number: phone_number,
        checkout_request_id: stkResult.data.CheckoutRequestID
      }
    })

  } catch (error) {
    console.error('Initiate payment error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to initiate payment'
    });
  }
};

// HANDLE M-PESA CALLBACK
// POST /api/v1/payments/callback
const handleCallback = async (req, res) => {
  try {
    // Always respond 200 immediately so Safaricom doesn't retry
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success '});

    // Extract callback data from Safaricom's request
    const callbackData = req.body.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;
    const checkoutRequestID = callbackData.CheckoutRequestID;
    
    console.log(' M-Pesa callback received');
    console.log(` ResultCode: ${resultCode}` );
    console.log(` CheckoutRequestID: ${checkoutRequestID}`);

    // Find paymenT record using CheckoutRequestID
    const paymentResult = await db.query(
      'SELECT * FROM payments WHERE checkout_request_id = $1',
      [checkoutRequestID]
    );

    // If payment log not found, log and exit
    if (paymentResult.rows.length === 0) {
      console.error(`No payment found for CheckoutRequestID: ${checkoutRequestID}`);
      return;
    }

    const payment = paymentResult.rows[0];

    // Check for duplicate callback
    if (payment.payment_status === 'success') {
      console.log(` Duplicate callback received for payment: ${payment.id}`);
      return;
    }

    // Handle successful payment
    if (resultCode === 0) {
      // Extract payment details from callback metadata
      const metadata = callbackData.CallbackMetadata.Item;
      const amountPaid = metadata.find(i => i.Name === 'Amount').Value;
      const receiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber').Value;
      const transactionDateRaw = metadata.find(i => i.Name === 'TransactionDate').Value;
      // Convert M-Pesa format (20260313145535) to PostgreSQL format
      const ts = String(transactionDateRaw);
      const transactionDate = `${ts.substring(0,4)}-${ts.substring(4,6)}-${ts.substring(6,8)} ${ts.substring(8,10)}:${ts.substring(10,12)}:${ts.substring(12,14)}`;

      // update payment record to success
      await db.query(
        `UPDATE payments SET
          payment_status = 'success',
          amount_paid = $1,
          mpesa_receipt_number = $2,
          transaction_date = $3,
          payment_completed = CURRENT_TIMESTAMP,
          result_code = $4,
          result_description = $5
        WHERE id = $6`,
        [amountPaid, receiptNumber, transactionDate, resultCode, resultDesc, payment.id]
      );

      // Update job card to paid
      await db.query(
        `UPDATE job_cards SET
          payment_status = 'paid',
          fully_paid_at = CURRENT_TIMESTAMP,
          last_payment_id = $1
        WHERE id = $2`,
        [payment.id, payment.job_card_id]
      );

      console.log(' Payment Successful');
      console.log(` Receipt: ${receiptNumber} `);
      console.log(` Amount: KES ${amountPaid}`);

    } else {
        // Handle failed/cancelled payment
        const failStatus = resultCode === 1032 ? 'cancelled' : 'failed';
        
        // Update payment record to failed/cancelled
        await db.query(
          `UPDATE payments SET
            payment_status = $1,
            result_code = $2,
            result_description = $3
          WHERE id = $4`,
          [failStatus, resultCode, resultDesc, payment.id]
        );

        // Revert job card to unpaid
        await db.query(
          'UPDATE job_cards SET payment_status = $1 WHERE id = $2',
          ['unpaid', payment.job_card_id]
        );

        console.log(` Payment ${failStatus}`);
        console.log(` Result: ${resultDesc}`);
    }
  } catch (error) {
    console.error('Callback handling error:', error);
  }
};

// GET PAYMENT STATUS
// GET /api/v1/payments/:id
const getPaymentStatus = async (req, res) => {
  try {
    const paymentId = req.params.id;

    const result = await db.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { payment: result.rows[0] }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get Payment status'
    });
  }
};

// GET ALL PAYMENTS FOR A JOB
// GET api/v1/payments/job/:jobid

const getJobPayments = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Check if job exists
    const jobResult = await db.query(
      'SELECT id FROM job_cards WHERE id = $1',
      [jobId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job Card not found'
      });
    }

    // Get all payments for the job
    const paymentsResult = await db.query(
      `SELECT * FROM payments WHERE job_card_id = $1
      ORDER BY created_at DESC`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      data: {
        job_id: jobId,
        total_payments: paymentsResult.rows.length,
        payments: paymentsResult.rows
      }
    });

  } catch (error) {
    console.error('Get job payments error: ', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get job payments'   
    });
  }
};

module.exports = {
  initiatePayment,
  handleCallback,
  getPaymentStatus,
  getJobPayments
};