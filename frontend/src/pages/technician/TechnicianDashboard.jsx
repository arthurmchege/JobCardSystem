import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/ui/Logo';
import JobCardList from './JobCardList';
import JobDetail from './JobDetail';

const TechnicianDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDetail = /\/technician\/.+/.test(location.pathname);

  const handleLogout = () => { logout(); navigate('/login'); };
  const handleBack = () => navigate(-1);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .tech-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .tech-title { font-family: 'Syne', system-ui, sans-serif; }
      `}</style>

      <div className="tech-root min-h-screen bg-gray-50">
        {/* ── Top nav ── */}
        <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-3">
              {isDetail ? (
                <button onClick={handleBack}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                  </svg>
                  <span className="text-sm">Back</span>
                </button>
              ) : (
                <Link to="/technician" className="flex items-center gap-2.5">
                  <Logo size="sm" className="bg-white rounded-md p-1" />
                  <div>
                    <p className="tech-title text-white text-xs font-bold tracking-wide leading-none">MY JOBS</p>
                    <p className="text-slate-500 text-[10px]">Job Card System</p>
                  </div>
                </Link>
              )}
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{user?.name}</span>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                  text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* ── Page ── */}
        <main className="max-w-2xl mx-auto px-4 py-5">
          <Routes>
            <Route index element={<JobCardList />} />
            <Route path=":id" element={<JobDetail />} />
          </Routes>
        </main>
      </div>
    </>
  );
};

export default TechnicianDashboard;
