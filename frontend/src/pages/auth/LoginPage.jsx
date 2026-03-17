import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import Logo from '../../components/ui/Logo';

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailErr, setEmailErr] = useState('');
  const [pwdErr, setPwdErr]     = useState('');

  const { login }    = useAuth();
  const navigate     = useNavigate();
  const { toast }    = useToast();

  const validate = () => {
    let ok = true;
    setEmailErr(''); setPwdErr('');
    if (!email.trim())                               { setEmailErr('Email is required'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Enter a valid email'); ok = false; }
    if (!password)                                   { setPwdErr('Password is required'); ok = false; }
    else if (password.length < 6)                    { setPwdErr('At least 6 characters'); ok = false; }
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await login(email, password);
    console.log(result)
    if (result.success) {
      toast.success(`Welcome back, ${result.user.name.split(' ')[0]}!`);
      navigate(result.user.role === 'supervisor' ? '/supervisor' : '/technician');
    } else {
      toast.error(result.error || 'Invalid email or password');
    }
    setLoading(false);
  };

  const field = (err) =>
    `block w-full rounded-lg border bg-slate-50 px-3.5 py-2.5 text-sm text-gray-900
     placeholder-gray-400 transition-all duration-150
     focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent
     ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        .auth-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .auth-title { font-family: 'Syne', system-ui, sans-serif; }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(16px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.5s cubic-bezier(0,0,0.2,1) both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.1s; }
        .fade-up-3 { animation-delay: 0.15s; }
      `}</style>

      <div className="auth-root min-h-screen flex bg-gray-50">

        {/* ── Left panel – Job Card System branding ── */}
        <div className="hidden lg:flex lg:w-[42%] bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
          {/* Geometric accent */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #F59E0B, transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #F59E0B, transparent)', transform: 'translate(-30%, 30%)' }} />

          {/* Job Card System Logo */}
          <div className="flex flex-col items-start gap-4">
            <Logo size="lg" className="bg-white rounded-lg p-2" />
            <div>
              <p className="auth-title text-white font-bold text-2xl tracking-wide leading-none">JOB CARD SYSTEM</p>
              <p className="text-amber-400 text-sm font-semibold mt-1"></p>
            </div>
          </div>

          {/* Job Card System Info */}
          <div>
            <h1 className="auth-title text-white text-4xl font-bold leading-tight mb-4">
              JOB CARD<br/>
              <span className="text-amber-400">MANAGEMENT SYSTEM</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mb-6">
              Streamline your field service operations with our comprehensive job tracking solution. 
              Built for photocopier installation, maintenance, and repair teams.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Real-Time Job Tracking</p>
                  <p className="text-slate-500 text-xs mt-0.5">Monitor all field operations from assignment to completion</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Digital Signatures</p>
                  <p className="text-slate-500 text-xs mt-0.5">Capture customer sign-off directly from mobile devices</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Role-Based Dashboards</p>
                  <p className="text-slate-500 text-xs mt-0.5">Tailored interfaces for technicians and supervisors</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>© 2026 Job Card System</span>
            <span>Nairobi, Kenya</span>
          </div>
        </div>

        {/* ── Right panel – form ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex flex-col items-center gap-3 mb-8 lg:hidden">
              <Logo size="md" className="bg-white rounded-lg p-2 shadow-sm" />
              <div className="text-center">
                <p className="auth-title text-slate-800 font-bold text-base">JOB CARD SYSTEM</p>
                <p className="text-slate-500 text-xs mt-0.5">Job Card System</p>
              </div>
            </div>

            <div className="fade-up">
              <h2 className="auth-title text-2xl font-bold text-slate-900 mb-1">SIGN IN</h2>
              <p className="text-sm text-gray-400 mb-8">Enter your credentials to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div className="fade-up fade-up-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input type="email" autoComplete="email" value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                  placeholder="you@example.com" className={field(emailErr)} />
                {emailErr && <p className="mt-1 text-xs text-red-500">{emailErr}</p>}
              </div>

              {/* Password */}
              <div className="fade-up fade-up-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                    value={password} onChange={e => { setPassword(e.target.value); setPwdErr(''); }}
                    placeholder="••••••••" className={`${field(pwdErr)} pr-10`} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    {showPwd
                      ? <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
                {pwdErr && <p className="mt-1 text-xs text-red-500">{pwdErr}</p>}
              </div>

              {/* Submit */}
              <div className="fade-up fade-up-3 pt-1">
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600
                    text-white text-sm font-semibold py-3 rounded-lg transition-all duration-150
                    disabled:opacity-60 disabled:cursor-not-allowed shadow-sm
                    hover:shadow-amber-200 hover:shadow-md active:scale-[0.99]">
                  {loading
                    ? <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Signing in…</>
                    : 'Sign in →'
                  }
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-amber-600 font-semibold hover:text-amber-700">Register</Link>
            </p>

          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
