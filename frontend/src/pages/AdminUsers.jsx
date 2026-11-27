import { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, Plus, KeyRound, Edit2, UserCheck,
  UserX, Eye, EyeOff, Trash2, Users, Shield, Briefcase
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatPHDateTime } from '../utils/schoolData';

const ROLE_BADGE_STYLES = {
  Admin: 'bg-brand-50 text-brand-800 border-brand-200 dark:bg-brand-950/60 dark:text-brand-200 dark:border-brand-800',
  Cashier: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  Principal: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
};

const ROLE_AVATAR_BG = {
  Admin: 'bg-brand-700',
  Cashier: 'bg-emerald-600',
  Principal: 'bg-indigo-600',
};

export default function AdminUsers({ currentUser }) {
  const addToast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Create / Edit User Modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [formState, setFormState] = useState({
    username: '',
    full_name: '',
    role: 'Admin',
    password: '',
    is_active: 1,
  });

  // Reset Password Modal
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const openCreateModal = () => {
    setEditingUser(null);
    setShowPw(false);
    setFormState({
      username: '',
      full_name: '',
      role: 'Admin',
      password: '',
      is_active: 1,
    });
    setShowUserModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setShowPw(false);
    setFormState({
      username: u.username || '',
      full_name: u.full_name || '',
      role: u.role || 'Cashier',
      password: '',
      is_active: u.is_active ? 1 : 0,
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const cleanUsername = formState.username.trim();
    const cleanName = formState.full_name.trim();

    if (!cleanUsername || !cleanName) {
      addToast('Username and Full Name are required.', 'error');
      return;
    }
    if (!editingUser && formState.password.trim().length < 6) {
      addToast('Initial password must be at least 6 characters long.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          username: cleanUsername,
          full_name: cleanName,
          role: formState.role,
          is_active: formState.is_active,
        });
        addToast(`Updated account for ${cleanName}`, 'success');
      } else {
        await api.post('/users/', {
          username: cleanUsername,
          full_name: cleanName,
          role: formState.role,
          password: formState.password.trim(),
          is_active: formState.is_active,
        });
        addToast(`Created ${formState.role} account: ${cleanUsername}`, 'success');
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save user account', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u) => {
    const nextState = u.is_active ? 0 : 1;
    try {
      await api.put(`/users/${u.id}`, { is_active: nextState });
      addToast(
        `${u.full_name || u.username} has been ${nextState ? 'activated' : 'deactivated'}.`,
        'success'
      );
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Unable to change account status', 'error');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete unused account "${u.username}" (${u.full_name})?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      addToast(`Deleted user account ${u.username}`, 'success');
      fetchUsers();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not delete account', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (newPassword.trim().length < 6) {
      addToast('New password must be at least 6 characters long.', 'error');
      return;
    }
    setResetting(true);
    try {
      await api.post(`/users/${resetTarget.id}/reset-password`, {
        new_password: newPassword.trim(),
      });
      addToast(`Password reset for ${resetTarget.username}`, 'success');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reset password', 'error');
    } finally {
      setResetting(false);
    }
  };

  const totalCount = users.length;
  const adminCount = users.filter((u) => (u.role || '').toLowerCase() === 'admin' && u.is_active).length;
  const cashierCount = users.filter((u) => (u.role || '').toLowerCase() === 'cashier' && u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cinzel uppercase">
              Admin User Account Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create and manage School Administrator, Cashier, and Principal accounts, role permissions, and credentials.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel shadow-md flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Admin / Staff Account</span>
        </button>
      </div>

      {/* Summary Cards */}
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

      {/* Role Scope Matrix (Matches System Context Diagram) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-cinzel text-slate-800 dark:text-white">
              Admin Role
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Manages <strong>User Account Information</strong> and <strong>Student Record Management</strong>; accesses Financial, Cashflow, and Transactions Reports.
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
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider font-cinzel text-slate-800 dark:text-white">
              Parent / Student Portal
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Logs in via issued DepEd LRN to view student balance, payment history, official receipts, and school fee announcements.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username or full name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
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
          <option value="Principal">Principal</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-cinzel font-bold">
                <th className="py-3.5 px-4 text-left">Staff Member</th>
                <th className="py-3.5 px-4 text-left">Username / Login Email</th>
                <th className="py-3.5 px-4 text-left">Role</th>
                <th className="py-3.5 px-4 text-left">Status</th>
                <th className="py-3.5 px-4 text-left">Created (PHT)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-cinzel">
                    Loading user accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
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
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setResetTarget(u);
                              setNewPassword('');
                              setShowResetPw(false);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Reset account password"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset PW</span>
                          </button>

                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            title="Edit account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={isSelf}
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                              u.is_active
                                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                            title={
                              isSelf
                                ? 'Cannot deactivate your own account'
                                : u.is_active
                                ? 'Deactivate account'
                                : 'Activate account'
                            }
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer"
                              title="Delete unused account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase">
                  {editingUser ? 'Edit Staff Account' : 'Add Admin / Staff Account'}
                </h3>
                <p className="text-xs text-slate-400">
                  Assign system access role and login credentials
                </p>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.full_name}
                  onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Username / Login Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formState.username}
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  placeholder="e.g. admin2@cca.edu.ph or registrar@cca.edu.ph"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  System Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                  disabled={editingUser && currentUser?.id === editingUser.id}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none disabled:opacity-60"
                >
                  <option value="Admin">Admin (User Accounts, Student Records, Reports)</option>
                  <option value="Cashier">Cashier (Collections, Receipts, Notices)</option>
                  <option value="Principal">Principal (Oversight &amp; Reports)</option>
                </select>
              </div>

              {!editingUser && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={formState.password}
                      onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Account Active</span>
                <button
                  type="button"
                  disabled={editingUser && currentUser?.id === editingUser.id}
                  onClick={() => setFormState({ ...formState, is_active: formState.is_active ? 0 : 1 })}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer disabled:opacity-50 ${
                    formState.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                  }`}
                >
                  {formState.is_active ? 'Active' : 'Deactivated'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-cinzel uppercase">Reset Account Password</h3>
                <p className="text-xs text-slate-400 font-mono">{resetTarget.username}</p>
              </div>
              <button
                onClick={() => setResetTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPw((p) => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showResetPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {resetting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
