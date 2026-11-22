import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, LogIn,
  Sun, Moon, ShieldCheck, CheckCircle2,
  Link2, UserPlus, GraduationCap, Sparkles
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Login({ onLogin, isDarkMode, setIsDarkMode }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'link' | 'register'
  const [username, setUsername] = useState('cashier@cca.edu.ph');
  const [password, setPassword] = useState('password123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const addToast = useToast();

  // Existing Student Link Form
  const [linkForm, setLinkForm] = useState({
    student_id: '',
    verification_value: '',
    parent_password: 'password123',
  });

  // New Student Registration Form
  const [regForm, setRegForm] = useState({
    full_name: '',
    grade_level: 'Kindergarten',
    section: 'Faith',
    gender: 'Male',
    parent_name: '',
    parent_contact: '',
    parent_email: '',
    address: 'San Jose del Monte, Bulacan',
    parent_password: 'password123',
  });

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
      navigate(res.data.user.role === 'Parent' ? '/parent' : '/');
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

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/link-student', linkForm);
      localStorage.setItem('cca_cf_token', res.data.access_token);
      localStorage.setItem('cca_cf_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
      addToast(res.data.message || 'Account successfully linked!', 'success');
      navigate('/parent');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Account linking failed. Please verify your Student ID and contact details.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register-student', regForm);
      localStorage.setItem('cca_cf_token', res.data.access_token);
      localStorage.setItem('cca_cf_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
      addToast(res.data.message || 'Student enrolled successfully!', 'success');
      navigate('/parent');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Student registration failed. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillCashierAccount = () => {
    setMode('signin');
    setUsername('cashier@cca.edu.ph');
    setPassword('password123');
    setError('');
  };

  const fillParentAccount = () => {
    setMode('signin');
    setUsername('parent');
    setPassword('password123');
    setError('');
  };

  return (
    <div
      className={`flex flex-col lg:flex-row min-h-screen w-full transition-colors duration-700 font-sans ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
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
          className={`absolute top-6 right-6 p-2.5 rounded-2xl backdrop-blur-md transition-all z-10 shadow-sm border ${isDarkMode
            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'
            }`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-colors animate-zoom-in">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] sm:text-[11px] font-bold font-cinzel uppercase tracking-wider transition cursor-pointer ${mode === 'signin'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('link'); setError(''); }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] sm:text-[11px] font-bold font-cinzel uppercase tracking-wider transition cursor-pointer ${mode === 'link'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
              >
                Link Student
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] sm:text-[11px] font-bold font-cinzel uppercase tracking-wider transition cursor-pointer ${mode === 'register'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
              >
                New Student
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs py-2.5 px-3.5 rounded-2xl flex items-center mb-5">
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* MODE 1: SIGN IN */}
            {mode === 'signin' && (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2 font-cinzel">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Authorized Access
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight mb-1">
                    System Sign In
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Sign in as School Cashier, Staff, or verified Student/Parent.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest px-1 font-cinzel">
                      Username / Email / Student ID
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="cashier@cca.edu.ph or LRN-2026-001"
                        className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest px-1 font-cinzel">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPw ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-widest rounded-xl shadow-md transition font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60 flex justify-center items-center"
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

                {/* Quick Demo Cashier Account */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-cinzel">
                      Quick Demo Accounts
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">pass: password123</span>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={fillCashierAccount}
                      className="w-full py-2 px-3 border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70 rounded-xl text-left transition flex items-center justify-between group gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-cinzel shrink-0">
                          C
                        </div>
                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                          Maria Santos <span className="font-normal text-[10px] text-emerald-700 dark:text-emerald-400">(Cashier)</span>
                        </p>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={fillParentAccount}
                      className="w-full py-2 px-3 border border-blue-200 dark:border-blue-800/80 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/70 rounded-xl text-left transition flex items-center justify-between group gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-cinzel shrink-0">
                          P
                        </div>
                        <p className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                          Parent Portal <span className="font-normal text-[10px] text-blue-700 dark:text-blue-400">(Liam Noah Ramos)</span>
                        </p>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* MODE 2: EXISTING STUDENT ACCOUNT LINKING */}
            {mode === 'link' && (
              <>
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-2 font-cinzel">
                    <Link2 className="w-3.5 h-3.5" />
                    Existing Student Account Linking
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight mb-1">
                    Link Existing Student
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Already enrolled or imported via CSV? Link your login using your assigned Student ID / LRN.
                  </p>
                </div>

                <form onSubmit={handleLinkStudent} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                      Student ID / LRN Number
                    </label>
                    <input
                      type="text"
                      required
                      value={linkForm.student_id}
                      onChange={(e) => setLinkForm(p => ({ ...p, student_id: e.target.value }))}
                      placeholder="e.g. LRN-2026-001"
                      className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                      Registered Contact # or Email
                    </label>
                    <input
                      type="text"
                      required
                      value={linkForm.verification_value}
                      onChange={(e) => setLinkForm(p => ({ ...p, verification_value: e.target.value }))}
                      placeholder="e.g. 09171234567 or parent@email.com"
                      className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">Master bypass code: <code>cca2026</code></p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                      Create / Update Password
                    </label>
                    <input
                      type="password"
                      required
                      value={linkForm.parent_password}
                      onChange={(e) => setLinkForm(p => ({ ...p, parent_password: e.target.value }))}
                      placeholder="••••••••"
                      className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold tracking-widest rounded-xl shadow-md transition font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60 flex justify-center items-center mt-2"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : (
                      <>
                        <Link2 className="w-4 h-4 mr-2" />
                        <span>Verify & Link Student Record</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* MODE 3: NEW STUDENT SELF-REGISTRATION */}
            {mode === 'register' && (
              <>
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2 font-cinzel">
                    <UserPlus className="w-3.5 h-3.5" />
                    New Student Profile Enrollment
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight mb-1">
                    Student Registration
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Initializes student profile and automatic financial ledger with all 5 CCA fee schedules.
                  </p>
                </div>

                <form onSubmit={handleRegisterStudent} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                      Student Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.full_name}
                      onChange={(e) => setRegForm(p => ({ ...p, full_name: e.target.value }))}
                      placeholder="e.g. Juan Dela Cruz"
                      className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                        Grade Level
                      </label>
                      <select
                        value={regForm.grade_level}
                        onChange={(e) => setRegForm(p => ({ ...p, grade_level: e.target.value }))}
                        className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none"
                      >
                        {['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                        Section
                      </label>
                      <input
                        type="text"
                        value={regForm.section}
                        onChange={(e) => setRegForm(p => ({ ...p, section: e.target.value }))}
                        placeholder="Faith"
                        className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                      Parent / Guardian Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.parent_name}
                      onChange={(e) => setRegForm(p => ({ ...p, parent_name: e.target.value }))}
                      placeholder="e.g. Pedro Dela Cruz"
                      className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                        Parent Contact
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.parent_contact}
                        onChange={(e) => setRegForm(p => ({ ...p, parent_contact: e.target.value }))}
                        placeholder="09171234567"
                        className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={regForm.parent_password}
                        onChange={(e) => setRegForm(p => ({ ...p, parent_password: e.target.value }))}
                        placeholder="••••••••"
                        className="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-widest rounded-xl shadow-md transition font-cinzel text-xs uppercase cursor-pointer disabled:opacity-60 flex justify-center items-center mt-2"
                  >
                    {loading ? (
                      <span className="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        <span>Enroll & Access Account</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
