import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, Bell, CheckCircle, X, Clock, User } from 'lucide-react';
import api from '../api';
import { formatPeso } from '../utils/schoolData';

export default function Header({
  activeTitle,
  isDarkMode,
  setIsDarkMode,
  isAccessibleMode,
  setIsAccessibleMode,
  onMenuToggle,
  user,
  pendingCount = 0
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState({ incomes: [], students: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [phClock, setPhClock] = useState(() => new Date());
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const isParent = (user?.role || '').toLowerCase() === 'parent';

  // Real-time Philippine Standard Time (Asia/Manila) clock synced across system
  useEffect(() => {
    const timer = setInterval(() => {
      setPhClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const phDateStr = phClock.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const phTimeStr = phClock.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search (Incomes & Students only)
  useEffect(() => {
    if (isParent || !searchQuery.trim()) {
      setSearchResults({ incomes: [], students: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/dashboard/search', { params: { q: searchQuery.trim() } });
        setSearchResults({
          incomes: res.data.incomes || [],
          students: res.data.students || [],
        });
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isParent]);

  const handleSelectIncome = (inc) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (inc.student_id_ref) {
      navigate(`/collections/${inc.student_id_ref}`);
    } else {
      navigate('/income');
    }
  };

  const handleSelectStudent = (st) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/collections/${st.id}`);
  };

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 z-30 print:hidden transition-colors duration-300 shadow-xs">
      {/* Left: Mobile hamburger, Page Title & SY badge */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1 mr-2">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-1 text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 dark:text-white truncate font-cinzel tracking-tight">
            {activeTitle}
          </h1>
          {/* Live compact clock on mobile screens */}
          <p className="md:hidden text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {phDateStr} • {phTimeStr} PHT
          </p>
        </div>

        <div className="hidden xl:flex items-center shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-100 dark:border-brand-800 whitespace-nowrap">
            SY 2026-2027
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        {/* Live Philippine Standard Time Date & Time Display (Desktop / Tablet) */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs shrink-0"
          title="Official Philippine Standard Time (Asia/Manila)"
        >
          <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold whitespace-nowrap">
            <span>{phDateStr}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-brand-700 dark:text-brand-300 font-bold">{phTimeStr}</span>
            <span className="text-[9px] uppercase font-sans font-bold px-1 py-0.2 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300">
              PHT
            </span>
          </div>
        </div>

        {/* Search Bar for Staff/Cashier/Admin */}
        {!isParent && (
          <div className="relative hidden lg:block" ref={searchRef}>
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Search student, LRN, OR#..."
              className="w-44 xl:w-56 pl-9 pr-8 py-1.5 border border-slate-200 dark:border-slate-600 rounded-full text-xs bg-slate-50 dark:bg-slate-700/60 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Search Dropdown Modal */}
            {showSearchResults && searchQuery.trim().length > 0 && (
              <div className="absolute top-11 right-0 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/70 flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-cinzel">
                    Search Results
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {searchResults.students.length + searchResults.incomes.length} matches
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-slate-400">Searching records...</div>
                  ) : searchResults.students.length === 0 && searchResults.incomes.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No students or collection records matching &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    <>
                      {searchResults.students.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                            Student Profiles
                          </div>
                          {searchResults.students.map((st) => (
                            <div
                              key={`st-${st.id}`}
                              onClick={() => handleSelectStudent(st)}
                              className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="min-w-0 pr-2 flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-800 dark:text-white truncate">{st.full_name}</p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                                    {st.student_id} • {st.grade_level} ({st.section})
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchResults.incomes.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Collection Receipts
                          </div>
                          {searchResults.incomes.map((inc) => (
                            <div
                              key={`inc-${inc.id}`}
                              onClick={() => handleSelectIncome(inc)}
                              className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between text-xs transition"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-semibold text-slate-800 dark:text-white truncate">
                                  {inc.description}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {inc.or_number ? `OR #${inc.or_number}` : 'Recorded'} • {inc.payer_name || 'Student'}
                                </p>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 font-mono">
                                +{formatPeso(inc.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode((p) => !p)}
          className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Accessibility Mode Toggle */}
        <button
          onClick={() => setIsAccessibleMode((p) => !p)}
          className={`p-2 transition-colors focus:outline-none rounded-xl font-bold text-xs cursor-pointer ${
            isAccessibleMode
              ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800'
              : 'text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
          title="Toggle High Contrast & Larger Text"
          aria-label="Toggle accessibility"
        >
          A+
        </button>

        {/* Payment Announcements Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((p) => !p)}
            className="relative p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
            title="Payment Announcements"
            aria-label="View payment announcements"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-600 border border-white dark:border-slate-800" />
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/70 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider font-cinzel">
                  Fee Announcements
                </h3>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold">
                    {pendingCount} Active
                  </span>
                )}
              </div>

              <div className="p-3">
                {pendingCount > 0 ? (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                    className="p-3 bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200/70 dark:border-brand-800/40 rounded-xl cursor-pointer hover:bg-brand-100/50 transition"
                  >
                    <p className="text-xs font-bold text-brand-900 dark:text-brand-200">
                      School Fee &amp; Event Announcements
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                      {pendingCount} active school event/fee announcement(s) posted.
                    </p>
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-2 inline-block">
                      View Announcements →
                    </span>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    No active payment announcements at this time.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Avatar and Parent LRN Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
            {user.role === 'Parent' && (user.student_lrn || user.username) && (
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-[10px] font-mono font-bold border border-amber-300 dark:border-amber-700">
                LRN: {user.student_lrn || user.username}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
