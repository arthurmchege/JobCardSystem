const paystackService = require('../services/paystack.service');

const getPaymentDetails = async (req, res) => {
    try {
        const { token } = req.params;
        const details = await paystackService.getPaymentLinkDetails(token);
        res.json(details);

    } catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
};

const initializePayment = async (req, res) => {
    try {
        const { token } = req.params;
        const details = await paystackService.getPaymentLinkDetails(token);

        if (!details.valid) {
            return res.status(400).json({
                error: 'This payment link is no longer valid'
            }); 
        }

        const { authorization_url, reference } = await paystackService.initializeTransaction(
                details.customer_email,
                details.payment_amount,
                details.job_card_id,
                token
            );

        res.json({ authorization_url, reference });

    }   catch (err) {
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
};

const verifyPayment = async (req, res) => {
    try { 
        const { token } = req.params;
        const { reference } = req.query;

        const verifyResult = await paystackService.verifyTransaction(reference);
        res.json(verifyResult);

    } catch (err) {
        console.error(err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message });
    }
};

const handleWebhook = async (req, res) => {
    try {

        const signature = req.headers['x-paystack-signature'];
        const isValid = paystackService.verifyWebhookSignature(req.body, signature);

        // if signature is wrong, reject immediately
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = JSON.parse(req.body); 

        if (event.event === 'charge.success') {
            await paystackService.verifyTransaction(event.data.reference);
        }

        res.sendStatus(200);

    } catch (err) {
        console.error('Webhook error:', err);
        res.sendStatus(200); // Still respond with 200 to prevent retries
    }
};

module.exports = {
    getPaymentDetails,
    initializePayment,
    verifyPayment,
    handleWebhook
}