import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobCardAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { SkeletonDetail } from '../../components/ui/Skeleton';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';

const STATUS = {
  pending:     { label:'Pending',     pill:'bg-amber-100 text-amber-700',     bar:'bg-amber-400', dot:'bg-amber-400' },
  in_progress: { label:'In Progress', pill:'bg-blue-100 text-blue-700',       bar:'bg-blue-500',  dot:'bg-blue-500'  },
  completed:   { label:'Completed',   pill:'bg-emerald-100 text-emerald-700', bar:'bg-emerald-500', dot:'bg-emerald-500' },
};

const InfoRow = ({ label, value, last }) => (
  <div className={`flex justify-between items-start py-2.5 ${!last ? 'border-b border-gray-50' : ''}`}>
    <span className="text-xs text-gray-400 shrink-0">{label}</span>
    <span className="text-xs font-medium text-gray-800 text-right ml-4 max-w-[55%] leading-relaxed">
      {value || '—'}
    </span>
  </div>
);

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [starting, setStarting]     = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ work_performed:'', notes:'' });
  const [formErr, setFormErr]       = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await jobCardAPI.getById(id);
        setJob(res.data.jobCard);
      } catch (e) { setError(typeof e === 'string' ? e : 'Failed to load job'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const startJob = async () => {
    setStarting(true);
    try {
      const res = await jobCardAPI.update(id, {
        status: 'in_progress',
        actual_start_time: new Date().toISOString(),
      });
      setJob(res.data.jobCard);
      toast.success('Job started — start time recorded');
    } catch (e) { toast.error(typeof e === 'string' ? e : 'Failed to start job'); }
    finally { setStarting(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.work_performed.trim()) e.work_performed = 'Required';
    else if (form.work_performed.trim().length < 10) e.work_performed = 'Minimum 10 characters';
    setFormErr(e);
    return !Object.keys(e).length;
  };

  const completeJob = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setCompleting(true);
    try {
      const res = await jobCardAPI.complete(id, {
        actual_end_time: new Date().toISOString(),
        work_performed: form.work_performed.trim(),
        notes: form.notes.trim() || undefined,
      });
      setJob(res.data.jobCard);
      setShowForm(false);
      toast.success('Job completed successfully!');
    } catch (e) { toast.error(typeof e === 'string' ? e : 'Failed to complete job'); }
    finally { setCompleting(false); }
  };

  if (loading) return <SkeletonDetail />;
  if (error || !job) return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-center">
      <p className="text-red-600 font-medium text-sm mb-3">{error || 'Job not found'}</p>
      <button onClick={() => navigate('/technician')}
        className="text-xs text-gray-500 underline">Back to jobs</button>
    </div>
  );

  const s = STATUS[job.status] || STATUS.pending;
  const isPending    = job.status === 'pending';
  const isInProgress = job.status === 'in_progress';
  const isCompleted  = job.status === 'completed';

  return (
    <div className="space-y-3">
      {/* ── Status bar ── */}
      <div className={`h-1 rounded-full ${s.bar}`}/>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h1 className="tech-title text-lg font-bold text-slate-900 leading-snug">{job.title}</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${s.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>{s.label}
          </span>
        </div>
        {job.description && (
          <p className="text-sm text-gray-500 leading-relaxed mb-3">{job.description}</p>
        )}
        <InfoRow label="Scheduled"   value={fmtDate(job.scheduled_date)} />
        <InfoRow label="Priority"    value={
          <span className={job.priority==='high'?'text-red-500 font-semibold':job.priority==='low'?'text-gray-400':'text-amber-500 font-medium'}>
            {job.priority?.charAt(0).toUpperCase()+job.priority?.slice(1)}
          </span>} />
        {job.estimated_duration && <InfoRow label="Est. time" value={`${job.estimated_duration} min`}/>}
        {isInProgress && <InfoRow label="Started" value={fmtTime(job.actual_start_time)}/>}
        {isCompleted   && <InfoRow label="Completed" value={fmtTime(job.completed_at)} last/>}
      </div>

      {/* ── Customer card ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
        <InfoRow label="Name"    value={job.customer?.name}/>
        <InfoRow label="Contact" value={job.customer?.contact_person}/>
        <InfoRow label="Phone"   value={
          job.customer?.phone
            ? <a href={`tel:${job.customer.phone}`} className="text-amber-600 font-medium">{job.customer.phone}</a>
            : null}/>
        <InfoRow label="Address" value={job.customer?.address} last/>
      </div>

      {/* ── START JOB ── */}
      {isPending && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ready to begin?</p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            This records your start time and marks the job active.
          </p>
          <button onClick={startJob} disabled={starting}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800
              text-white text-sm font-semibold py-3 rounded-xl transition-all duration-150
              disabled:opacity-50 active:scale-[0.99]">
            {starting
              ? <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Starting…</>
              : <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Start Job</>
            }
          </button>
        </div>
      )}

      {/* COMPLETE JOB */}
      {isInProgress && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Finish up</p>
          {!showForm ? (
            <>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Fill in the completion report to close this job.
              </p>
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                  text-white text-sm font-semibold py-3 rounded-xl transition-all active:scale-[0.99]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Complete this job
              </button>
            </>
          ) : (
            <form onSubmit={completeJob} noValidate className="space-y-4 mt-3">
              {/* Work performed */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Work performed <span className="text-red-400">*</span>
                </label>
                <textarea rows={4} value={form.work_performed}
                  onChange={e => { setForm(p=>({...p,work_performed:e.target.value})); setFormErr(p=>({...p,work_performed:''})); }}
                  placeholder="Describe exactly what was done, parts replaced, issues resolved…"
                  className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm bg-slate-50
                    focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white resize-none transition-all
                    ${formErr.work_performed ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}/>
                {formErr.work_performed && <p className="mt-1 text-xs text-red-500">{formErr.work_performed}</p>}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Notes <span className="text-gray-300 text-xs normal-case font-normal">(optional)</span>
                </label>
                <textarea rows={2} value={form.notes}
                  onChange={e => setForm(p=>({...p,notes:e.target.value}))}
                  placeholder="Follow-up actions, observations, recommendations…"
                  className="block w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm
                    bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white
                    resize-none transition-all"/>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setFormErr({}); }}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200
                    rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={completing}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700
                    text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-all
                    active:scale-[0.99]">
                  {completing
                    ? <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</>
                    : 'Submit & close'
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── COMPLETED summary ── */}
      {isCompleted && (
        <div className="rounded-xl overflow-hidden border border-emerald-100">
          <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            <span className="text-white text-sm font-semibold">Job Complete</span>
          </div>
          <div className="bg-emerald-50 p-4 space-y-3">
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Work performed</p>
              <p className="text-sm text-emerald-900">{job.work_performed}</p>
            </div>
            {job.notes && (
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-emerald-900">{job.notes}</p>
              </div>
            )}
            <div className="flex justify-between text-xs text-emerald-600 pt-1 border-t border-emerald-100">
              <span>Started {fmtTime(job.actual_start_time)}</span>
              <span>Closed {fmtTime(job.completed_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
