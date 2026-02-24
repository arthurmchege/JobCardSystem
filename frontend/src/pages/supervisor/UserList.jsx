// src/pages/supervisor/UserList.jsx - WITH DELETE FUNCTIONALITY

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { userAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const UserList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const initialRole = location.state?.roleFilter || 'all';
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRole] = useState(initialRole);
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userAPI.getAll({ limit: 100 });
      setUsers(res.data?.users || res.data || []);
    } catch (error) {
      setError('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      await userAPI.delete(userToDelete.id);
      toast.success(`${userToDelete.name} has been removed from the system`);
      closeDeleteModal();
      loadUsers(); // Reload the list
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : error.message || 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="sup-title text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-gray-400 mt-0.5">{users.length} registered users</p>
      </div>

      {/* Role filter */}
      <div className="flex gap-1 mb-4">
        {['all','technician','supervisor'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${roleFilter === r
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
            {r === 'all' ? 'All' : r.charAt(0).toUpperCase()+r.slice(1)+'s'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <svg className="h-7 w-7 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-500">No {roleFilter !== 'all' ? roleFilter+'s' : 'users'} found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Name','Email','Role','Phone','Joined','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50/80">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-amber-50/30 transition-colors group">
                  <td className="px-4 py-3.5">
                    <button 
                      onClick={() => navigate(`/supervisor/users/${u.id}`)}
                      className="flex items-center gap-2.5 text-left w-full group/name">
                      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-500">
                          {u.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800 group-hover/name:text-amber-600 
                        group-hover/name:underline transition-colors">
                        {u.name}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
                      ${u.role === 'supervisor'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                      }`}>
                      {u.role?.charAt(0).toUpperCase()+u.role?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <button 
                      onClick={() => openDeleteModal(u)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50
                        rounded-md hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {showDeleteModal && userToDelete && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            style={{ animation:'modalIn 0.2s cubic-bezier(0,0,0.2,1)' }}>
            <style>{`@keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="sup-title text-base font-bold text-slate-900">
                Delete User
              </h2>
              <button onClick={closeDeleteModal} className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5">
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>

              <h3 className="text-center text-lg font-bold text-slate-900 mb-2">
                Remove {userToDelete.name}?
              </h3>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">⚠️ Warning:</span> This action cannot be undone.
                </p>
              </div>

              <div className="text-sm text-gray-600 space-y-2 mb-5">
                <p><strong>User Details:</strong></p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Name: {userToDelete.name}</li>
                  <li>Email: {userToDelete.email}</li>
                  <li>Role: {userToDelete.role}</li>
                </ul>
                <p className="text-xs text-gray-400 mt-3">
                  Note: This user will be removed from the system. 
                  Make sure there are no active jobs assigned to them.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5">
                <button 
                  type="button" 
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200
                    rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600
                    text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-60 transition-all
                    active:scale-[0.99]">
                  {deleting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Deleting…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Yes, Delete User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
