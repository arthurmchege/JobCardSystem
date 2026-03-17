const axios = require('axios');
const pool = require('../config/database');
const crypto = require('crypto');

// ---CONFIGURATION---
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY;

console.log('PAYSTACK_SECRET_KEY', PAYSTACK_SECRET_KEY ? 'Loaded' : 'Not Loaded');

const generatePaymentToken = async (jobCardId) => {
    try {
        const token = crypto.randomBytes(32).toString('hex');

        const existing = await pool.query(
            'SELECT id, token, is_used FROM payment_links WHERE job_card_id = $1',
            [jobCardId]
        );

        if (existing.rows.length > 0 && !existing.rows[0].is_used) {
                console.log('Re-using existing token for job');
                return existing.rows[0].token;
            }

            await pool.query(
                `INSERT INTO payment_links (job_card_id, token)
                VALUES ($1, $2)
                ON CONFLICT (job_card_id)
                DO UPDATE SET token = $2, is_used = false, updated_at = CURRENT_TIMESTAMP`,
                [jobCardId, token]
            );

            console.log(`Payment token generated for ${jobCardId}`);
            return token;
    } catch (err) {
        console.error("Failed to generate Payment token:", err.message);
        throw new Error('Failed to generate payment token');
    }
};

const getPaymentLinkDetails  = async (token) => {
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
                [token]
            );

            if (result.rows.length === 0) {
                const error = new Error('Payment link not found');
                error.statusCode = 404;
                throw error;
            }

            const row = result.rows[0];

            if (row.payment_status === 'paid') {
                return {
                    valid: false,
                    reason: 'already_paid',
                    job_title: row.title,
                    customer_name: row.customer_name
                }
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
                public_key: PAYSTACK_PUBLIC_KEY
            };
    } catch (error) {
        if (error.statusCode) throw error;
        console.error('Failed to get payment link details:', error.message);
        throw new Error('Failed to retrieve payment details');
    }
    
};

const initializeTransaction = async (email, amount, jobCardId, token) => {
    try {
        // Paystack expects amount in kobos/pesawas
        // SO KES 1000 becomes 100000
        const amountInKobo = amount * 100;
        
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email: email,
                amount: amountInKobo,
                currency: 'KES',
                reference: `JC-${jobCardId}-${Date.now()}`, // unique reference
                callback_url: `${process.env.FRONTEND_URL}/pay/${token}/verify`,
                metadata: {
                    job_card_id: jobCardId,
                    token: token,
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const { authorization_url, reference } = response.data.data;

        // Save the reference in payment_links so we can reference it later

        await pool.query(
            `UPDATE payment_links
            SET paystack_reference = $1, updated_at = CURRENT_TIMESTAMP
            WHERE job_card_id = $2`,
            [reference, jobCardId]
        );
        return {
            authorization_url,
            reference
        };

    } catch (error) {
        console.error('Failed to initialize transaction:', error.message);
        throw new Error('Failed to initialize payment');
    }
};

const verifyTransaction = async (reference) => {
    try {
        // Ask payment if this payment succeeded
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
                }
            }
        );

        const { status, amount, currency } = response.data.data;

        // Find which job card this reference belongs to
        const linkResult =  await pool.query(
            `SELECT job_card_id FROM payment_links WHERE paystack_reference = $1`,
            [reference]
        );

        if (linkResult.rows.length === 0) {
            const error = new Error('No payment link found for this reference');
            error.statusCode = 404;
            throw error;
        }

        const jobCardId = linkResult.rows[0].job_card_id;

        // If payment succeeded, update both tables
        if (status === 'success') {
            await pool.query(
                `UPDATE job_cards
                SET payment_status = 'paid', fully_paid_at = CURRENT_TIMESTAMP
                WHERE id = $1`,
                [jobCardId]
            );

            await pool.query(
                `UPDATE payment_links
                SET is_used = true, updated_at = CURRENT_TIMESTAMP
                WHERE paystack_reference = $1`,
                [reference]
            );

            console.log(`Payment verifief and recorded for job ${jobCardId}`);
        }

        return {
            status,                 // 'success', 'failed', 'abandoned'
            amount: amount / 100,   // Converts back from kobo to KES
            currency,
            job_card_id: jobCardId
        };

    }   catch (err) {
        if (err.statusCode) throw err;
        console.error('Failed to verify paystack transaction:', err.message);
        throw new Error('Failed to verify payment');
    }
};

const verifyWebhookSignature = (payload, signature) => {
    const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(payload)
        .digest('hex');

        return hash === signature;
};

module.exports = {
    generatePaymentToken,
    getPaymentLinkDetails,
    initializeTransaction,
    verifyTransaction,
    verifyWebhookSignature
};