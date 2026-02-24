// src/pages/supervisor/UserDetail.jsx
// User detail page showing user info and job statistics

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userAPI, jobCardAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { SkeletonDetail } from '../../components/ui/Skeleton';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [error, setError] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUserData();
    loadUserJobs();
  }, [id, loadUserData, loadUserJobs]);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userAPI.getById(id);
      setUser(res.data.user);
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUserJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      // Get all jobs for this technician
      const res = await jobCardAPI.getAll({ technician_id: id, limit: 50 });
      setJobs(res.data?.jobCards || res.data || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await userAPI.delete(id);
      toast.success(`${user.name} has been removed from the system`);
      navigate('/supervisor/users');
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error.message || 'Failed to delete user';
      toast.error(errorMessage);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <SkeletonDetail />;

  if (error || !user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium mb-3">{error || 'User not found'}</p>
        <button onClick={() => navigate('/supervisor/users')}
          className="text-sm text-gray-500 underline hover:text-gray-700">
          ← Back to Users
        </button>
      </div>
    );
  }

  // Calculate job statistics
  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    in_progress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };

  const canDelete = jobStats.pending === 0 && jobStats.in_progress === 0;

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '—';

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h1 className="sup-title text-2xl font-bold text-slate-900">{user.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">User Details</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold
          ${user.role === 'supervisor'
            ? 'bg-purple-100 text-purple-800'
            : 'bg-blue-100 text-blue-800'
          }`}>
          {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
        </span>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
          Contact Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Full Name</p>
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Email Address</p>
            <p className="text-sm font-medium text-slate-800">{user.email}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Phone Number</p>
            <p className="text-sm font-medium text-slate-800">{user.phone || '—'}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Member Since</p>
            <p className="text-sm font-medium text-slate-800">{fmtDate(user.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Job Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <svg className="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
            </div>
          </div>
          <p className="sup-title text-3xl font-bold text-slate-900 tabular-nums">
            {jobStats.total}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="sup-title text-3xl font-bold text-slate-900 tabular-nums">
            {jobStats.pending}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
          </div>
          <p className="sup-title text-3xl font-bold text-slate-900 tabular-nums">
            {jobStats.in_progress}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Done</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>
          <p className="sup-title text-3xl font-bold text-slate-900 tabular-nums">
            {jobStats.completed}
          </p>
        </div>
      </div>

      {/* Recent Jobs List */}
      {user.role === 'technician' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <h2 className="sup-title text-sm font-bold text-slate-800 uppercase tracking-wide">
              Assigned Job Cards
            </h2>
            {jobs.length > 0 && (
              <span className="text-xs text-gray-400">{jobs.length} total</span>
            )}
          </div>

          {loadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <p className="text-gray-500 text-sm">No job cards assigned yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.slice(0, 10).map(job => {
                const statusConfig = {
                  pending: { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
                  in_progress: { pill: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
                  completed: { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
                };
                const s = statusConfig[job.status] || statusConfig.pending;

                return (
                  <button
                    key={job.id}
                    onClick={() => navigate(`/supervisor/jobs/${job.id}`)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-50/50 
                      transition-colors text-left group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-amber-700 
                        transition-colors">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {job.customer?.name} · {fmtDate(job.scheduled_date)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full 
                      text-xs font-semibold shrink-0 ml-3 ${s.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}/>
                      {job.status === 'in_progress' ? 'Active' : 
                       job.status === 'completed' ? 'Done' : 'Pending'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {jobs.length > 10 && (
            <div className="px-5 py-3 border-t border-gray-50 text-center">
              <button 
                onClick={() => navigate('/supervisor/jobs', { state: { technician_id: id } })}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                View all {jobs.length} jobs →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete User Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
          Danger Zone
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {canDelete 
            ? 'This user can be permanently removed from the system.'
            : `This user cannot be deleted because they have ${jobStats.pending + jobStats.in_progress} active job card(s).`
          }
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={!canDelete}
          className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200
            rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 
            disabled:cursor-not-allowed disabled:hover:bg-transparent">
          Delete User
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation:'modalIn 0.2s cubic-bezier(0,0,0.2,1)' }}>
            <style>{`@keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="sup-title text-base font-bold text-slate-900">Delete User</h2>
              <button onClick={() => setShowDeleteModal(false)} 
                className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>

              <h3 className="text-center text-lg font-bold text-slate-900 mb-2">
                Remove {user.name}?
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Warning:</span> This action cannot be undone.
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2 mb-5">
                <p><strong>User will be permanently deleted from the system.</strong></p>
                <p className="text-xs text-gray-400">
                  Historical job records will be preserved but will no longer reference this user.
                </p>
              </div>

              <div className="flex gap-2.5">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200
                    rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600
                    text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-all">
                  {deleting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Deleting…
                    </>
                  ) : 'Yes, Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetail;
