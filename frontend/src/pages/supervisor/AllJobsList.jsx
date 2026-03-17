import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jobCardAPI } from '../../services/api';
import { SkeletonTable } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const STATUS = {
  pending:     { pill:'bg-amber-100 text-amber-700',     dot:'bg-amber-400',   label:'Pending'     },
  in_progress: { pill:'bg-blue-100 text-blue-700',       dot:'bg-blue-500',    label:'In Progress' },
  completed:   { pill:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-500', label:'Completed'   },
};
const PRIORITY_COLOR = { high:'text-red-500 font-semibold', medium:'text-amber-500 font-medium', low:'text-gray-400' };
const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';

const AllJobsList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const initialStatus = location.state?.statusFilter || 'all';
  
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState(initialStatus);
  const [pagination, setPag]    = useState(null);
  const [page, setPage]         = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const f = { page, limit:20 };
      if (status !== 'all') f.status = status;
      if (search.trim())    f.search = search.trim();
      const res = await jobCardAPI.getAll(f);
      setJobs(res.data || []);
      setPag(res.pagination);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, status]);

  const TABS = ['all','pending','in_progress','completed'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sup-title text-2xl font-bold text-slate-900">Job Cards</h1>
          {pagination && <p className="text-sm text-gray-400 mt-0.5">{pagination.totalCount} total</p>}
        </div>
        <button onClick={() => navigate('/supervisor/jobs/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600
            text-white text-sm font-semibold rounded-lg transition-all shadow-sm
            hover:shadow-amber-200 hover:shadow-md active:scale-[0.98]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          New Job
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or description…"
            className="block w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-slate-50
              text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"/>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setStatus(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${status === t
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                }`}>
              {t === 'all' ? 'All' : t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? <SkeletonTable rows={6} cols={6}/> : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <EmptyState type={search ? 'search' : 'jobs'} query={search}
            onAction={!search ? () => navigate('/supervisor/jobs/new') : undefined}
            actionLabel="Create Job Card"/>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Job','Customer','Technician','Status','Priority','Payment','Scheduled'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.map(job => {
                  const s = STATUS[job.status] || STATUS.pending;
                  return (
                    <tr key={job.id} onClick={() => navigate(`/supervisor/jobs/${job.id}`)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800 group-hover:text-amber-700 transition-colors leading-snug">
                            {job.title}
                          </p>
                          {job.payment_amount && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                              💰 Due
                            </span>
                          )}
                        </div>
                        {job.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{job.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{job.customer?.name}</td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{job.technician?.name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>
                          {s.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-xs ${PRIORITY_COLOR[job.priority] || PRIORITY_COLOR.medium}`}>
                        {job.priority?.charAt(0).toUpperCase()+job.priority?.slice(1)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-xs">
                        {job.payment_amount ? (
                          <span className="font-medium text-green-600">
                            KES {parseFloat(job.payment_amount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs">{fmt(job.scheduled_date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">Page {pagination.currentPage} of {pagination.totalPages}</p>
              <div className="flex gap-1.5">
                <button disabled={page <= 1} onClick={() => setPage(p => p-1)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200
                    disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p+1)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200
                    disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllJobsList;
