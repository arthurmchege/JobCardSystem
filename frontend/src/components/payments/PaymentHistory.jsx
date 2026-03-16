import { useState, useEffect } from "react";
import { paymentAPI } from "../../services/api";

const PaymentHistory = ({ jobId }) => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        const fetchPayments = async () => {
        try {
            const result = await paymentAPI.getJobPayments(jobId);
            setPayments(result.data.payments || []);
        } catch (err) {
            console.error('Failed to load payment history:', err);
        } finally {
            setLoading(false);
        }
        };

        fetchPayments();
    }, [jobId]);

      const STATUS_CONFIG = {
    success:        { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Success' },
    failed:         { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Failed' },
    cancelled:      { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Cancelled' },
    pending:        { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending' },
    pending_review: { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Under Review' },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <svg className="h-6 w-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  if (payments.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">No payment attempts yet</p>
  );

  return (
    <div className="space-y-2">
      {payments.map((payment) => {
        const cfg = STATUS_CONFIG[payment.payment_status] || STATUS_CONFIG.pending;
        return (
          <div key={payment.id} className="flex items-center justify-between p-3
            bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full
                  text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                {payment.mpesa_receipt_number && (
                  <span className="text-xs font-mono text-gray-500">
                    {payment.mpesa_receipt_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                KES {parseFloat(payment.amount).toLocaleString()} ·{' '}
                {new Date(payment.payment_initiated).toLocaleString('en-GB')}
              </p>
              {payment.result_description && (
                <p className="text-xs text-gray-400 mt-0.5">{payment.result_description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

}

export default PaymentHistory;