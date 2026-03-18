import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { paystackAPI } from '../../services/api';

export default function PaymentPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');

  const [status, setStatus] = useState('loading'); // loading | valid | already_paid | invalid | success | failed
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (reference) {
      verifyPayment();
    } else {
      loadPaymentDetails();
    }
  }, []);

  const loadPaymentDetails = async () => {
    try {
      const data = await paystackAPI.getPaymentDetails(token);
      if (!data.valid && data.reason === 'already_paid') {
        setStatus('already_paid');
      } else if (!data.valid) {
        setStatus('invalid');
        setError(data.reason || 'This payment link is invalid or has expired.');
      } else {
        setJob(data);
        setStatus('valid');
      }
    } catch (err) {
      setStatus('invalid');
      setError('Something went wrong. Please contact support.');
    }
  };

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

  const handlePay = async () => {
    try {
      setPaying(true);
      const data = await paystackAPI.initializePayment(token);
      window.location.href = data.authorization_url;
    } catch (err) {
      setError('Could not initialize payment. Please try again.');
      setPaying(false);
    }
  };

  // ── SCREENS ──────────────────────────────────────────────────────────────

  if (status === 'loading') return (
    <Screen>
      <p className="text-gray-500 text-lg">Loading payment details...</p>
    </Screen>
  );

  if (status === 'already_paid') return (
    <Screen>
      <div className="text-center">
        <p className="text-6xl mb-4">✅</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Already Paid</h1>
        <p className="text-gray-500">This invoice has already been paid. Thank you!</p>
      </div>
    </Screen>
  );

  if (status === 'invalid') return (
    <Screen>
      <div className="text-center">
        <p className="text-6xl mb-4">❌</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Link</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    </Screen>
  );

  if (status === 'success') return (
    <Screen>
      <div className="text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful</h1>
        <p className="text-gray-500">Thank you! Your payment has been received.</p>
      </div>
    </Screen>
  );

  if (status === 'failed') return (
    <Screen>
      <div className="text-center">
        <p className="text-6xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    </Screen>
  );

  // status === 'valid' — main payment screen
  return (
    <Screen>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">🧾</p>
          <h1 className="text-2xl font-bold text-gray-800">Your Invoice</h1>
          <p className="text-gray-500 text-sm mt-1">Copy Cat Group — Nairobi, Kenya</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="space-y-3 text-sm">
            <Row label="Service" value={job.job_title} />
            <Row label="Customer" value={job.customer_name} />
            <Row label="Completed" value={new Date(job.completed_at).toLocaleString('en-GB')} />
            <hr className="my-3" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700 text-base">Amount Due</span>
              <span className="font-bold text-indigo-600 text-xl">
                KES {Number(job.payment_amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-lg rounded-xl transition-colors"
        >
          {paying ? 'Redirecting...' : '💳 Pay Now'}
        </button>

        <p className="text-center text-gray-400 text-xs mt-4">
          🔒 Secure payment powered by Paystack
        </p>
      </div>
    </Screen>
  );
}

// ── SMALL REUSABLE COMPONENTS ─────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}