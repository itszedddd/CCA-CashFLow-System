import { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, UserCheck, UserX, Users, Shield, Briefcase, Eye
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatPHDateTime } from '../utils/schoolData';

const ROLE_BADGE_STYLES = {
  Admin: 'bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-950/60 dark:text-brand-200 dark:border-brand-800',
  Cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
};

const ROLE_AVATAR_BG = {
  Admin: 'bg-brand-700',
  Cashier: 'bg-emerald-600',
};

export default function AdminUsers({ currentUser }) {
  const addToast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter !== 'All') params.role = roleFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      const res = await api.get('/users/', { params });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalCount = users.length;
  const adminCount = users.filter((u) => (u.role || '').toLowerCase() === 'admin' && u.is_active).length;
  const cashierCount = users.filter((u) => (u.role || '').toLowerCase() === 'cashier' && u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cinzel uppercase">
              User Accounts Directory
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase font-cinzel self-start sm:self-auto">
          <Eye className="w-4 h-4 text-brand-600 dark:text-brand-300" />
          <span>View-Only Access</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">Total Staff Accounts</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">{totalCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-brand-600 dark:text-brand-300 uppercase tracking-wider font-cinzel">Active Admins</p>
          <p className="text-2xl font-extrabold text-brand-700 dark:text-brand-300 font-mono mt-1">{adminCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-cinzel">Active Cashiers</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{cashierCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">Deactivated</p>
          <p className="text-2xl font-extrabold text-slate-600 dark:text-slate-300 font-mono mt-1">{inactiveCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-brand-600 dark:text-brand-300" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-cinzel text-slate-800 dark:text-white">
              Admin Role (View-Only)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Views User Account Information, Student Records, Financial Reports, Cashflow Reports, and Transactions Reports without modifying records.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-cinzel text-slate-800 dark:text-white">
              Cashier Role
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Processes student payments, verifies ORs &amp; brown envelopes, issues payment notices, and prepares School Fee &amp; Collection Reports.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-brand-600 dark:text-brand-300" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-cinzel text-slate-800 dark:text-white">
              Parent / Student Portal
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Logs in via issued DepEd LRN to view student balance, payment history, official receipts, and school fee announcements.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username or full name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
        >
          <option value="All">All Staff Roles</option>
          <option value="Admin">Admin</option>
          <option value="Cashier">Cashier</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div role="region" aria-label="admin users data table 1" className="overflow-x-auto">
          <table className="w-full text-xs"><caption className="sr-only">admin users records table 1</caption>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-cinzel font-bold">
                <th scope="col" className="py-3.5 px-4 text-left">Staff Member</th>
                <th scope="col" className="py-3.5 px-4 text-left">Username / Login Email</th>
                <th scope="col" className="py-3.5 px-4 text-left">Role</th>
                <th scope="col" className="py-3.5 px-4 text-left">Status</th>
                <th scope="col" className="py-3.5 px-4 text-left">Created (PHT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-cinzel">
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No user accounts found matching filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                              ROLE_AVATAR_BG[u.role] || 'bg-slate-600'
                            }`}
                          >
                            {(u.full_name || u.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {u.full_name || u.username}{' '}
                              {isSelf && (
                                <span className="ml-1 text-[10px] font-semibold text-brand-600 dark:text-brand-300">
                                  (You)
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">ID #{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            ROLE_BADGE_STYLES[u.role] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            <UserCheck className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                            <UserX className="w-3 h-3" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {u.created_at ? formatPHDateTime(u.created_at) : 'Seeded'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
