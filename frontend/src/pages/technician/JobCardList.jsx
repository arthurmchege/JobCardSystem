import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobCardAPI } from '../../services/api';
import { SkeletonJobList } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const STATUS = {
  pending:     { label:'Pending',     pill:'bg-amber-100 text-amber-700',   dot:'bg-amber-400' },
  in_progress: { label:'In Progress', pill:'bg-blue-100 text-blue-700',     dot:'bg-blue-500'  },
  completed:   { label:'Completed',   pill:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-500' },
};
const PRIORITY = {
  high:   'text-red-500 font-semibold',
  medium: 'text-amber-500 font-medium',
  low:    'text-gray-400',
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—';

// TABS REORDERED: Pending, Active, Done, All
const TABS = [
  { key:'pending', label:'Pending' },
  { key:'in_progress', label:'Active' },
  { key:'completed', label:'Done' },
  { key:'all', label:'All' },
];

const JobCardList = () => {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('pending'); // Default to pending
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await jobCardAPI.getAll();
        setJobs(res.data?.jobCards || res.data || []);
      } catch (e) {
        setError(typeof e === 'string' ? e : 'Failed to load jobs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = {
    all: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };
  const filtered = tab === 'all' ? jobs : jobs.filter(j => j.status === tab);

  if (loading) return (
    <div>
      <div className="mb-5">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1"/>
        <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse"/>
      </div>
      {/* Tab skeleton */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        {[...Array(4)].map((_,i) => <div key={i} className="flex-1 h-8 bg-gray-100 rounded-lg animate-pulse"/>)}
      </div>
      <SkeletonJobList count={4} />
    </div>
  );

  if (error) return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center">
      <p className="text-red-600 font-medium text-sm mb-3">{error}</p>
      <button onClick={() => window.location.reload()}
        className="px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-100">
        Retry
      </button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="tech-title text-xl font-bold text-slate-900">My Jobs</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg
              text-xs font-semibold transition-all duration-150
              ${tab === t.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}>
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none
                ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState type={tab === 'completed' ? 'completed' : 'jobs'}
            title={tab === 'all' ? 'No jobs assigned yet' : `No ${TABS.find(t=>t.key===tab)?.label.toLowerCase()} jobs`}
            description={tab === 'all' ? 'Your supervisor will assign jobs to you.' : undefined}
          />
        </div>
      )}

      {/* List */}
      <div className="space-y-2.5">
        {filtered.map((job, idx) => {
          const s = STATUS[job.status] || STATUS.pending;
          return (
            <button key={job.id} onClick={() => navigate(`/technician/${job.id}`)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm
                hover:border-amber-200 hover:shadow-md transition-all duration-150 p-4 group"
              style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Status + priority */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>
                      {s.label}
                    </span>
                    <span className={`text-xs ${PRIORITY[job.priority] || PRIORITY.medium}`}>
                      {job.priority === 'high' ? '↑ High' : job.priority === 'low' ? '↓ Low' : '— Med'}
                    </span>
                  </div>
                  {/* Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate leading-snug
                      group-hover:text-amber-700 transition-colors">
                      {job.title}
                    </h3>
                    {job.payment_amount && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 shrink-0">
                        💰 Due
                      </span>
                    )}
                  </div>
                  {/* Customer */}
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {job.customer?.name}
                    {job.customer?.address && <span className="text-gray-300"> · {job.customer.address}</span>}
                  </p>
                  {/* Payment Amount */}
                  {job.payment_amount && (
                    <p className="text-xs font-semibold text-green-600 mt-1">
                      KES {parseFloat(job.payment_amount).toLocaleString()}
                    </p>
                  )}
                </div>
                {/* Right */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-gray-300">{fmtDate(job.scheduled_date)}</span>
                  <svg className="h-4 w-4 text-gray-200 group-hover:text-amber-400 transition-colors"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
              {/* Description preview */}
              {job.description && (
                <p className="text-xs text-gray-300 mt-2 line-clamp-1 leading-relaxed">
                  {job.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default JobCardList;
