// JOB DETAIL - SUPERVISOR VIEW (WITHOUT SIGNATURE)

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobCardAPI } from '../../services/api';
import PaymentModal from '../../components/payments/PaymentModal';
import PaymentHistory from '../../components/payments/PaymentHistory';

const STATUS_CONFIG = {
  pending:     { bg:'bg-yellow-100', text:'text-yellow-800', dot:'bg-yellow-400', label:'Pending' },
  in_progress: { bg:'bg-blue-100',   text:'text-blue-800',   dot:'bg-blue-500',   label:'In Progress' },
  completed:   { bg:'bg-green-100',  text:'text-green-800',  dot:'bg-green-500',  label:'Completed' },
};
const fmt  = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtT = d => d ? new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

const SupervisorJobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRefresh, setPaymentRefresh] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await jobCardAPI.getById(id);
        setJob(res.data.jobCard);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Failed to load job card');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await jobCardAPI.delete(id);
      navigate('/supervisor/jobs');
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Failed to delete job card');
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleDownloadPDF = async (jobCardId) => {
    try {
      const blob = await jobCardAPI.downloadPDF(jobCardId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `job-card-${jobCardId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading PDF:', e);
      alert('Failed to download PDF: ' + e.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <svg className="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  if (error || !job) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <p className="text-red-700 font-medium mb-1">Failed to load job card</p>
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => navigate('/supervisor/jobs')}
        className="mt-4 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">
        ← Back to Jobs
      </button>
    </div>
  );

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-gray-900 flex-1">{job.title}</h1>
        <div className="flex items-center gap-3">
          {job.status === 'completed' && (
            <button onClick={() => handleDownloadPDF(id)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Report
            </button>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`}/>{cfg.label}
          </span>
        </div>
      </div>

      {/* Job Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Job Details</h2>
        {job.description && <p className="text-sm text-gray-600 mb-4">{job.description}</p>}
        <InfoRow label="Scheduled" value={fmt(job.scheduled_date)}/>
        <InfoRow label="Priority" value={job.priority?.charAt(0).toUpperCase()+job.priority?.slice(1)}/>
        {job.estimated_duration && <InfoRow label="Est. Duration" value={`${job.estimated_duration} mins`}/>}
        {job.actual_start_time  && <InfoRow label="Started"    value={fmtT(job.actual_start_time)}/>}
        {job.completed_at       && <InfoRow label="Completed"  value={fmtT(job.completed_at)}/>}
        {job.notes              && <InfoRow label="Notes"      value={job.notes}/>}
      </div>

      {/* Two-col: Customer + Technician */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer</h2>
          <InfoRow label="Name"    value={job.customer?.name}/>
          <InfoRow label="Contact" value={job.customer?.contact_person}/>
          <InfoRow label="Phone"   value={job.customer?.phone}/>
          <InfoRow label="Address" value={job.customer?.address}/>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Technician</h2>
          <InfoRow label="Name"  value={job.technician?.name}/>
          <InfoRow label="Email" value={job.technician?.email}/>
          <InfoRow label="Phone" value={job.technician?.phone}/>
        </div>
      </div>

      {/* Completion summary */}
      {job.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Completion Report
          </h2>
          <p className="text-xs font-medium text-green-700 mb-1">Work performed</p>
          <p className="text-sm text-green-900 mb-3">{job.work_performed}</p>
          {job.notes && (
            <>
              <p className="text-xs font-medium text-green-700 mb-1">Additional notes</p>
              <p className="text-sm text-green-900">{job.notes}</p>
            </>
          )}
        </div>
      )}

      {/* Payment Section (if payment amount is set) */}
      {job.payment_amount && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Payment</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {job.payment_status === 'paid' ? 'This job has been paid' :
                 job.payment_status === 'pending' ? 'Payment in progress...' :
                 'Payment is due for this job'}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
              ${job.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                job.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'}`}>
              {job.payment_status === 'paid' ? 'Paid' :
               job.payment_status === 'pending' ? 'Pending' : 'Unpaid'}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-400 mb-1">Amount Due</p>
            <p className="text-xl font-bold text-slate-900">
              KES {parseFloat(job.payment_amount).toLocaleString()}
            </p>
          </div>

          {job.payment_status !== 'paid' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-green-600
                hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl
                transition-all active:scale-[0.99]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2v-1a7 7 0 00-14 0v1a2 2 0 002 2z"/>
              </svg>
              Pay via M-Pesa
            </button>
          )}

          {/* Payment History */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Payment History
            </p>
            <PaymentHistory key={paymentRefresh} jobId={id} />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          job={job}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setPaymentRefresh(prev => prev + 1);
            setShowPaymentModal(false);
          }}
        />
      )}

      {/* Delete (pending only) */}
      {job.status === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Danger Zone</h2>
          <p className="text-xs text-gray-400 mb-4">Only pending job cards can be deleted. This cannot be undone.</p>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200
                rounded-lg hover:bg-red-50 transition-colors">
              Delete Job Card
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-700">Are you sure?</p>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600
                  rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300
                  rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupervisorJobDetail;