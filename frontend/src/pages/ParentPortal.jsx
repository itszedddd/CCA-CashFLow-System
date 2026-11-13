import { useState, useEffect } from 'react';
import {
  User, ShieldCheck, Printer, CheckCircle2, Clock, AlertCircle,
  Bell, GraduationCap, BookOpen, Zap, Sparkles, FileText,
  DollarSign, ArrowUpRight
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import OfficialReceiptModal from '../components/OfficialReceiptModal';
import YearlyRecordModal from '../components/YearlyRecordModal';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

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

  useEffect(() => {
    fetchParentData();
  }, [user]);

  const fetchParentData = async () => {
    setLoading(true);
    try {
      // Find linked student ID
      const studentId = user?.student_id || 1;
      const [stuRes, notifRes] = await Promise.all([
        api.get(`/students/${studentId}`),
        api.get(`/notifications/?student_id=${studentId}`)
      ]);
      setStudent(stuRes.data);
      setNotifications(notifRes.data);
    } catch (err) {
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
      addToast('Failed to generate yearly payment summary', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Loading Child's Payment Account...</p>
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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-blue-200 border border-white/20 mb-3 font-cinzel">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            Authorized Parent Portal
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-cinzel uppercase tracking-wide truncate">
            Welcome, {student.parent_name || 'Parent / Guardian'}
          </h2>
          <p className="text-xs text-blue-100/80 mt-1">
            Viewing real-time payment ledger, official receipts, and fee balances for{' '}
            <strong className="text-white underline">{student.full_name}</strong> ({student.grade_level} - {student.section})
          </p>
        </div>

        <button
          onClick={handleOpenYearlyRecord}
          className="px-4 py-2.5 bg-white text-brand-900 hover:bg-blue-50 rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-2 transition cursor-pointer self-start md:self-auto shrink-0"
        >
          <Printer className="w-4 h-4 text-brand-600 shrink-0" />
          <span>Print Complete School Year Record</span>
        </button>
      </div>

      {/* KPI Cards: Total Due, Total Paid, Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm min-w-0">
          <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Annual Assessment</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono truncate">
            {formatPeso(student.total_due)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">School Year {student.school_year}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm min-w-0">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-cinzel">Total Payments Settled</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono truncate">
            {formatPeso(student.total_paid)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {student.total_due > 0 ? `${Math.round((student.total_paid / student.total_due) * 100)}% of total cleared` : '0%'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm min-w-0">
          <p className="text-[10px] uppercase font-bold text-rose-500 font-cinzel">Outstanding Balance Due</p>
          <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono truncate">
            {formatPeso(student.outstanding_balance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {student.outstanding_balance <= 0 ? 'All fees fully settled!' : 'Payable at school cashier'}
          </p>
        </div>
      </div>

      {/* The 5 Fee Categories Breakdown for Parent */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel uppercase mb-3">
          Fee Categories Breakdown & Balances
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {student.fee_schedules?.map((fs) => {
            const Icon = CATEGORY_ICONS[fs.category_name] || Sparkles;
            const isCleared = fs.remaining_balance <= 0 && fs.total_due > 0;
            return (
              <div
                key={fs.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2 gap-1.5 min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-white font-cinzel uppercase truncate">
                      {fs.category_name}
                    </span>
                    <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mb-2">{fs.sub_description}</p>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Total Due:</span>
                      <span className="font-mono whitespace-nowrap">{formatPeso(fs.total_due)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Paid:</span>
                      <span className="font-mono text-emerald-600 font-bold whitespace-nowrap">{formatPeso(fs.total_paid)}</span>
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
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                    isCleared
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {isCleared ? 'Fee Cleared' : 'Pending Settlement'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications Inbox for Parent */}
      {notifications.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-cinzel">
              School Fee Announcements & Notices from Cashier
            </h3>
          </div>
          <div className="space-y-2.5">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-800 dark:bg-slate-800 dark:text-brand-300 font-cinzel uppercase">
                      {n.fee_type}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">{n.description}</p>
                </div>
                <div className="text-right sm:border-l sm:border-slate-200 sm:dark:border-slate-700 sm:pl-4 min-w-max">
                  <p className="text-[10px] text-slate-400 font-cinzel uppercase">Amount to Settle</p>
                  <p className="font-mono font-black text-brand-600 dark:text-brand-400 text-sm">
                    {formatPeso(n.amount)}
                  </p>
                  {n.due_date && (
                    <p className="text-[10px] text-slate-400">Due: {n.due_date}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Receipts History for Parent */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel uppercase">
              Official Payment Receipts History
            </h3>
            <p className="text-xs text-slate-400">
              Complete digital copies of all receipts issued by Calvary Christian Academy Cashier
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] uppercase font-cinzel font-bold">
                <th className="text-left py-3 px-3 whitespace-nowrap">Date</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">OR Number</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Fee Type</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Description</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Amount Paid</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Method</th>
                <th className="text-center py-3 px-3 whitespace-nowrap">Soft-Copy Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {student.payments && student.payments.length > 0 ? (
                student.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{p.date_recorded ? p.date_recorded.split('T')[0] : 'N/A'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">{p.or_number}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">{p.category_name || p.fee_type}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{p.description}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">{formatPeso(p.amount)}</td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{p.payment_method}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReceipt({
                          or_number: p.or_number,
                          date: p.date_recorded,
                          student_name: student.full_name,
                          student_id: student.student_id,
                          grade_level: student.grade_level,
                          section: student.section,
                          parent_name: student.parent_name,
                          fee_type: p.category_name || p.fee_type,
                          description: p.description,
                          amount: p.amount,
                          payment_method: p.payment_method,
                          remaining_balance: p.remaining_balance || 0,
                          school_year: student.school_year,
                          cashier_name: 'Maria Santos'
                        })}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-slate-700 dark:text-white rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                      >
                        <Printer className="w-3 h-3 text-brand-600 shrink-0" />
                        <span>Print Soft-Copy</span>
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

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <OfficialReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Yearly Record Modal */}
      {yearlyRecordData && (
        <YearlyRecordModal
          recordData={yearlyRecordData}
          onClose={() => setYearlyRecordData(null)}
        />
      )}
    </div>
  );
}

