const axios = require("axios");
const pool = require("../config/database");
const crypto = require("crypto");
const { logEvent } = require("../services/activityLogger.service");

// ---CONFIGURATION---
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;

// By default, Paystack redirects the customer back to the frontend when payment is complete.
// - In local dev with Vite (default), this is usually http://localhost:5173
// - When using Apache/ngrok or HTTPS, set FRONTEND_URL to the public URL (e.g. https://localhost or https://abcd.ngrok.io)
// If you need Paystack to redirect to a different host than where your frontend is served,
// set PAYSTACK_CALLBACK_URL to a full URL (without the token). This will be used instead.
const FRONTEND_URL =
  process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
const PAYSTACK_CALLBACK_URL =
  process.env.PAYSTACK_CALLBACK_URL || `${FRONTEND_URL}/pay`;

const buildPaystackCallbackUrl = (token) => {
  const base = PAYSTACK_CALLBACK_URL.replace(/\/+$/, ""); // remove trailing slashes
  return `${base}/${token}`;
};

console.log(
  "PAYSTACK_SECRET_KEY",
  PAYSTACK_SECRET_KEY ? "Loaded" : "Not Loaded",
);

const generatePaymentToken = async (jobCardId) => {
  try {
    const token = crypto.randomBytes(32).toString("hex");

    const existing = await pool.query(
      "SELECT id, token, is_used FROM payment_links WHERE job_card_id = $1",
      [jobCardId],
    );

    if (existing.rows.length > 0 && !existing.rows[0].is_used) {
      console.log("Re-using existing token for job");
      return existing.rows[0].token;
    }

    await pool.query(
      `INSERT INTO payment_links (job_card_id, token)
                VALUES ($1, $2)
                ON CONFLICT (job_card_id)
                DO UPDATE SET token = $2, is_used = false, updated_at = CURRENT_TIMESTAMP`,
      [jobCardId, token],
    );

    console.log(`Payment token generated for ${jobCardId}`);
    return token;
  } catch (err) {
    console.error("Failed to generate Payment token:", err.message);
    throw new Error("Failed to generate payment token");
  }
};

const getPaymentLinkDetails = async (token) => {
  try {
    const result = await pool.query(
      `SELECT
                    pl.id as link_id,
                    pl.token,
                    pl.is_used,
                    pl.job_card_id,
                    jc.title,
                    jc.payment_amount,
                    jc.payment_status,
                    jc.work_performed,
                    jc.completed_at,
                    c.name as customer_name,
                    c.email as customer_email
                FROM payment_links pl
                JOIN job_cards jc ON pl.job_card_id = jc.id
                JOIN customers c ON jc.customer_id = c.id
                WHERE pl.token = $1`,
      [token],
    );

    if (result.rows.length === 0) {
      const error = new Error("Payment link not found");
      error.statusCode = 404;
      throw error;
    }

    const row = result.rows[0];

    if (row.payment_status === "paid") {
      return {
        valid: false,
        reason: "already_paid",
        job_title: row.title,
        customer_name: row.customer_name,
      };
    }

    return {
      valid: true,
      link_id: row.link_id,
      token: row.token,
      job_card_id: row.job_card_id,
      job_title: row.title,
      work_performed: row.work_performed,
      payment_amount: row.payment_amount,
      completed_at: row.completed_at,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      public_key: PAYSTACK_PUBLIC_KEY,
    };
  } catch (error) {
    if (error.statusCode) throw error;
    console.error("Failed to get payment link details:", error.message);
    throw new Error("Failed to retrieve payment details");
  }
};

