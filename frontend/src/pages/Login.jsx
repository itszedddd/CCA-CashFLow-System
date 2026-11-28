import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, LogIn, Sun, Moon, ShieldCheck } from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Login({ onLogin, isDarkMode, setIsDarkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const addToast = useToast();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your Username/LRN and Password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });
      localStorage.setItem('cca_cf_token', res.data.access_token);
      localStorage.setItem('cca_cf_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
      addToast(`Welcome back, ${res.data.user.full_name}!`, 'success');

      const role = (res.data.user.role || '').toLowerCase();
      if (role === 'parent') {
        navigate('/parent');
      } else if (role === 'admin') {
        navigate('/admin/users');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Cannot connect to backend server. Please verify backend is running on port 8000.'
          : 'Invalid credentials. Please verify your Username/LRN and password.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex min-h-screen w-full flex-col font-sans transition-colors duration-500 lg:flex-row ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'
        }`}
    >
      <div className="order-1 flex w-full flex-col items-center justify-center bg-[#022868] px-6 py-6 text-center shadow-xl relative overflow-clip lg:sticky lg:top-0 lg:h-screen lg:w-[46%] lg:px-10 lg:py-6">
        <div className="absolute -top-28 -left-28 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-brand-red/15 blur-3xl pointer-events-none" />

        <div className="max-w-md w-full z-10 flex flex-col items-center">
          <img
            src="/assets/[CCA L1] CCA FlowSys Login.png"
            alt="CCA FlowSys — Calvary Christian Academy"
            className="w-44 sm:w-56 lg:w-64 xl:w-72 h-auto max-h-[38vh] object-contain drop-shadow-2xl mb-3.5"
            onError={(e) => {
              e.target.src = '/assets/[CCA L1] CCA EduSys Logo V1.png';
            }}
          />

          <div className="w-16 h-0.5 bg-brand-red rounded-full mb-3" />

        </div>
      </div>

      <div className="order-2 flex w-full flex-col items-center justify-center bg-slate-100 p-4 relative dark:bg-slate-950 sm:p-6 lg:min-h-screen lg:w-[54%] lg:p-8">
        <button
          onClick={() => setIsDarkMode((p) => !p)}
          className={`absolute top-4 right-4 p-2.5 rounded-2xl transition-all z-10 border cursor-pointer ${isDarkMode
            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shadow-lg'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-md'
            }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </button>

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-5 sm:p-7 shadow-[0_24px_70px_-15px_rgba(2,40,104,0.20)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.70)] transition-colors animate-zoom-in">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 mb-2 font-cinzel">
                <ShieldCheck className="w-3.5 h-3.5" />
                Authorized System Access
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-cinzel tracking-tight mb-0.5">
                System Sign In
              </h1>
            </div>

            {error && (
              <div className="bg-brand-red/10 dark:bg-brand-red/20 border border-brand-red/30 dark:border-brand-red/60 text-brand-red-hover dark:text-red-300 text-xs py-2 px-3 rounded-2xl mb-3 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest px-0.5 font-cinzel block">
                  Staff Email / Student LRN
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username or Student LRN"
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest px-0.5 font-cinzel block">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-900 hover:bg-brand-800 text-white font-bold tracking-widest rounded-xl shadow-md hover:shadow-lg transition font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60 flex justify-center items-center mt-1"
              >
                {loading ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/80 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Parents &amp; Guardians: Please log in using your child&apos;s official{' '}
                <strong className="text-slate-700 dark:text-slate-200">LRN</strong> and the{' '}
                <strong className="text-slate-700 dark:text-slate-200">initial password</strong> issued by the
                School Administrator. You may change your password after signing in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
