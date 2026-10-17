import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Search, Sun, Moon, Bell, CheckCircle,
  X, TrendingUp, TrendingDown, Clock, Shield
} from 'lucide-react';
import api from '../api';

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
  const [searchResults, setSearchResults] = useState({ incomes: [], expenses: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Close search/notif dropdowns when clicking outside
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

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ incomes: [], expenses: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/dashboard/search', { params: { q: searchQuery.trim() } });
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectIncome = (inc) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate('/income');
  };

  const handleSelectExpense = (exp) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate('/expenses');
  };

  const formatPeso = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 h-16 flex items-center justify-between px-4 md:px-8 z-30 print:hidden transition-colors duration-300">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-1 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate font-cinzel tracking-tight">
            {activeTitle}
          </h1>
        </div>

        <div className="hidden lg:flex items-center ml-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-100 dark:border-brand-800">
            SY 2026-2027
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Search Bar with live preview */}
        <div className="relative hidden sm:block" ref={searchRef}>
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
            placeholder="Search records, OR#, payee..."
            className="w-44 lg:w-64 pl-9 pr-8 py-1.5 border border-slate-200 dark:border-slate-600 rounded-full text-xs md:text-sm bg-slate-50 dark:bg-slate-700/60 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
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
            <div className="absolute top-11 right-0 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/70 flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-cinzel">
                  Search Results
                </span>
                <span className="text-[10px] text-slate-400">
                  {searchResults.incomes.length + searchResults.expenses.length} matches
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-slate-400">Searching records...</div>
                ) : searchResults.incomes.length === 0 && searchResults.expenses.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No transactions matching "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {/* Incomes */}
                    {searchResults.incomes.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Income Records
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
                                {inc.or_number ? `OR #${inc.or_number}` : 'No OR'} • {inc.payer_name || 'Anonymous'}
                              </p>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                              +{formatPeso(inc.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expenses */}
                    {searchResults.expenses.length > 0 && (
                      <div className="p-2">
                        <div className="px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          Expense Records
                        </div>
                        {searchResults.expenses.map((exp) => (
                          <div
                            key={`exp-${exp.id}`}
                            onClick={() => handleSelectExpense(exp)}
                            className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-800 dark:text-white truncate">
                                {exp.description}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {exp.voucher_number ? `Voucher #${exp.voucher_number}` : 'Voucher'} • {exp.payee || 'Payee'}
                              </p>
                            </div>
                            <span className="font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                              -{formatPeso(exp.amount)}
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

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setIsDarkMode((p) => !p)}
          className="p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Accessibility Mode Toggle */}
        <button
          onClick={() => setIsAccessibleMode((p) => !p)}
          className={`p-2 transition-colors focus:outline-none rounded-xl font-bold text-xs ${
            isAccessibleMode
              ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-800'
              : 'text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
          title="Toggle High Contrast & Larger Text"
          aria-label="Toggle accessibility"
        >
          A+
        </button>

        {/* Notifications (Pending Approvals) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((p) => !p)}
            className="relative p-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-white transition-colors focus:outline-none rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white dark:border-slate-800"></span>
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/70 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider font-cinzel">
                  System Notifications
                </h3>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {pendingCount} Pending
                  </span>
                )}
              </div>

              <div className="p-3">
                {pendingCount > 0 ? (
                  <div
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/expenses');
                    }}
                    className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl cursor-pointer hover:bg-amber-100/50 transition"
                  >
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Disbursement Approvals Required
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                      There are {pendingCount} expense voucher(s) awaiting review and principal/admin approval.
                    </p>
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-2 inline-block">
                      Review Expense Vouchers →
                    </span>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    All expense vouchers and cashflow actions are up to date!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Avatar */}
        {user && (
          <div className="hidden sm:flex items-center pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
