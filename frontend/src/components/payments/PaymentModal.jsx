import { useState } from "react";
import { paymentAPI } from "../../services/api";

const PaymentModal = ({ job, onClose, onSuccess }) => {

    // State Variables
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [receipt, setReceipt] = useState('');

    // handleSubmit Function
    const handleSubmit = async () => {
        // Validate Phone number
        if (!phoneNumber.trim()) {
            setError('Phone number is required');
            return;
        }

        if(!/^254[0-9]{9}$/.test(phoneNumber)) {
            setError('Phone number must be in format 254XXXXXXXXX');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const result = await paymentAPI.initiatePayment(
                job.id,
                phoneNumber
            );

            setReceipt(result.data.checkout_request_id);
            setSuccess(true);
            onSuccess();

        }   catch (err) {
            setError(err.message || ' Failed to initiate payment. Please try again.');
        }   finally {
            setLoading(false);
        }
    };

    return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0,0,0.2,1)' }}>
        <style>{`@keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-slate-900">M-Pesa Payment</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {!success ? (
            <>
              {/* Job Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-400 mb-1">Paying for</p>
                <p className="text-sm font-semibold text-slate-800">{job.title}</p>
                <p className="text-xs text-gray-400 mt-2 mb-1">Amount</p>
                <p className="text-2xl font-bold text-slate-900">
                  KES {parseFloat(job.payment_amount).toLocaleString()}
                </p>
              </div>

              {/* Phone Input */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Customer M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setError(''); }}
                  placeholder="254708374149"
                  className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm
                    bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white
                    transition-all"
                />
                {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
                <p className="mt-1.5 text-xs text-gray-400">Format: 254XXXXXXXXX (12 digits)</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5">
                <button onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200
                    rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
                    text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-all">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Payment Request'}
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Request Sent!</h3>
              <p className="text-sm text-gray-500 mb-4">
                M-Pesa prompt sent to <strong>{phoneNumber}</strong>.
                Customer has 60 seconds to enter their PIN.
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Reference</p>
                <p className="text-xs font-mono text-gray-600 break-all">{receipt}</p>
              </div>
              <button onClick={onClose}
                className="w-full py-2.5 text-sm font-semibold text-white bg-slate-900
                  hover:bg-slate-800 rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

}

export default PaymentModal;