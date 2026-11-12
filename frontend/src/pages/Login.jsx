import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, LogIn,
  Sun, Moon, ShieldCheck, CheckCircle2
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Login({ onLogin, isDarkMode, setIsDarkMode }) {
  const [username, setUsername] = useState('cashier@cca.edu.ph');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const addToast = useToast();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('cca_cf_token', res.data.access_token);
      localStorage.setItem('cca_cf_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
      addToast(`Welcome back, ${res.data.user.full_name}!`, 'success');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail ||
        (err.code === 'ERR_NETWORK' || !err.response
          ? 'Cannot connect to backend server. Please verify backend is running on port 8000.'
          : 'Invalid username or password. Please try again.');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCashierAccount = () => {
    setUsername('cashier@cca.edu.ph');
    setPassword('password123');
    setError('');
  };

  const fillParentAccount = () => {
    setUsername('parent');
    setPassword('password123');
    setError('');
  };

  return (
    <div
      className={`flex flex-col lg:flex-row min-h-screen w-full transition-colors duration-700 font-sans ${
        isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
      }`}
    >
      {/* Left Panel - Thesis Project Hero Branding */}
      <div className="lg:w-[45%] w-full bg-[#022868] flex flex-col items-center justify-center p-8 lg:p-14 min-h-[35vh] lg:min-h-screen relative overflow-hidden text-center order-1">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-red/10 blur-3xl pointer-events-none" />

        <div className="max-w-md w-full z-10 flex flex-col items-center">
          <img
            src="/assets/cca-edusys-logo-v1-transparent.png"
            alt="CCA Logo"
            className="w-48 sm:w-64 h-auto object-contain drop-shadow-xl mb-4"
            onError={(e) => {
              e.target.src = '/cca-logo-white.png';
            }}
          />

          <h2 className="text-xl sm:text-2xl font-bold text-white font-cinzel tracking-wider uppercase mb-1">
            Calvary Christian Academy
          </h2>
          <p className="text-xs uppercase font-cinzel font-semibold text-blue-200 tracking-widest mb-4">
            Cashier CashFlow & AI Anomaly Detection System
          </p>

          <div className="w-16 h-0.5 bg-brand-red rounded-full mb-4"></div>

          <p className="text-xs text-blue-100/80 max-w-sm leading-relaxed hidden sm:block">
            Authorized Cashiering portal adhering to CCA institutional guidelines: automated payment validation,
            ML-based anomaly detection, student brown envelope reconciliation, and official receipt management.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Card */}
      <div className="lg:w-[55%] w-full flex flex-col items-center justify-center p-6 sm:p-12 relative order-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode((p) => !p)}
          className={`absolute top-6 right-6 p-2.5 rounded-2xl backdrop-blur-md transition-all z-10 shadow-sm border ${
            isDarkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'
          }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-colors animate-zoom-in">
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3 font-cinzel">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cashier Authorized Portal
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight mb-2">
                Cashier Sign In
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Enter your cashier credentials to access tuition collection and financial monitoring.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs py-3 px-4 rounded-2xl flex items-center mb-6">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest px-1 font-cinzel">
                  Cashier Username / Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-brand-600 transition-colors">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="cashier@cca.edu.ph or cashier"
                    className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest px-1 font-cinzel">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-brand-600 transition-colors">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-widest rounded-2xl shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] transition-all flex justify-center items-center font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    <span>Access Cashier Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Cashier Account */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-cinzel">
                  Authorized Role Account
                </span>
                <span className="text-[10px] text-slate-400 font-mono">pass: password123</span>
              </div>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={fillCashierAccount}
                  className="w-full py-2.5 px-3.5 border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 rounded-xl text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-cinzel">
                      C
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Maria Santos <span className="font-normal text-[10px] text-emerald-700 dark:text-emerald-400">(Cashier Portal)</span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        cashier@cca.edu.ph
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={fillParentAccount}
                  className="w-full py-2.5 px-3.5 border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 rounded-xl text-left transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-cinzel">
                      P
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        Student Parent Portal <span className="font-normal text-[10px] text-blue-700 dark:text-blue-400">(Parent of Liam Noah Ramos)</span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        user: parent • pass: password123
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