const initializeTransaction = async (email, amount, jobCardId, token) => {
  try {
    // Paystack expects amount in kobos/pesawas
    // SO KES 1000 becomes 100000
    const amountInKobo = amount * 100;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email,
        amount: amountInKobo,
        currency: "KES",
        reference: `JC-${jobCardId}-${Date.now()}`, // unique reference
        callback_url: buildPaystackCallbackUrl(token),
        metadata: {
          job_card_id: jobCardId,
          token: token,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const { authorization_url, reference } = response.data.data;

    // Save the reference in payment_links so we can reference it later

    await pool.query(
      `UPDATE payment_links
            SET paystack_reference = $1, updated_at = CURRENT_TIMESTAMP
            WHERE job_card_id = $2`,
      [reference, jobCardId],
    );
    return {
      authorization_url,
      reference,
    };
  } catch (error) {
    console.error("Failed to initialize transaction:", error.message);
    throw new Error("Failed to initialize payment");
  }
};

const verifyTransaction = async (reference) => {
  try {
    // Ask payment if this payment succeeded
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const { status, amount, currency } = response.data.data;

    // Find which job card this reference belongs to
    const linkResult = await pool.query(
      `SELECT job_card_id FROM payment_links WHERE paystack_reference = $1`,
      [reference],
    );

    if (linkResult.rows.length === 0) {
      const error = new Error("No payment link found for this reference");
      error.statusCode = 404;
      throw error;
    }

    const jobCardId = linkResult.rows[0].job_card_id;

    // If payment succeeded, update both tables
    if (status === "success") {
      await pool.query(
        `UPDATE job_cards
                SET payment_status = 'paid', fully_paid_at = CURRENT_TIMESTAMP
                WHERE id = $1`,
        [jobCardId],
      );

      await pool.query(
        `UPDATE payment_links
                SET is_used = true, updated_at = CURRENT_TIMESTAMP
                WHERE paystack_reference = $1`,
        [reference],
      );

      await logEvent("payment_verified", null, {
        job_card_id: jobCardId,
        status,
        amount: amount / 100,
        currency,
      });

      console.log(`Payment verified and recorded for job ${jobCardId}`);
    }

    return {
      paid: status === "success",
      status, // 'success', 'failed', 'abandoned'
      amount: amount / 100, // Converts back from kobo to KES
      currency,
      job_card_id: jobCardId,
    };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("Failed to verify paystack transaction:", err.message);
    throw new Error("Failed to verify payment");
  }
};

const verifyWebhookSignature = (payload, signature) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest("hex");

  return hash === signature;
};

const resendInvoice = async (jobCardId) => {
  try {
    const result = await pool.query(
      `SELECT
                jc.*,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address,
                u.name as technician_name,
                u.email as technician_email,
                u.phone as technician_phone
            FROM job_cards jc
            JOIN customers c ON jc.customer_id = c.id
            JOIN users u ON jc.technician_id = u.id
            WHERE jc.id = $1`,
      [jobCardId],
    );
    if (result.rows.length === 0) {
      const err = new Error("Job card not found");
      err.statusCode = 404;
      throw err;
    }

    const row = result.rows[0];

    if (row.status !== "completed") {
      const err = new Error("Job must be completed before sending invoice");
      err.statusCode = 400;
      throw err;
    }

    if (!row.payment_amount) {
      const err = new Error("Job has no payment set");
      err.statusCode = 400;
      throw err;
    }

    if (row.payment_status === "paid") {
      const err = new Error("This job has already been paid");
      err.statusCode = 400;
      throw err;
    }

    const token = await generatePaymentToken(row.id);

    const jobCard = {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      scheduled_date: row.scheduled_date,
      actual_start_time: row.actual_start_time,
      actual_end_time: row.completed_at,
      work_performed: row.work_performed,
      notes: row.notes,
      payment_amount: row.payment_amount,
      payment_status: row.payment_status,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address,
      },
      technician: {
        name: row.technician_name,
        email: row.technician_email,
        phone: row.technician_phone,
      },
    };

    const emailService = require("./email.service");
    await emailService.sendJobCompletionEmailToCustomer(jobCard, token);

    console.log(`✅ Invoice resent for job ${jobCardId}`);
    return { success: true };
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("Failed to resend invoice:", err.message);
    throw new Error("Failed to resend invoice");
  }
};

module.exports = {
  generatePaymentToken,
  getPaymentLinkDetails,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  resendInvoice,
};
