import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, LogIn,
  Sun, Moon, ShieldCheck, CheckCircle2
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Login({ onLogin, isDarkMode, setIsDarkMode }) {
  const [username, setUsername] = useState('admin@cca.edu.ph');
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
      const msg = err.response?.data?.detail || 'Invalid username or password. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (email) => {
    setUsername(email);
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
            School CashFlow Management System
          </p>

          <div className="w-16 h-0.5 bg-brand-red rounded-full mb-4"></div>

          <p className="text-xs text-blue-100/80 max-w-sm leading-relaxed hidden sm:block">
            Comprehensive financial stewardship, real-time revenue and expenditure tracking,
            budget allocation controls, and executive cashflow analytics.
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
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight mb-2">
                Sign In
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
                Enter your authorized credentials to access financial operations.
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
                  Username / Email
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
                    placeholder="admin@cca.edu.ph"
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
                className="w-full relative py-3.5 bg-[#022868] hover:bg-[#011a45] text-white font-bold tracking-widest rounded-2xl shadow-[0_10px_20px_-5px_rgba(2,40,104,0.4)] transition-all flex justify-center items-center font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Role Accounts */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-cinzel">
                  Quick Demo Accounts
                </span>
                <span className="text-[10px] text-slate-400">pass: password123</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Admin', email: 'admin@cca.edu.ph', color: 'border-blue-200 hover:bg-blue-50 dark:border-blue-900/60 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
                  { role: 'Cashier', email: 'cashier@cca.edu.ph', color: 'border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                  { role: 'Accountant', email: 'accountant@cca.edu.ph', color: 'border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/60 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
                  { role: 'Principal', email: 'principal@cca.edu.ph', color: 'border-purple-200 hover:bg-purple-50 dark:border-purple-900/60 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setDemoAccount(item.email)}
                    className={`py-2 px-3 border rounded-xl text-left text-xs font-semibold transition flex items-center justify-between ${item.color} ${
                      username === item.email ? 'ring-2 ring-brand-500 font-bold' : ''
                    }`}
                  >
                    <span>{item.role}</span>
                    {username === item.email && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
