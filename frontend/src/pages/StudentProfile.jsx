import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, FileText, Printer, CheckCircle2,
  AlertCircle, Clock, ShieldCheck, User, Phone, Mail,
  GraduationCap, BookOpen, Zap, Sparkles, Plus, Calendar
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import OfficialReceiptModal from '../components/OfficialReceiptModal';
import PaymentNoticeLetterModal from '../components/PaymentNoticeLetterModal';
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

const CATEGORY_COLORS = {
  'Tuition Fee': 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
  'Registration Fee': 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400',
  'Books': 'border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400',
  'Energy Fee': 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
  'Other Fees': 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400',
};

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [noticeLetterData, setNoticeLetterData] = useState(null);
  const [yearlyRecordData, setYearlyRecordData] = useState(null);

  // Payment form state
  const [feeType, setFeeType] = useState('Tuition Fee');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextOrNumber, setNextOrNumber] = useState('');

  useEffect(() => {
    fetchStudentProfile();
  }, [id]);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/students/${id}`);
      setStudent(res.data);
    } catch (err) {
      addToast('Failed to load student profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModalForCategory = async (catName, remainingBal) => {
    setFeeType(catName);
    // Pre-fill with reasonable monthly payment or remaining balance
    if (catName === 'Tuition Fee') {
      setPaymentAmount('1906.00');
    } else if (catName === 'Energy Fee') {
      setPaymentAmount('300.00');
    } else {
      setPaymentAmount(remainingBal > 0 ? remainingBal.toFixed(2) : '');
    }
    setRemarks('');
    setRefNumber('');

    try {
      const res = await api.get('/students/next-receipt-number');
      setNextOrNumber(res.data.next_or_number);
    } catch {
      setNextOrNumber('Auto-Generated');
    }

    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(paymentAmount);
    if (!amountVal || amountVal <= 0) {
      addToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/students/${id}/payments`, {
        fee_type: feeType,
        amount: amountVal,
        payment_method: paymentMethod,
        reference_number: refNumber || null,
        description: `Payment for ${feeType} - ${student.full_name}`,
        remarks: remarks || null,
        envelope_verified: 1
      });

      addToast(res.data.message || 'Payment recorded successfully!', 'success');
      setShowPaymentModal(false);

      // Auto-show soft-copy receipt
      if (res.data.receipt) {
        setSelectedReceipt(res.data.receipt);
      }

      // Refresh student profile immediately
      fetchStudentProfile();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to record payment';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenNoticeLetter = async () => {
    try {
      const res = await api.get(`/students/${id}/notice-letter`);
      setNoticeLetterData(res.data);
    } catch (err) {
      addToast('Failed to generate notice letter', 'error');
    }
  };

  const handleOpenYearlyRecord = async () => {
    try {
      const res = await api.get(`/students/${id}/yearly-record`);
      setYearlyRecordData(res.data);
    } catch (err) {
      addToast('Failed to generate end-of-year record', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Loading Student Profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">Student Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">The requested student profile could not be located.</p>
        <button
          onClick={() => navigate('/income')}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Return to Collections
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/income')}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-sm shrink-0"
            title="Back to Collections"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white font-cinzel tracking-tight uppercase truncate">
                {student.full_name}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-cinzel border shrink-0 ${
                student.payment_status === 'Fully Paid'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : student.payment_status === 'Partial'
                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
              }`}>
                {student.payment_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
              LRN: {student.student_id} • Grade: {student.grade_level} - {student.section}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => openPaymentModalForCategory('Tuition Fee', 0)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={handleOpenNoticeLetter}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title="Generate official payment notice letter for parents"
          >
            <FileText className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Notice Letter</span>
          </button>
          <button
            onClick={handleOpenYearlyRecord}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title="Print end of school year payment transcript and receipts"
          >
            <Printer className="w-4 h-4 text-blue-500 shrink-0" />
            <span>End-of-Year Record</span>
          </button>
        </div>
      </div>

      {/* Student Profile Info Card & Overall Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student & Parent Details */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-slate-900 border border-brand-200 dark:border-slate-700 flex items-center justify-center font-cinzel font-black text-brand-600 dark:text-brand-400 text-lg">
              {student.full_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase font-cinzel">
                Student Profile Information
              </h3>
              <p className="text-[11px] text-slate-400">School Year {student.school_year}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Parent / Guardian:</span>
              <span className="font-bold text-slate-800 dark:text-white">{student.parent_name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact Number:</span>
              <span className="font-mono">{student.parent_contact || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address:</span>
              <span>{student.parent_email || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span className="text-slate-400 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Section / Adviser:</span>
              <span className="font-medium">{student.section}</span>
            </div>
          </div>
        </div>

        {/* Right: Total Financial Snapshot */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-200 font-cinzel font-bold">
                Student Financial Assessment Status
              </p>
              <h3 className="text-2xl sm:text-3xl font-black mt-1 font-mono">
                {formatPeso(student.outstanding_balance)}
              </h3>
              <p className="text-xs text-blue-100/70 mt-0.5">
                Total Remaining Balance for School Year {student.school_year}
              </p>
            </div>
            <div className="flex gap-4 sm:border-l sm:border-white/10 sm:pl-6 text-xs">
              <div>
                <p className="text-[10px] text-blue-200 uppercase font-cinzel font-bold">Total Assessment</p>
                <p className="text-base font-bold font-mono text-white mt-0.5">{formatPeso(student.total_due)}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-300 uppercase font-cinzel font-bold">Total Paid</p>
                <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">{formatPeso(student.total_paid)}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
            <div className="flex justify-between text-[11px] font-semibold text-blue-200 mb-1.5">
              <span>Collection Completion Progress</span>
              <span>
                {student.total_due > 0 ? `${Math.min(100, Math.round((student.total_paid / student.total_due) * 100))}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{
                  width: `${student.total_due > 0 ? Math.min(100, (student.total_paid / student.total_due) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* The 5 Core Fee Categories Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel uppercase">
              Fee Categories Assessment Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Official school fees: Tuition Fee, Registration Fee, Books, Energy Fee, and Other Fees
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {student.fee_schedules?.map((fs) => {
            const Icon = CATEGORY_ICONS[fs.category_name] || Sparkles;
            const cardColor = CATEGORY_COLORS[fs.category_name] || 'border-slate-200 bg-white text-slate-700';
            const isCleared = fs.remaining_balance <= 0 && fs.total_due > 0;
            const progress = fs.total_due > 0 ? Math.min(100, Math.round((fs.total_paid / fs.total_due) * 100)) : 0;

            return (
              <div
                key={fs.id}
                className={`rounded-2xl p-4 border transition-all hover:shadow-md flex flex-col justify-between ${cardColor}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2 gap-1.5 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-cinzel truncate">
                      {fs.category_name}
                    </span>
                    <Icon className="w-4 h-4 opacity-80 shrink-0" />
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mb-2">
                    {fs.sub_description || fs.category_name}
                  </p>

                  <div className="space-y-1 my-3">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Total Due:</span>
                      <span className="font-mono font-semibold whitespace-nowrap">{formatPeso(fs.total_due)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Paid:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatPeso(fs.total_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-600 dark:text-slate-300">Balance:</span>
                      <span className={`font-mono whitespace-nowrap ${fs.remaining_balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                        {formatPeso(fs.remaining_balance)}
                      </span>
                    </div>
                  </div>

                  {/* Micro Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => openPaymentModalForCategory(fs.category_name, fs.remaining_balance)}
                  className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold font-cinzel uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{isCleared ? 'Add Payment' : 'Pay Balance'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Transactions & Receipts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel uppercase">
              Student Payment Records & Soft-Copy Receipts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All official receipts auto-generated and preserved in student's profile account
            </p>
          </div>
          <button
            onClick={() => openPaymentModalForCategory('Tuition Fee', 0)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Payment</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] uppercase font-cinzel font-bold">
                <th className="text-left py-3 px-3 whitespace-nowrap">Date Recorded</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Official Receipt #</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Fee Category</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Description</th>
                <th className="text-right py-3 px-3 whitespace-nowrap">Amount Paid</th>
                <th className="text-left py-3 px-3 whitespace-nowrap">Method</th>
                <th className="text-center py-3 px-3 whitespace-nowrap">Envelope Status</th>
                <th className="text-center py-3 px-3 whitespace-nowrap">Soft-Copy Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {student.payments && student.payments.length > 0 ? (
                student.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {p.date_recorded ? p.date_recorded.split('T')[0] : 'N/A'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {p.or_number || 'OR-AUTO'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white whitespace-nowrap">
                      {p.category_name || p.fee_type || 'Tuition Fee'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {p.description}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatPeso(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {p.payment_method}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Verified
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedReceipt({
                          or_number: p.or_number,
                          date: p.date_recorded ? new Date(p.date_recorded).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A',
                          student_name: student.full_name,
                          student_id: student.student_id,
                          grade_level: student.grade_level,
                          section: student.section,
                          parent_name: student.parent_name,
                          fee_type: p.category_name || p.fee_type || 'Tuition Fee',
                          description: p.description,
                          amount: p.amount,
                          payment_method: p.payment_method,
                          reference_number: p.reference_number || 'N/A',
                          remaining_balance: p.remaining_balance || 0,
                          school_year: student.school_year,
                          cashier_name: 'Maria Santos'
                        })}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-brand-600 dark:text-brand-400 shrink-0" />
                        <span>View OR</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No payment collections recorded yet for this student.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Collection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel text-slate-800 dark:text-white uppercase">
                  Record Payment Collection
                </h3>
                <p className="text-xs text-slate-400">
                  Student: <span className="font-bold text-brand-600 dark:text-brand-400">{student.full_name}</span> ({student.grade_level})
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              {/* Auto-Generated OR preview banner */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 font-cinzel">
                    Official Receipt Number (Auto-Generated)
                  </p>
                  <p className="text-base font-mono font-black text-emerald-900 dark:text-emerald-200 tracking-wider">
                    {nextOrNumber || 'OR-2026-XXXXX'}
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              {/* Fee Category Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-1.5 font-cinzel">
                  Fee Category
                </label>
                <select
                  value={feeType}
                  onChange={(e) => {
                    setFeeType(e.target.value);
                    if (e.target.value === 'Tuition Fee') setPaymentAmount('1906.00');
                    else if (e.target.value === 'Energy Fee') setPaymentAmount('300.00');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Tuition Fee">Tuition Fee (Monthly ₱1,906 / Annual ₱19,060)</option>
                  <option value="Registration Fee">Registration Fee (Annual ₱5,700)</option>
                  <option value="Books">Books & Materials (₱6,900)</option>
                  <option value="Energy Fee">Energy Fee (Monthly ₱300 / Annual ₱3,000)</option>
                  <option value="Other Fees">Other Fees (Educational Tours, Swimming, Activities)</option>
                </select>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-1.5 font-cinzel">
                  Amount to Collect (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-1.5 font-cinzel">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Cash">Cash (Window / Brown Envelope)</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-1.5 font-cinzel">
                    Reference / Check #
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="Optional reference"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest block mb-1.5 font-cinzel">
                  Cashier Remarks / Note
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Paid in cash at window, brown envelope reconciled"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? 'Recording...' : 'Issue Receipt & Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <OfficialReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Payment Notice Letter Modal */}
      {noticeLetterData && (
        <PaymentNoticeLetterModal
          letterData={noticeLetterData}
          onClose={() => setNoticeLetterData(null)}
        />
      )}

      {/* End-of-School-Year Record Modal */}
      {yearlyRecordData && (
        <YearlyRecordModal
          recordData={yearlyRecordData}
          onClose={() => setYearlyRecordData(null)}
        />
      )}
    </div>
  );
}

