# 🔄 Complete Payment System Flow - Job Card System

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Job Lifecycle & Payment Triggers](#job-lifecycle--payment-triggers)
3. [M-Pesa Payment Flow (Supervisor-Initiated)](#m-pesa-payment-flow-supervisor-initiated)
4. [Paystack Payment Flow (Customer-Initiated)](#paystack-payment-flow-customer-initiated)
5. [Database Schema](#database-schema)
6. [Code Architecture](#code-architecture)

---

## 🎯 System Overview

The Job Card System handles payments through **two parallel flows**:

| Aspect | M-Pesa | Paystack |
|--------|--------|----------|
| **Initiator** | Supervisor (backend) | Customer (frontend) |
| **Trigger** | Supervisor clicks "Pay via M-Pesa" | Customer clicks "Pay Now" on invoice link |
| **Provider** | Safaricom | Paystack |
| **User Experience** | STK Push → PIN entry → Confirmation | Browser redirect → Card entry → Redirect back |
| **Callback** | Webhook from Safaricom | Prompt verification + Webhook |
| **Status Update** | Callback handler updates DB | Frontend verification + Webhook |

---

## 📊 Job Lifecycle & Payment Triggers

### Phase 1️⃣: Job Creation
```
Supervisor creates job card
    ↓
Job Card Created (status = 'pending')
    ↓
✉️ Email sent to Technician with PDF attachment
    ↓
Job Card Ready for Technician
```

**Files Involved:**
- `backend/src/routes/jobCard.routes.js` - POST `/job-cards`
- `backend/src/controllers/jobCard.controller.js` - `createJobCard()`
- `backend/src/services/jobCard.service.js` - `createJobCard()`
- `backend/src/services/email.service.js` - `sendJobAssignmentEmail()`

**Triggered Actions:**
```javascript
// In jobCard.service.js - createJobCard()
await emailService.sendJobAssignmentEmail(newJobCard, newJobCard.technician);
// → PDF is generated and attached
// → Technician receives email with job details
```

---

### Phase 2️⃣: Job Execution
```
Technician starts job (status = 'in_progress')
    ↓
Technician performs work
    ↓
Technician completes job
```

**Routes:**
- PATCH `/api/v1/job-cards/:id` - Update job (start)
- POST `/api/v1/job-cards/:id/complete` - Complete job

---

### Phase 3️⃣: Job Completion & Invoice Generation ⭐ CRITICAL
```
Technician submits completion form:
  - work_performed (required)
  - actual_end_time
  - customer_signature (optional)
    ↓
Backend completes job (status = 'completed')
    ↓
✉️ Email sent to ALL SUPERVISORS (job completion notification)
    ↓
✉️ Email sent to CUSTOMER:
  IF payment_amount is set:
    → Generate PAYMENT TOKEN
    → Send INVOICE EMAIL with "Pay Now" link
    → Payment link = https://<frontend>/pay/:token
  ELSE:
    → Send regular completion email
    ↓
Job is now READY FOR PAYMENT
```

**Critical Code Flow:**
```javascript
// In jobCard.service.js - completeJobCard()
const completedJob = await getJobCardById(jobCardId);

// Send to supervisors
const supervisors = await pool.query(
    'SELECT id, name, email FROM users WHERE role = $1',
    ['supervisor']
);
for (const supervisor of supervisors.rows) {
    await emailService.sendJobCompletionEmailToSupervisor(completedJob, supervisor);
}

// Send to customer with invoice
if (completedJob.payment_amount) {
    const token = await paystackService.generatePaymentToken(jobCardId);
    await emailService.sendJobCompletionEmailToCustomer(completedJob, token);
    // Token stored in: payment_links table
}
```

**Database Changes:**
- `job_cards` table:
  - `status` = 'completed'
  - `completed_at` = NOW()
  - `actual_end_time` = provided time
  - `work_performed` = provided description
  
  - `payment_links` table (for Paystack):
    - NEW ROW inserted with: `token`, `job_card_id`, `is_used = false`

---

## 💰 M-Pesa Payment Flow (Supervisor-Initiated)

### Complete Flow Diagram
```
STEP 1: Supervisor initiates
        └─→ Clicks "Pay via M-Pesa" on completed job
        
STEP 2: Frontend shows modal
        └─→ Supervisor enters customer's M-Pesa phone number
        
STEP 3: Frontend calls backend
        └─→ POST /api/v1/payments/initiate
            {
              job_card_id: "uuid",
              phone_number: "254708374149"
            }
        
STEP 4: Backend validates & creates payment record
        └─→ Check: Job exists and is completed
        └─→ Check: Job not already paid
        └─→ Check: Payment amount is set
        └─→ Create payments table row with status='pending'
        └─→ Update job_cards: payment_status='pending'
        
STEP 5: Backend initiates STK Push
        └─→ Get Safaricom access token
        └─→ POST to Safaricom STK Push endpoint
        └─→ Parameters:
            - Phone: 254708374149
            - Amount: 1000 (in KES)
            - AccountReference: Job-abcd1234
            - CallbackURL: https://backend:5000/api/v1/payments/callback
        └─→ Save CheckoutRequestID in payments table
        
STEP 6: Customer receives STK Prompt
        └─→ M-Pesa dialog appears on customer's phone
        └─→ Customer enters PIN
        
STEP 7✅: Payment success OR failure
        
        ✅ SUCCESS:
        └─→ Safaricom sends webhook to: /api/v1/payments/callback
            {
              Body: {
                stkCallback: {
                  CheckoutRequestID: "abc123",
                  ResultCode: 0,
                  ResultDesc: "The service request has been processed successfully.",
                  CallbackMetadata: {
                    Item: [
                      { Name: "Amount", Value: 1000 },
                      { Name: "MpesaReceiptNumber", Value: "ABC123XYZ" },
                      { Name: "TransactionDate", Value: "20260313145535" }
                    ]
                  }
                }
              }
            }
        
        ❌ FAILED (ResultCode ≠ 0):
        └─→ Safaricom sends webhook with error code
            ResultCode = 1032 (User Cancelled)
            ResultCode = 17 (Invalid Amount)
            etc.
        
STEP 8: Callback Handler processes response
        └─→ Validate CheckoutRequestID exists in DB
        └─→ Check for duplicates (payment_status != 'success')
        
        ✅ IF SUCCESS (ResultCode = 0):
        └─→ Extract from callback:
            - amountPaid: 1000
            - receiptNumber: ABC123XYZ
            - transactionDate: 2026-03-13 14:55:35
        └─→ Update payments table:
            - payment_status = 'success'
            - mpesa_receipt_number = 'ABC123XYZ'
            - amount_paid = 1000
            - transaction_date = '2026-03-13 14:55:35'
            - payment_completed = NOW()
        └─→ Update job_cards:
            - payment_status = 'paid'
            - fully_paid_at = NOW()
            - last_payment_id = payment.id
        
        ❌ IF FAILED/CANCELLED:
        └─→ Update payments table:
            - payment_status = 'failed' or 'cancelled'
            - result_code = 1032 (or error code)
            - result_description = user-friendly message
        └─→ Revert job_cards:
            - payment_status = 'unpaid'

STEP 9: Supervisor sees result
        └─→ Payment history updates in real-time
        └─→ If success: Job marked as "PAID" ✅
        └─→ If failed: Can retry
```

### Implementation Details

**Route Definition:**
```javascript
// backend/src/routes/payment.routes.js
router.post('/initiate', authenticate, validateRequest(initiatePaymentSchema), 
    paymentController.initiatePayment);
router.post('/callback', paymentController.handleCallback);
```

**Controller - Initiate Payment:**
```javascript
// backend/src/controllers/payment.controller.js
const initiatePayment = async (req, res) => {
    const { job_card_id, phone_number } = req.body;
    
    // Validation checks
    const jobResult = await db.query(
        'SELECT * FROM job_cards WHERE id = $1', [job_card_id]
    );
    
    if (jobResult.rows[0].status !== 'completed')
        return res.status(400).json({ error: 'Job not completed' });
    
    if (jobResult.rows[0].payment_status === 'paid')
        return res.status(400).json({ error: 'Already paid' });
    
    // Create payment record
    const paymentResult = await db.query(
        `INSERT INTO payments (job_card_id, phone_number, amount, 
            account_reference, payment_status) 
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [job_card_id, phone_number, jobCard.payment_amount, 
         `Job-${job_card_id.substring(0, 8)}`]
    );
    
    // Update job status to pending
    await db.query(
        'UPDATE job_cards SET payment_status = $1 WHERE id = $2',
        ['pending', job_card_id]
    );
    
    // Initiate STK Push
    const stkResult = await initiateSTKPush(
        phone_number,
        jobCard.payment_amount,
        job_card_id,
        `Payment for Job-${job_card_id.substring(0, 8)}`
    );
    
    // Save CheckoutRequestID
    await db.query(
        'UPDATE payments SET checkout_request_id = $1 WHERE id = $2',
        [stkResult.data.CheckoutRequestID, payment.id]
    );
    
    return res.json({
        success: true,
        data: {
            payment_id: payment.id,
            checkout_request_id: stkResult.data.CheckoutRequestID,
            amount: jobCard.payment_amount
        }
    });
};
```

**M-Pesa Service - STK Push:**
```javascript
// backend/src/services/mpesa.service.js
const initiateSTKPush = async (phoneNumber, amount, jobCardId, description) => {
    const accessToken = await getAccessToken(); // OAuth token from Safaricom
    const timestamp = generateTimestamp(); // Format: YYYYMMDDHHmmss
    const password = generatePassword(BUSINESS_SHORTCODE, PASSKEY, timestamp);
    
    const requestBody = {
        BusinessShortCode: '174379',
        Password: password, // Base64 encoded
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(amount),
        PartyA: phoneNumber, // Customer's M-Pesa number
        PartyB: '174379',    // Business short code
        PhoneNumber: phoneNumber,
        CallBackURL: 'https://backend:5000/api/v1/payments/callback',
        AccountReference: `Job-${jobCardId.substring(0, 8)}`,
        TransactionDesc: description
    };
    
    const response = await axios.post(MPESA_STK_PUSH_URL, requestBody, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    return { success: true, data: response.data };
    // Returns: { CheckoutRequestID: "abc123...", ResponseCode: "0", ... }
};
```

**Callback Handler - Process M-Pesa Response:**
```javascript
// backend/src/controllers/payment.controller.js
const handleCallback = async (req, res) => {
    // IMMEDIATE RESPONSE (Safaricom requires 200 OK within seconds)
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    
    // Process asynchronously
    const callbackData = req.body.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const checkoutRequestID = callbackData.CheckoutRequestID;
    
    // Find payment record
    const paymentResult = await db.query(
        'SELECT * FROM payments WHERE checkout_request_id = $1',
        [checkoutRequestID]
    );
    
    if (paymentResult.rows.length === 0) {
        console.error(`Payment not found for: ${checkoutRequestID}`);
        return; // Can't do anything without payment record
    }
    
    const payment = paymentResult.rows[0];
    
    // Prevent duplicate processing
    if (payment.payment_status === 'success') {
        console.log('Duplicate callback');
        return;
    }
    
    if (resultCode === 0) {
        // ✅ PAYMENT SUCCESSFUL
        const metadata = callbackData.CallbackMetadata.Item;
        const amountPaid = metadata.find(i => i.Name === 'Amount').Value;
        const receiptNumber = metadata.find(i => i.Name === 'MpesaReceiptNumber').Value;
        const transactionDateRaw = metadata.find(i => i.Name === 'TransactionDate').Value;
        
        // Parse date: 20260313145535 → 2026-03-13 14:55:35
        const ts = String(transactionDateRaw);
        const transactionDate = 
            `${ts.substring(0,4)}-${ts.substring(4,6)}-${ts.substring(6,8)} ` +
            `${ts.substring(8,10)}:${ts.substring(10,12)}:${ts.substring(12,14)}`;
        
        // Update payment record
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
            [amountPaid, receiptNumber, transactionDate, resultCode, 
             callbackData.ResultDesc, payment.id]
        );
        
        // Update job card to PAID ⭐
        await db.query(
            `UPDATE job_cards SET
                payment_status = 'paid',
                fully_paid_at = CURRENT_TIMESTAMP,
                last_payment_id = $1
            WHERE id = $2`,
            [payment.id, payment.job_card_id]
        );
        
        console.log(`✅ Payment Success - Receipt: ${receiptNumber}`);
    } else {
        // ❌ PAYMENT FAILED
        const failStatus = resultCode === 1032 ? 'cancelled' : 'failed';
        
        await db.query(
            `UPDATE payments SET
                payment_status = $1,
                result_code = $2,
                result_description = $3
            WHERE id = $4`,
            [failStatus, resultCode, callbackData.ResultDesc, payment.id]
        );
        
        // Revert job to unpaid
        await db.query(
            'UPDATE job_cards SET payment_status = $1 WHERE id = $2',
            ['unpaid', payment.job_card_id]
        );
        
        console.log(`❌ Payment ${failStatus} - Code: ${resultCode}`);
    }
};
```

**Frontend - Payment Modal:**
```javascript
// frontend/src/components/payments/PaymentModal.jsx
const handleSubmit = async () => {
    if (!/^254[0-9]{9}$/.test(phoneNumber)) {
        setError('Phone number must be in format 254XXXXXXXXX');
        return;
    }
    
    try {
        const result = await paymentAPI.initiatePayment(job.id, phoneNumber);
        
        // result contains:
        // {
        //   payment_id: "uuid",
        //   checkout_request_id: "abc123...",
        //   amount: 1000
        // }
        
        setReceipt(result.data.checkout_request_id);
        setSuccess(true);
        
        // Poll backend for payment status
        // OR wait for refresh from parent component
        
    } catch (err) {
        setError(err.message);
    }
};
```

**Frontend API Call:**
```javascript
// frontend/src/services/api.js
export const paymentAPI = {
    initiatePayment: async (jobCardId, phoneNumber) => {
        return await fetchWithAuth('/payments/initiate', {
            method: 'POST',
            body: JSON.stringify({
                job_card_id: jobCardId,
                phone_number: phoneNumber
            })
        });
    },
    
    getPaymentStatus: async (paymentId) => {
        return await fetchWithAuth(`/payments/${paymentId}`);
    },
    
    getJobPayments: async (jobId) => {
        return await fetchWithAuth(`/payments/job/${jobId}`);
    }
};
```

---

## 💳 Paystack Payment Flow (Customer-Initiated)

### Complete Flow Diagram
```
STEP 1: Job completed & invoice sent
        └─→ Backend generates PAYMENT TOKEN
        └─→ Email sent to customer with link:
            https://<frontend>/pay/TOKEN_HERE?reference=...
        
STEP 2: Customer receives email
        └─→ Clicks "💳 Pay Now" link
        
STEP 3: Browser navigates to PaymentPage
        └─→ URL: https://frontend/pay/:token
        └─→ React Router matches route to PaymentPage component
        
STEP 4: PaymentPage loads
        └─→ useEffect runs with [token]
        └─→ No reference param in URL yet (initial load)
        └─→ Calls: paystackAPI.getPaymentDetails(token)
        
STEP 5: Backend retrieves invoice details
        └─→ GET /api/v1/pay/:token
        └─→ Query payment_links table WHERE token = :token
        └─→ JOIN with job_cards and customers tables
        └─→ Return job details:
            {
              valid: true,
              job_title: "Printer Installation",
              customer_name: "John Doe",
              payment_amount: 5000,
              completed_at: "2026-03-13T10:30:00Z",
              ...
            }
        
STEP 6: PaymentPage renders invoice
        └─→ Displays:
            - Service title
            - Customer name
            - Amount due
            - "💳 Pay Now" button
        
STEP 7: Customer clicks "Pay Now"
        └─→ handlePay() called
        └─→ Calls: paystackAPI.initializePayment(token)
        └─→ POST /api/v1/pay/:token/initialize
        
STEP 8: Backend initializes Paystack transaction
        └─→ Get payment link details again using token
        └─→ Verify payment not already completed
        └─→ POST to Paystack init endpoint:
            {
              email: "customer@example.com",
              amount: 500000, // 5000 KES in kobo
              currency: "KES",
              reference: "JC-abc12345-1678789234567",
              callback_url: "https://frontend/pay/TOKEN",
              metadata: {
                job_card_id: "uuid",
                token: "TOKEN"
              }
            }
        └─→ Paystack returns:
            {
              authorization_url: "https://checkout.paystack.com/...",
              reference: "JC-abc12345-1678789234567"
            }
        └─→ Save reference in payment_links table
        
STEP 9: Frontend redirects to Paystack
        └─→ window.location.href = data.authorization_url
        └─→ Customer redirected to Paystack checkout page
        
STEP 10: Customer enters card details
        └─→ Paystack page displays payment form
        └─→ Customer enters:
            - Card number
            - Expiry date
            - CVV
            - OTP (if required)
        
STEP 11: Payment processed
        
        ✅ PAYMENT SUCCESSFUL:
        └─→ Paystack processes charge
        └─→ Backend receives webhook (optional):
            POST /api/v1/webhook
            event: "charge.success"
            data.reference: "JC-abc12345-1678789234567"
        
        ❌ PAYMENT FAILED:
        └─→ Paystack shows error to customer
        
STEP 12: Paystack redirects customer back
        └─→ Redirect to: https://frontend/pay/:token?reference=JC-abc12345-1678789234567
        └─→ Browser navigates to PaymentPage with reference param
        
STEP 13: PaymentPage detects reference param
        └─→ useEffect checks: searchParams.get('reference')
        └─→ Calls: paystackAPI.verifyPayment(token, reference)
        └─→ GET /api/v1/pay/:token/verify?reference=JC-abc12345-1678789234567
        
STEP 14: Backend verifies with Paystack
        └─→ Query Paystack API:
            GET https://api.paystack.co/transaction/verify/:reference
            Headers: Authorization: Bearer SECRET_KEY
        └─→ Paystack returns transaction status:
            {
              status: "success", // or "failed", "abandoned"
              amount: 500000,
              currency: "KES"
            }
        
STEP 15: Update database
        
        ✅ IF VERIFIED SUCCESS:
        └─→ Find job_card_id via payment_links.paystack_reference
        └─→ Update job_cards:
            - payment_status = 'paid'
            - fully_paid_at = NOW()
        └─→ Update payment_links:
            - is_used = true
        
        ❌ IF VERIFICATION FAILED:
        └─→ Return status: 'failed'
        
STEP 16: Frontend displays result
        
        ✅ SUCCESS:
        └─→ setStatus('success')
        └─→ Display: "Payment Successful" ✅
            "Thank you! Your payment has been received."
        
        ❌ FAILED:
        └─→ setStatus('failed')
        └─→ Display: "Payment Failed" ⚠️
            "Payment was not completed successfully."
        
        🔄 ALREADY PAID:
        └─→ setStatus('already_paid')
        └─→ Display: "Already Paid" ✅
            "This invoice has already been paid. Thank you!"
```

### Implementation Details

**Payment Link Generation (on job completion):**
```javascript
// backend/src/services/paystack.service.js
const generatePaymentToken = async (jobCardId) => {
    const token = crypto.randomBytes(32).toString('hex'); // 64-char hex string
    
    // Check if unused token already exists
    const existing = await pool.query(
        'SELECT id, token, is_used FROM payment_links WHERE job_card_id = $1',
        [jobCardId]
    );
    
    if (existing.rows.length > 0 && !existing.rows[0].is_used) {
        console.log('Re-using existing token for job');
        return existing.rows[0].token;
    }
    
    // Insert or update payment link
    await pool.query(
        `INSERT INTO payment_links (job_card_id, token)
         VALUES ($1, $2)
         ON CONFLICT (job_card_id)
         DO UPDATE SET token = $2, is_used = false, updated_at = CURRENT_TIMESTAMP`,
        [jobCardId, token]
    );
    
    return token;
};
```

**Frontend: Get Payment Details:**
```javascript
// frontend/src/services/api.js
export const paystackAPI = {
    getPaymentDetails: async (token) => {
        const response = await fetch(`${API_BASE_URL}/pay/${token}`);
        return await handleResponse(response);
    },
    ...
};

// frontend/src/pages/payment/PaymentPage.jsx
const loadPaymentDetails = async () => {
    try {
        const data = await paystackAPI.getPaymentDetails(token);
        if (!data.valid && data.reason === 'already_paid') {
            setStatus('already_paid');
        } else if (!data.valid) {
            setStatus('invalid');
            setError(data.reason);
        } else {
            setJob(data);
            setStatus('valid');
        }
    } catch (err) {
        setStatus('invalid');
        setError('Something went wrong. Please contact support.');
    }
};
```

**Backend: Get Payment Details:**
```javascript
// backend/src/controllers/paystack.controller.js
const getPaymentDetails = async (req, res) => {
    const { token } = req.params;
    const details = await paystackService.getPaymentLinkDetails(token);
    res.json(details);
};

// backend/src/services/paystack.service.js
const getPaymentLinkDetails = async (token) => {
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
    
    // Check if already paid
    if (row.payment_status === 'paid') {
        return {
            valid: false,
            reason: 'already_paid',
            job_title: row.title,
            customer_name: row.customer_name
        };
    }
    
    return {
        valid: true,
        link_id: row.link_id,
        token: row.token,
        job_card_id: row.job_card_id,
        job_title: row.title,
        payment_amount: row.payment_amount,
        completed_at: row.completed_at,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        public_key: PAYSTACK_PUBLIC_KEY
    };
};
```

**Frontend: Initialize Payment:**
```javascript
// frontend/src/pages/payment/PaymentPage.jsx
const handlePay = async () => {
    try {
        setPaying(true);
        const data = await paystackAPI.initializePayment(token);
        // data.authorization_url contains Paystack checkout link
        window.location.href = data.authorization_url;
    } catch (err) {
        setError('Could not initialize payment. Please try again.');
        setPaying(false);
    }
};

// frontend/src/services/api.js
initializePayment: async (token) => {
    const response = await fetch(`${API_BASE_URL}/pay/${token}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return await handleResponse(response);
}
```

**Backend: Initialize Paystack Transaction:**
```javascript
// backend/src/controllers/paystack.controller.js
const initializePayment = async (req, res) => {
    const { token } = req.params;
    const details = await paystackService.getPaymentLinkDetails(token);
    
    if (!details.valid) {
        return res.status(400).json({
            error: 'This payment link is no longer valid'
        });
    }
    
    const { authorization_url, reference } = 
        await paystackService.initializeTransaction(
            details.customer_email,
            details.payment_amount,
            details.job_card_id,
            token
        );
    
    res.json({ authorization_url, reference });
};

// backend/src/services/paystack.service.js
const initializeTransaction = async (email, amount, jobCardId, token) => {
    const amountInKobo = amount * 100; // Convert KES to kobo
    
    const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
            email: email,
            amount: amountInKobo,
            currency: 'KES',
            reference: `JC-${jobCardId}-${Date.now()}`, // Unique reference
            callback_url: buildPaystackCallbackUrl(token), // https://frontend/pay/token
            metadata: {
                job_card_id: jobCardId,
                token: token
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
    
    // Save reference in payment_links for later verification
    await pool.query(
        `UPDATE payment_links
         SET paystack_reference = $1, updated_at = CURRENT_TIMESTAMP
         WHERE job_card_id = $2`,
        [reference, jobCardId]
    );
    
    return { authorization_url, reference };
};

// Helper function
const buildPaystackCallbackUrl = (token) => {
    const base = PAYSTACK_CALLBACK_URL.replace(/\/+$/, '');
    return `${base}/${token}`;
};
```

**Frontend: Verify Payment:**
```javascript
// frontend/src/pages/payment/PaymentPage.jsx
const verifyPayment = async () => {
    try {
        const data = await paystackAPI.verifyPayment(token, reference);
        if (data.paid) {
            setStatus('success');
        } else {
            setStatus('failed');
            setError('Payment was not completed successfully.');
        }
    } catch (err) {
        setStatus('failed');
        setError('Could not verify payment. Please contact support.');
    }
};

// frontend/src/services/api.js
verifyPayment: async (token, reference) => {
    const response = await fetch(
        `${API_BASE_URL}/pay/${token}/verify?reference=${reference}`
    );
    return await handleResponse(response);
}
```

**Backend: Verify Payment:**
```javascript
// backend/src/controllers/paystack.controller.js
const verifyPayment = async (req, res) => {
    const { token } = req.params;
    const { reference } = req.query;
    
    const verifyResult = await paystackService.verifyTransaction(reference);
    res.json(verifyResult);
};

// backend/src/services/paystack.service.js
const verifyTransaction = async (reference) => {
    // Query Paystack API
    const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
            }
        }
    );
    
    const { status, amount, currency } = response.data.data;
    
    // Find job card via payment_links
    const linkResult = await pool.query(
        `SELECT job_card_id FROM payment_links WHERE paystack_reference = $1`,
        [reference]
    );
    
    if (linkResult.rows.length === 0) {
        const error = new Error('No payment link found for this reference');
        error.statusCode = 404;
        throw error;
    }
    
    const jobCardId = linkResult.rows[0].job_card_id;
    
    // If successful, update database
    if (status === 'success') {
        // Update job to paid ⭐
        await pool.query(
            `UPDATE job_cards
             SET payment_status = 'paid', fully_paid_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [jobCardId]
        );
        
        // Mark payment link as used
        await pool.query(
            `UPDATE payment_links
             SET is_used = true, updated_at = CURRENT_TIMESTAMP
             WHERE paystack_reference = $1`,
            [reference]
        );
    }
    
    return {
        paid: status === 'success',
        status: status, // 'success', 'failed', 'abandoned'
        amount: amount / 100, // Convert from kobo back to KES
        currency: currency,
        job_card_id: jobCardId
    };
};
```

**Webhook Handler (for payment confirmations):**
```javascript
// backend/src/controllers/paystack.controller.js
const handleWebhook = async (req, res) => {
    const signature = req.headers['x-paystack-signature'];
    const isValid = paystackService.verifyWebhookSignature(req.body, signature);
    
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = JSON.parse(req.body);
    
    if (event.event === 'charge.success') {
        // Verify the payment via API
        await paystackService.verifyTransaction(event.data.reference);
    }
    
    res.sendStatus(200);
};
```

---

## 📦 Database Schema

### Tables and Relationships

```
job_cards
├── id (UUID, PK)
├── customer_id (FK → customers)
├── technician_id (FK → users)
├── status ('pending' | 'in_progress' | 'completed')
├── payment_amount (DECIMAL) ←── Set by supervisor or system
├── payment_status ('unpaid' | 'pending' | 'paid') ←── Updated by payment system
├── fully_paid_at (TIMESTAMP) ←── Set when payment succeeds
├── completed_at (TIMESTAMP)
├── ... (other job fields)
└── last_payment_id (FK → payments)

payments (M-Pesa transactions)
├── id (UUID, PK)
├── job_card_id (FK → job_cards)
├── phone_number
├── amount
├── amount_paid
├── checkout_request_id (Safaricom STK request ID)
├── mpesa_receipt_number
├── payment_status ('pending' | 'success' | 'failed' | 'cancelled')
├── result_code (M-Pesa response code)
├── result_description
├── transaction_date
├── payment_completed
└── created_at

payment_links (Paystack payment tokens)
├── id (UUID, PK)
├── job_card_id (FK → job_cards)
├── token (64-char hex string)
├── paystack_reference (Paystack transaction reference)
├── is_used (boolean)
└── created_at

customers
├── id (UUID, PK)
├── name
├── email
├── phone
├── address
└── ... (customer details)

users (Technicians & Supervisors)
├── id (UUID, PK)
├── name
├── email
├── phone
├── role ('technician' | 'supervisor')
└── ... (user details)
```

### Key Fields for Payment Flow

```
payment_links table structure:
┌────────────────────────────────────────────────────────────┐
│ job_card_id │ token  │ paystack_reference │ is_used │ ... │
├────────────────────────────────────────────────────────────┤
│ abc-123     │ abcd.. │ null               │ false   │     │ ← Before init
├────────────────────────────────────────────────────────────┤
│ abc-123     │ abcd.. │ JC-abc-123-time    │ false   │     │ ← After init
├────────────────────────────────────────────────────────────┤
│ abc-123     │ abcd.. │ JC-abc-123-time    │ true    │     │ ← After verify
└────────────────────────────────────────────────────────────┘

payments table structure (M-Pesa):
┌──────────────┬─────────────┬──────────┬────────────────────┐
│ job_card_id  │ phone_num   │ amount   │ checkout_req_id    │
├──────────────┼─────────────┼──────────┼────────────────────┤
│ xyz-456      │ 254708.. │ 5000  │ abc-stk-123-xyz    │
│ payment_status: 'pending'                                  │
├──────────────┴─────────────┴──────────┴────────────────────┤
│ [Customer gets STK prompt]                                  │
├──────────────────────────────────────────────────────────┤
│ payment_status: 'success'                                  │
│ mpesa_receipt_number: 'ABC123DEF'                          │
│ amount_paid: 5000                                          │
│ transaction_date: 2026-03-13 14:55:35                      │
└──────────────────────────────────────────────────────────┘
```

---

## 🏗️ Code Architecture

### Directory Structure
```
backend/
├── src/
│   ├── controllers/
│   │   ├── payment.controller.js      ← M-Pesa payment flow
│   │   ├── paystack.controller.js     ← Paystack payment flow
│   │   └── jobCard.controller.js      ← Job lifecycle
│   │
│   ├── services/
│   │   ├── mpesa.service.js           ← M-Pesa integration
│   │   ├── paystack.service.js        ← Paystack integration
│   │   ├── jobCard.service.js         ← Job logic + invoice trigger
│   │   └── email.service.js           ← Invoice emails
│   │
│   ├── routes/
│   │   ├── payment.routes.js          ← /api/v1/payments/*
│   │   ├── paystack.routes.js         ← /api/v1/pay/*
│   │   └── jobCard.routes.js          ← /api/v1/job-cards/*
│   │
│   ├── middleware/
│   │   ├── authenticate.js            ← JWT verification
│   │   └── authorize.js               ← Role checking
│   │
│   ├── utils/
│   │   ├── mpesaHelpers.js            ← M-Pesa utilities
│   │   └── email.js                   ← Email sending
│   │
│   └── config/
│       └── database.js                ← PostgreSQL pool
│
├── .env                               ← Configuration
└── server.js                          ← Express setup

frontend/
├── src/
│   ├── pages/
│   │   ├── payment/
│   │   │   └── PaymentPage.jsx        ← Paystack checkout UI
│   │   │
│   │   └── supervisor/
│   │       └── SupervisorJobDetail.jsx ← M-Pesa trigger UI
│   │
│   ├── components/
│   │   └── payments/
│   │       ├── PaymentModal.jsx       ← M-Pesa modal
│   │       └── PaymentHistory.jsx     ← Payment list
│   │
│   ├── services/
│   │   └── api.js                     ← API endpoints
│   │
│   └── App.jsx                        ← Routes setup
```

### Request/Response Flow

```
USER ACTION (Frontend)
    ↓
API Call (services/api.js)
    ↓
HTTP Request → Backend
    ↓
Route Handler (routes/*)
    ↓
Controller (controllers/*)
    ↓
Business Logic (services/*)
    ↓
Database (PostgreSQL)
    ↓
External Service (Safaricom/Paystack)
    ↓
Webhook Callback (backend)
    ↓
Database Updated
    ↓
Frontend Polls or Receives Event
    ↓
UI Updated
```

---

## 🔄 Summary State Transitions

### M-Pesa Flow
```
job_cards.payment_status:
  unpaid → pending (when supervisor clicks Pay)
         → paid (when callback returns success)
         → unpaid (if callback returns failure)

payments.payment_status:
  pending (after initiation)
  → success (callback ResultCode = 0)
  → failed (callback ResultCode ≠ 0)
  → cancelled (callback ResultCode = 1032)
```

### Paystack Flow
```
payment_links.is_used:
  false (when created on job completion)
  → true (when payment verification succeeds)

job_cards.payment_status:
  unpaid → paid (when customer successfully pays)
  unpaid (if payment verification fails)
```

---

## ⚙️ Configuration

### Backend .env
```env
# M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_BUSINESS_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://your-domain/api/v1/payments/callback
MPESA_STK_PUSH_URL=https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
MPESA_AUTH_URL=https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials

# Paystack
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_CALLBACK_URL=https://your-domain/pay

# Frontend URLs
FRONTEND_URL=https://your-domain
APP_URL=https://your-domain
```

---

## 🚀 Key Takeaways

| Aspect | M-Pesa | Paystack |
|--------|--------|----------|
| **Initiation** | Backend (supervisor phone input) | Frontend (customer link click) |
| **Provider** | Safaricom | Paystack |
| **UX** | STK prompt on phone + PIN | Browser redirect + card form |
| **Webhook** | Always used | Optional (frontend verification also) |
| **Status Update** | Callback handler → DB | Verification endpoint + Webhook |
| **Database Tables** | `payments` | `payment_links` |
| **Job Status** | `payment_status = 'paid'` | `payment_status = 'paid'` |

Both flows ensure the `job_cards` table is updated to `payment_status = 'paid'` and `fully_paid_at` is set when payment succeeds.
