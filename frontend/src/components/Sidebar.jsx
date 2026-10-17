import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, TrendingDown,
  Wallet, FileBarChart, ClipboardList, LogOut, X
} from 'lucide-react';

const ROLE_COLORS = {
  Admin: 'bg-brand-600',
  Principal: 'bg-purple-600',
  Accountant: 'bg-indigo-600',
  Cashier: 'bg-emerald-600',
  Staff: 'bg-slate-600',
};

export default function Sidebar({ user, onLogout, isOpen, onClose, pendingCount = 0 }) {
  const navigate = useNavigate();

  // Lock body scroll on mobile drawer open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    onClose?.();
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/income', label: 'Income Records', icon: TrendingUp },
    { to: '/expenses', label: 'Expenses', icon: TrendingDown, hasBadge: true },
    { to: '/budget', label: 'Budget Allocations', icon: Wallet },
    { to: '/reports', label: 'Financial Reports', icon: FileBarChart },
    { to: '/audit-log', label: 'Audit Trail', icon: ClipboardList },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-colors duration-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center relative">
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 flex flex-col items-center">
            <img
              src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
              alt="CCA EduSys"
              className="h-16 w-auto object-contain dark:hidden py-1"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <img
              src="/assets/[CCA L3.1] CCA EduSys Logo V2 White Transparent.png"
              alt="CCA EduSys"
              className="h-16 w-auto object-contain hidden dark:block py-1"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] uppercase font-cinzel font-bold text-brand-600 dark:text-brand-400 tracking-widest">
                CashFlow System
              </span>
            </div>
          </div>

          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors absolute right-2 top-3"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto font-cinzel sidebar-scroll">
        <div className="px-4 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Main Navigation
        </div>
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `w-full flex justify-between items-center px-3 py-2.5 transition-colors group text-xs uppercase tracking-widest font-bold rounded-lg ${
                      isActive
                        ? 'bg-brand-50/80 border-r-4 border-brand-red text-brand-900 dark:bg-slate-900 dark:text-brand-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-brand-red-hover'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center flex-1 min-w-0">
                        <Icon
                          className={`w-4 h-4 mr-3 flex-shrink-0 transition-colors ${
                            isActive
                              ? 'text-brand-600 dark:text-brand-400'
                              : 'text-slate-400 group-hover:text-brand-600'
                          }`}
                        />
                        <span className="flex-1 text-left leading-tight break-words truncate">
                          {item.label}
                        </span>
                      </div>

                      {item.hasBadge && pendingCount > 0 && (
                        <span className="relative flex h-2.5 w-2.5 ml-2 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Info & Logout — Pinned to bottom */}
      <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
        {user && (
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700/60">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0 ${
                ROLE_COLORS[user.role] || 'bg-brand-600'
              }`}
            >
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider truncate">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-semibold group uppercase tracking-wider font-cinzel"
        >
          <LogOut className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0 h-full print:hidden">
        {sidebarContent}
      </div>

      {/* Mobile backdrop + drawer */}
      <div
        className={`sidebar-backdrop md:hidden print:hidden ${
          isOpen ? 'sidebar-backdrop-visible' : 'sidebar-backdrop-hidden'
        }`}
        onClick={onClose}
      />
      <div
        className={`sidebar-drawer md:hidden print:hidden ${
          isOpen ? 'sidebar-drawer-open' : 'sidebar-drawer-closed'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
