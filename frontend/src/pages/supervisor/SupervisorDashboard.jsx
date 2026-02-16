import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import StatsOverview       from './StatsOverview';
import AllJobsList         from './AllJobsList';
import CreateJobCard       from './CreateJobCard';
import SupervisorJobDetail from './SupervisorJobDetail';
import CustomerList        from './CustomerList';
import UserList            from './UserList';
import UserDetail          from './UserDetail';

const NAV = [
  { to:'/supervisor',           end:true, label:'Dashboard',  icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to:'/supervisor/jobs',       label:'Job Cards',  icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { to:'/supervisor/customers',  label:'Customers',  icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { to:'/supervisor/users',      label:'Users',      icon:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
];

const SupervisorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine if we should show back button (not on main pages)
  const isSubPage = 
    location.pathname.includes('/jobs/new') || 
    location.pathname.match(/\/jobs\/\d+/) ||
    location.pathname.match(/\/users\/\d+/) ||
    (location.pathname.includes('/jobs') && location.pathname !== '/supervisor/jobs') ||
    (location.pathname.includes('/users') && location.pathname !== '/supervisor/users');

  const handleBack = () => navigate(-1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .sup-root  { font-family: 'DM Sans', system-ui, sans-serif; }
        .sup-title { font-family: 'Syne', system-ui, sans-serif; }
      `}</style>

      <div className="sup-root min-h-screen flex bg-gray-50">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 bg-slate-900 flex flex-col sticky top-0 h-screen overflow-hidden">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" className="bg-white rounded-md p-1" />
              <div>
                <p className="sup-title text-white font-bold text-[11px] tracking-widest leading-none">COPY CAT</p>
                <p className="text-slate-500 text-[10px] mt-0.5 tracking-wide">Job Cards</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
                   ${isActive
                     ? 'bg-amber-500 text-white font-semibold'
                     : 'text-slate-400 hover:text-white hover:bg-slate-800 font-medium'
                   }`
                }>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon}/>
                </svg>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User + logout */}
          <div className="px-3 pb-4 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-amber-400">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium
                text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 min-w-0 p-6 overflow-auto">
          {/* Back button for sub-pages */}
          {isSubPage && (
            <button onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm text-gray-500
                hover:text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          )}
          
          <Routes>
            <Route index             element={<StatsOverview />} />
            <Route path="jobs"       element={<AllJobsList />} />
            <Route path="jobs/new"   element={<CreateJobCard />} />
            <Route path="jobs/:id"   element={<SupervisorJobDetail />} />
            <Route path="customers"  element={<CustomerList />} />
            <Route path="users"      element={<UserList />} />
            <Route path="users/:id"  element={<UserDetail />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

export default SupervisorDashboard;
