import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobCardAPI, userAPI, customerAPI } from '../../services/api';
import { SkeletonStatCards } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Logo from '../../components/ui/Logo';

const STATUS = {
  pending:     { pill:'bg-amber-100 text-amber-700',     dot:'bg-amber-400',   label:'Pending'     },
  in_progress: { pill:'bg-blue-100 text-blue-700',       dot:'bg-blue-500',    label:'In Progress' },
  completed:   { pill:'bg-emerald-100 text-emerald-700', dot:'bg-emerald-500', label:'Completed'   },
};

const StatCard = ({ label, value, icon, color, accent, onClick }) => (
  <button onClick={onClick} disabled={!onClick}
    className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left w-full
      transition-all duration-150 group
      ${onClick ? 'hover:shadow-md hover:border-gray-200 cursor-pointer' : 'cursor-default'}`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className={`h-9 w-9 rounded-xl ${color} flex items-center justify-center transition-transform duration-150 ${onClick ? 'group-hover:scale-110' : ''}`}>
        <svg className={`h-4.5 w-4.5 ${accent}`} style={{height:'18px',width:'18px'}}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
        </svg>
      </div>
    </div>
    <p className="sup-title text-3xl font-bold text-slate-900 tabular-nums">
      {value ?? <span className="text-gray-200">—</span>}
    </p>
  </button>
);

const StatsOverview = () => {
  const [jobStats,  setJobStats]  = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [custStats, setCustStats] = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [js, us, cs, rj] = await Promise.all([
          jobCardAPI.getStatistics(),
          userAPI.getStatistics(),
          customerAPI.getStatistics(),
          jobCardAPI.getAll({ limit: 6 }),
        ]);
        setJobStats(js.data?.stats);
        setUserStats(us.data?.stats);
        setCustStats(cs.data?.stats);
        setRecent(rj.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const navigateToJobs = (statusFilter) => {
    navigate('/supervisor/jobs', { state: { statusFilter } });
  };

  const navigateToUsers = (roleFilter) => {
    navigate('/supervisor/users', { state: { roleFilter } });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Logo size="md" />
          <div>
            <h1 className="sup-title text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Overview of all service operations</p>
          </div>
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

      {/* Stat Cards */}
      {loading ? <SkeletonStatCards count={6} /> : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          <StatCard label="Total Jobs"   value={jobStats?.total_jobs}        color="bg-slate-100" accent="text-slate-600" onClick={() => navigateToJobs('all')}      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          <StatCard label="Pending"      value={jobStats?.pending_jobs}      color="bg-amber-50"  accent="text-amber-500" onClick={() => navigateToJobs('pending')}    icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <StatCard label="In Progress"  value={jobStats?.in_progress_jobs}  color="bg-blue-50"   accent="text-blue-500"  onClick={() => navigateToJobs('in_progress')} icon="M13 10V3L4 14h7v7l9-11h-7z"/>
          <StatCard label="Completed"    value={jobStats?.completed_jobs}    color="bg-emerald-50" accent="text-emerald-600" onClick={() => navigateToJobs('completed')} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <StatCard label="Technicians"  value={userStats?.total_technicians} color="bg-purple-50" accent="text-purple-500" onClick={() => navigateToUsers('technician')} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          <StatCard label="Customers"    value={custStats?.total_customers}  color="bg-orange-50" accent="text-orange-500" onClick={() => navigate('/supervisor/customers')} icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
          <h2 className="sup-title text-sm font-bold text-slate-800 uppercase tracking-wide">Recent Jobs</h2>
          <button onClick={() => navigate('/supervisor/jobs')}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors">
            View all →
          </button>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(4)].map((_,i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-48 bg-gray-100 rounded animate-pulse"/>
                  <div className="h-3 w-32 bg-gray-50 rounded animate-pulse"/>
                </div>
                <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse"/>
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState type="jobs" title="No jobs yet"
            description="Create your first job card to get started."
            onAction={() => navigate('/supervisor/jobs/new')} actionLabel="Create Job Card"/>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map(job => {
              const s = STATUS[job.status] || STATUS.pending;
              return (
                <button key={job.id} onClick={() => navigate(`/supervisor/jobs/${job.id}`)}
                  className="w-full flex items-center justify-between px-5 py-3.5
                    hover:bg-amber-50/50 transition-colors text-left group">
                  <div>
                    <p className="text-sm font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {job.customer?.name} · <span className="text-gray-300">{job.technician?.name}</span>
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${s.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsOverview;
