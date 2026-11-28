import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Cpu, FileBarChart,
  ClipboardList, Bell, LogOut, X, GraduationCap, UserCog, ShieldCheck, Archive
} from 'lucide-react';

const ROLE_COLORS = {
  Admin: 'bg-brand-900',
  Cashier: 'bg-brand-600',
  Parent: 'bg-brand-500',
  Staff: 'bg-brand-charcoal',
};

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const navigate = useNavigate();

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

  const role = (user?.role || '').toLowerCase();
  const isParent = role === 'parent';
  const isAdmin = role === 'admin';

  const cashierNavItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/income', label: 'Collections', icon: Users, badge: 'Profiles' },
    { to: '/archive', label: 'Archived Students', icon: Archive },
    { to: '/anomaly', label: 'AI Ledger Intelligence', icon: Cpu, isAI: true },
    { to: '/notifications', label: 'Payment Notices', icon: Bell },
    { to: '/reports', label: 'Financial Reports', icon: FileBarChart },
    { to: '/audit-log', label: 'Audit Trail', icon: ClipboardList },
  ];

  const adminNavItems = [
    { to: '/admin/users', label: 'User Accounts', icon: ShieldCheck, badge: 'Admin' },
    { to: '/admin/students', label: 'Student Accounts', icon: UserCog },
  ];

  const parentNavItems = [
    { to: '/parent', label: 'My Child Account', icon: GraduationCap },
    { to: '/notifications', label: 'Fee Announcements', icon: Bell },
  ];

  const navItems = isParent ? parentNavItems : isAdmin ? adminNavItems : cashierNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-col justify-center items-center relative">
        <div className="flex items-center justify-center w-full">
          <img
            src="/assets/[CCA L2.2] CCA FlowSys Nav Light.png"
            alt="CCA FlowSys"
            className="h-10 w-auto max-w-[232px] object-contain dark:hidden"
            onError={(e) => {
              e.target.src = '/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png';
            }}
          />
          <img
            src="/assets/[CCA L2.1] CCA FlowSys Nav Dark.png"
            alt="CCA FlowSys"
            className="h-10 w-auto max-w-[232px] object-contain hidden dark:block"
            onError={(e) => {
              e.target.src = '/assets/[CCA L3.1] CCA EduSys Logo V2 White Transparent.png';
            }}
          />
        </div>

        <button
          onClick={onClose}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors absolute right-2 top-3 cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Primary" className="flex-1 min-h-0 py-3 overflow-y-auto font-cinzel sidebar-scroll">
        <div className="px-4 pb-2 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest">
          {isParent ? 'Parent Services' : isAdmin ? 'Administration' : 'Main Navigation'}
        </div>
        <ul className="space-y-1 px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/' || item.to === '/parent' || item.to === '/archive' || item.to === '/admin/students' || item.to === '/admin/users'}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `w-full flex justify-between items-center px-3 py-2 transition-colors group text-[11px] uppercase tracking-wider font-bold rounded-lg ${
                      isActive
                        ? 'bg-brand-50/90 border-r-4 border-brand-red text-brand-900 dark:bg-slate-900 dark:text-brand-300 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-brand-red-hover'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center flex-1 min-w-0">
                      <Icon
                        className={`w-4 h-4 mr-2.5 flex-shrink-0 transition-colors ${
                          isActive
                            ? 'text-brand-600 dark:text-brand-300'
                            : 'text-slate-400 group-hover:text-brand-600'
                        }`}
                      />
                      <span className="flex-1 text-left leading-tight whitespace-nowrap">
                        {item.label}
                      </span>
                      {item.isAI && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800 ml-1.5 font-sans tracking-normal shrink-0">
                          AI
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ml-1.5 font-sans tracking-normal shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        {!isParent && !isAdmin && (
          <div className="sidebar-secondary mt-6 px-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest mb-2 font-cinzel">
              Institutional Fee Scope
            </p>
            <div className="space-y-1.5 text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Tuition Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                <span>Registration Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Books &amp; Materials</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Energy Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                <span>Other Fees (Tours/Activities)</span>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto p-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
        {user && (
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-700/40 border border-slate-200/70 dark:border-slate-700">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0 ${
                ROLE_COLORS[user.role] || 'bg-brand-600'
              }`}
            >
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                {user.full_name || user.username}
              </p>
              <p className="text-[10px] text-brand-600 dark:text-brand-300 font-bold uppercase tracking-wider truncate">
                {user.role} {user.student_name ? `(${user.student_name})` : ''}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-xl text-slate-500 hover:text-brand-red-hover hover:bg-brand-red/10 dark:hover:bg-brand-red/20 transition-colors text-xs font-semibold group uppercase tracking-wider font-cinzel cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2.5 text-slate-400 group-hover:text-brand-red transition-colors" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 print:hidden">
        {sidebarContent}
      </div>

      <div
        className={`sidebar-backdrop lg:hidden print:hidden ${
          isOpen ? 'sidebar-backdrop-visible' : 'sidebar-backdrop-hidden'
        }`}
        onClick={onClose}
      />
      <div
        className={`sidebar-drawer lg:hidden print:hidden ${
          isOpen ? 'sidebar-drawer-open' : 'sidebar-drawer-closed'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
