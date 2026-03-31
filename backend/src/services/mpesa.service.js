const axios = require('axios');
const { generatePassword, generateTimestamp } = require('../utils/mpesaHelpers');

// ---CONFIGURATION---
const MPESA_AUTH_URL = process.env.MPESA_AUTH_URL;
const MPESA_STK_PUSH_URL = process.env.MPESA_STK_PUSH_URL;
const MPESA_STK_QUERY_URL = process.env.MPESA_STK_QUERY_URL;
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const BUSINESS_SHORTCODE = process.env.MPESA_BUSINESS_SHORTCODE;
const PASSKEY = process.env.MPESA_PASSKEY;
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;


// Getting a fresh access token from Safaricom that expires in one hour

const getAccessToken = async () => {
  try {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const response = await axios.get(MPESA_AUTH_URL, {
      headers: {
        Authorization: `Basic ${credentials}`
      }
    });

    console.log('M-Pesa access token obtained successfully');
    return response.data.access_token;

  } catch (error) {
    console.error('Failed to get M-Pesa access token: ', error.message);
    throw new Error('Failed to authenticate with M-Pesa')
  }
};

const initiateSTKPush = async (phoneNumber, amount, jobCardId, description) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(BUSINESS_SHORTCODE, PASSKEY, timestamp);

    const accountReference = `Job-${jobCardId.substring(0, 8)}`;

    const requestBody = {
      BusinessShortCode: BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: phoneNumber,
      PartyB: BUSINESS_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: description || 'Job Card Payment'
    };

    const response = await axios.post(MPESA_STK_PUSH_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('STK Push initiated successfully');
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Amount: KES ${amount}`);
    console.log(`CheckoutRequestID: ${response.data.CheckoutRequestID}`);

    return { success: true, data: response.data };

  } catch (error) {
    console.error('Failed to initiate STK Push: ', error.message);
    return { success: false, error: error.message };
  }
};

// Queries the status of an STK Push transaction
// Used to check if the customer has completed the transaction

const queryTransactionStatus = async (checkoutRequestID) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(BUSINESS_SHORTCODE, PASSKEY, timestamp);

    const requestBody = {
      BusinessShortCode: BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID
    };

    const response = await axios.post(MPESA_STK_QUERY_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Transaction status query successful');
    console.log(`CheckoutRequestID: ${checkoutRequestID}`);
    console.log(`ResultCode: ${response.data.ResultCode}`);
    return { success: true, data: response.data };

  } catch (error) {
    console.error('Failed to query transaction status: ', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initiateSTKPush,
  queryTransactionStatus,
  getAccessToken
};
