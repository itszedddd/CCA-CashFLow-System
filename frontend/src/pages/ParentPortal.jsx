import { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertCircle, Bell, GraduationCap, BookOpen, Zap,
  Sparkles, FileText, Eye, KeyRound, Lock, X
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import OfficialReceiptModal from '../components/OfficialReceiptModal';
import YearlyRecordModal from '../components/YearlyRecordModal';
import { formatPeso, formatPHDateTime, resolveSection } from '../utils/schoolData';

const CATEGORY_ICONS = {
  'Tuition Fee': GraduationCap,
  'Registration Fee': FileText,
  'Books': BookOpen,
  'Energy Fee': Zap,
  'Other Fees': Sparkles,
};

export default function ParentPortal({ user }) {
  const addToast = useToast();
  const [student, setStudent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [yearlyRecordData, setYearlyRecordData] = useState(null);

  // Change Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwChanged, setPwChanged] = useState(Boolean(user?.password_changed));

  useEffect(() => {
    fetchParentData();
  }, [user]);

  const fetchParentData = async () => {
    setLoading(true);
    try {
      // Robust multi-fallback to resolve child's student record
      const targetId = user?.student_id || user?.student_lrn || user?.username || 'me';
      let stuData = null;
      try {
        const stuRes = await api.get(`/students/${targetId}`);
        stuData = stuRes.data;
      } catch (err) {
        try {
          const fallbackRes = await api.get('/students/me');
          stuData = fallbackRes.data;
        } catch {
          console.error('Failed to resolve child account:', err);
        }
      }

      setStudent(stuData);
      if (stuData) {
        setPwChanged(Boolean(stuData.password_changed || user?.password_changed));
        try {
          const notifRes = await api.get(`/notifications/?student_id=${stuData.id}`);
          const cleanAnnouncements = (notifRes.data || []).filter(
            (n) => !(n.title || '').startsWith('Official Overdue Balance Notice')
          );
          setNotifications(cleanAnnouncements);
        } catch {
          // Notification failure should not block child's payment portal view
        }
      }
    } catch {
      addToast('Failed to load parent portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenYearlyRecord = async () => {
    try {
      const res = await api.get(`/students/${student.id}/yearly-record`);
      setYearlyRecordData(res.data);
    } catch {
      addToast('Failed to load yearly payment record', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) {
      addToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }

    setSavingPw(true);
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwChanged(true);
      try {
        const stored = JSON.parse(localStorage.getItem('cca_cf_user') || '{}');
        localStorage.setItem('cca_cf_user', JSON.stringify({ ...stored, password_changed: true }));
      } catch {
        // Ignore storage parse edge case
      }
      addToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update password', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Loading Child&apos;s Payment Account...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">Student Account Not Found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6 pb-8">
      {/* Initial Password Reminder Banner (Mobile-friendly) */}
      {!pwChanged && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase font-cinzel text-[11px]">Using Admin-Issued LRN Password</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                For security, you may set your own private Parent Portal password anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full sm:w-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel transition cursor-pointer shrink-0"
          >
            Change Password
          </button>
        </div>
      )}

      {/* Mobile-First Welcome Banner (Print Complete Record removed per Inspection 3.2.1 -> View Only) */}
      <div className="bg-gradient-to-br from-[#022868] to-blue-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-blue-100 border border-white/20 mb-3 font-cinzel">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Authorized Parent Portal
          </div>
          <h2 className="text-lg sm:text-2xl font-black font-cinzel uppercase tracking-wide break-words leading-snug">
            Welcome, {student.parent_name || 'Parent / Guardian'}
          </h2>
          <p className="text-xs text-blue-100/85 mt-1 leading-relaxed">
            Viewing payment ledger, digital receipts, and fee balances for{' '}
            <strong className="text-white underline">{student.full_name}</strong>
          </p>

          {/* Clean wrapping mobile pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            <span className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black font-mono text-xs shadow-sm tracking-wider inline-flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold">LRN:</span>
              <span>{student.student_id}</span>
            </span>
            <span className="px-2.5 py-1.5 rounded-xl bg-white/15 text-white font-bold text-xs">
              {student.grade_level} — {resolveSection(student.grade_level, student.section)}
            </span>
            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-500/25 text-emerald-100 border border-emerald-400/30 font-bold text-xs">
              SY {student.school_year}
            </span>
          </div>
        </div>

        {/* View-only School Year Record + Change Password Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2.5 shrink-0 w-full lg:w-auto">
          <button
            onClick={handleOpenYearlyRecord}
            className="w-full sm:w-auto justify-center px-4 py-3 bg-white text-brand-900 hover:bg-blue-50 rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-md flex items-center gap-2 transition cursor-pointer"
          >
            <Eye className="w-4 h-4 text-brand-600 shrink-0" />
            <span>View School Year Record</span>
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full sm:w-auto justify-center px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/25 rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel flex items-center gap-2 transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Total Due, Total Paid, Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-md min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Annual Assessment</p>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono truncate">
            {formatPeso(student.total_due)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">School Year {student.school_year}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-md min-w-0">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-cinzel">
            Total Payments Settled
          </p>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono truncate">
            {formatPeso(student.total_paid)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {student.total_due > 0 ? `${Math.round((student.total_paid / student.total_due) * 100)}% of total cleared` : '0%'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-md min-w-0">
          <p className="text-[10px] uppercase font-bold text-rose-500 font-cinzel">Outstanding Balance Due</p>
          <h3 className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono truncate">
            {formatPeso(student.outstanding_balance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {student.outstanding_balance <= 0 ? 'All fees fully settled!' : 'Payable at school cashier'}
          </p>
        </div>
      </div>

      {/* The 5 Fee Categories Breakdown */}
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white font-cinzel uppercase mb-3">
          Fee Categories Breakdown &amp; Balances
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {student.fee_schedules?.map((fs) => {
            const Icon = CATEGORY_ICONS[fs.category_name] || Sparkles;
            const isCleared = fs.remaining_balance <= 0 && fs.total_due > 0;
            return (
              <div
                key={fs.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-white font-cinzel uppercase truncate">
                      {fs.category_name}
                    </span>
                    <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2.5 line-clamp-1">{fs.sub_description}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Due:</span>
                      <span className="font-mono whitespace-nowrap">{formatPeso(fs.total_due)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Paid:</span>
                      <span className="font-mono text-emerald-600 font-bold whitespace-nowrap">
                        {formatPeso(fs.total_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-slate-700 dark:text-slate-300">Balance:</span>
                      <span className={`font-mono whitespace-nowrap ${fs.remaining_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatPeso(fs.remaining_balance)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 text-center">
                  <span
                    className={`inline-block w-full py-1 rounded-lg text-[10px] font-bold uppercase ${
                      isCleared
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                  >
                    {isCleared ? 'Fee Cleared' : 'Pending Settlement'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Announcements Inbox for Parent */}
      {notifications.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-cinzel">
              School Fee &amp; Event Announcements
            </h3>
          </div>
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-800 dark:bg-slate-800 dark:text-brand-300 font-cinzel uppercase">
                      {n.fee_type}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white break-words">{n.title}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed break-words">
                    {n.description}
                  </p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-4 shrink-0">
                  <p className="text-[10px] text-slate-400 font-cinzel uppercase">Amount</p>
                  <div className="text-right">
                    <p className="font-mono font-black text-brand-600 dark:text-brand-400 text-sm">
                      {formatPeso(n.amount)}
                    </p>
                    {n.due_date && <p className="text-[10px] text-slate-400">Due: {n.due_date}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Digital Receipts History (Mobile-First Cards + Desktop Table) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white font-cinzel uppercase">
            Official Digital Receipts History
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            View-only digital copies of official receipts recorded by the Calvary Christian Academy Cashier
          </p>
        </div>

        {/* Mobile Receipt Cards (Inspection Page 16 fix for smartphone usability) */}
        <div className="md:hidden space-y-3">
          {student.payments && student.payments.length > 0 ? (
            student.payments.map((p) => (
              <div
                key={`mob-rc-${p.id}`}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-black text-brand-700 dark:text-brand-400 text-xs">
                      {p.or_number}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{formatPHDateTime(p.date_recorded)}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatPeso(p.amount)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{p.category_name || p.fee_type}</p>
                    <p className="text-[10px] text-slate-400">{p.payment_method}</p>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedReceipt({
                        or_number: p.or_number,
                        date: p.date_recorded,
                        student_name: student.full_name,
                        student_id: student.student_id,
                        grade_level: student.grade_level,
                        section: resolveSection(student.grade_level, student.section),
                        parent_name: student.parent_name,
                        fee_type: p.category_name || p.fee_type,
                        description: p.description,
                        amount: p.amount,
                        payment_method: p.payment_method,
                        remaining_balance: p.remaining_balance || 0,
                        school_year: student.school_year,
                        cashier_name: 'Maria Santos',
                      })
                    }
                    className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-bold font-cinzel uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Digital Receipt</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-xs text-slate-400">No payment receipts found.</p>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] uppercase font-cinzel font-bold">
                <th className="text-left py-3 px-3 whitespace-nowrap">Date Recorded (PH)</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">OR Number</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Fee Type</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Description</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Amount Paid</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Method</th>
                <th className="text-center py-3 px-3 whitespace-nowrap">Digital Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {student.payments && student.payments.length > 0 ? (
                student.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatPHDateTime(p.date_recorded)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {p.or_number}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                      {p.category_name || p.fee_type}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {p.description}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {formatPeso(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.payment_method}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() =>
                          setSelectedReceipt({
                            or_number: p.or_number,
                            date: p.date_recorded,
                            student_name: student.full_name,
                            student_id: student.student_id,
                            grade_level: student.grade_level,
                            section: resolveSection(student.grade_level, student.section),
                            parent_name: student.parent_name,
                            fee_type: p.category_name || p.fee_type,
                            description: p.description,
                            amount: p.amount,
                            payment_method: p.payment_method,
                            remaining_balance: p.remaining_balance || 0,
                            school_year: student.school_year,
                            cashier_name: 'Maria Santos',
                          })
                        }
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-slate-700 dark:text-white rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                      >
                        <Eye className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
                        <span>View Digital Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No payment receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold font-cinzel uppercase">Update Parent Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase font-cinzel block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  placeholder="Enter current LRN password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase font-cinzel block mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase font-cinzel block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.confirm_password}
                  onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPw}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel cursor-pointer disabled:opacity-50"
                >
                  {savingPw ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Digital Receipt Modal (View-only) */}
      {selectedReceipt && (
        <OfficialReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* End-of-Year Complete Record Modal (Strictly View-Only in Parent Portal per Inspection 3.2.1) */}
      {yearlyRecordData && (
        <YearlyRecordModal
          recordData={yearlyRecordData}
          viewOnly={true}
          onClose={() => setYearlyRecordData(null)}
        />
      )}
    </div>
  );
}
