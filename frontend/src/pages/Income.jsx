import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, Plus, CreditCard, ChevronRight,
  GraduationCap, AlertCircle, CheckCircle2, Clock, FileText,
  DollarSign, ArrowUpRight, ShieldCheck, Eye, Sparkles
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import OfficialReceiptModal from '../components/OfficialReceiptModal';
import PaymentNoticeLetterModal from '../components/PaymentNoticeLetterModal';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const GRADE_LEVELS = [
  'All',
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
];

export default function Collections() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [students, setStudents] = useState([]);
  const [gradeSummary, setGradeSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showQuickPayModal, setShowQuickPayModal] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [noticeLetterData, setNoticeLetterData] = useState(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    student_id: '',
    full_name: '',
    grade_level: 'Grade 1',
    section: 'Faith',
    gender: 'Male',
    parent_name: '',
    parent_contact: '',
    parent_email: '',
    address: 'Bulacan'
  });
  const [creatingStudent, setCreatingStudent] = useState(false);

  // Quick Payment Form State
  const [payFeeType, setPayFeeType] = useState('Tuition Fee');
  const [payAmount, setPayAmount] = useState('1906.00');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [nextOrNumber, setNextOrNumber] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedGrade, searchQuery, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedGrade !== 'All') params.grade_level = selectedGrade;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (statusFilter !== 'All') params.status = statusFilter;

      const [stuRes, sumRes] = await Promise.all([
        api.get('/students/', { params }),
        api.get('/students/grade-summary')
      ]);

      setStudents(stuRes.data);
      setGradeSummary(sumRes.data);
    } catch (err) {
      addToast('Failed to load collections data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.full_name || !newStudent.student_id) {
      addToast('Please enter full name and Student ID / LRN', 'error');
      return;
    }
    setCreatingStudent(true);
    try {
      const res = await api.post('/students/', newStudent);
      addToast(`Student profile created for ${res.data.full_name}!`, 'success');
      setShowAddStudentModal(false);
      setNewStudent({
        student_id: '',
        full_name: '',
        grade_level: 'Grade 1',
        section: 'Faith',
        gender: 'Male',
        parent_name: '',
        parent_contact: '',
        parent_email: '',
        address: 'Bulacan'
      });
      fetchData();
      navigate(`/collections/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create student profile';
      addToast(msg, 'error');
    } finally {
      setCreatingStudent(false);
    }
  };

  const openQuickPay = async (student) => {
    setSelectedStudentForPay(student);
    setPayFeeType('Tuition Fee');
    setPayAmount('1906.00');
    setPayRemarks('');
    setPayRef('');

    try {
      const res = await api.get('/students/next-receipt-number');
      setNextOrNumber(res.data.next_or_number);
    } catch {
      setNextOrNumber('Auto-Generated');
    }

    setShowQuickPayModal(true);
  };

  const handleRecordQuickPayment = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(payAmount);
    if (!amountVal || amountVal <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setRecordingPay(true);
    try {
      const res = await api.post(`/students/${selectedStudentForPay.id}/payments`, {
        fee_type: payFeeType,
        amount: amountVal,
        payment_method: payMethod,
        reference_number: payRef || null,
        description: `Payment for ${payFeeType} - ${selectedStudentForPay.full_name}`,
        remarks: payRemarks || null,
        envelope_verified: 1
      });

      addToast(res.data.message || 'Payment recorded successfully!', 'success');
      setShowQuickPayModal(false);

      if (res.data.receipt) {
        setSelectedReceipt(res.data.receipt);
      }

      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to record payment';
      addToast(msg, 'error');
    } finally {
      setRecordingPay(false);
    }
  };

  const openNoticeLetter = async (studentId) => {
    try {
      const res = await api.get(`/students/${studentId}/notice-letter`);
      setNoticeLetterData(res.data);
    } catch (err) {
      addToast('Failed to generate notice letter', 'error');
    }
  };

  // Aggregated totals
  const totalDueAll = students.reduce((sum, s) => sum + (s.total_due || 0), 0);
  const totalPaidAll = students.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const totalOutstandingAll = students.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white font-cinzel tracking-tight uppercase">
            Collections & Student Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organized list of students by Grade Level with individual payment records and auto-generated receipts
          </p>
        </div>

        <button
          onClick={() => {
            setNewStudent(p => ({
              ...p,
              student_id: `LRN-2026-${Math.floor(1000 + Math.random() * 9000)}`
            }));
            setShowAddStudentModal(true);
          }}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Student Profile</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Students</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1 font-mono truncate">
              {students.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {selectedGrade === 'All' ? 'Across all 11 grades' : `Enrolled in ${selectedGrade}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Assessment</p>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-1 font-mono truncate">
              {formatPeso(totalDueAll)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Assessed for SY 2026-2027</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 font-cinzel">Total Collected</p>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono truncate">
              {formatPeso(totalPaidAll)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {totalDueAll > 0 ? `${Math.round((totalPaidAll / totalDueAll) * 100)}% overall collection` : '0%'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-rose-500 font-cinzel">Outstanding Due</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono truncate">
              {formatPeso(totalOutstandingAll)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Unpaid tuition & fees</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grade Level Filter Horizontal Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 font-cinzel">
            Grade Level:
          </span>
          {GRADE_LEVELS.map((g) => {
            const isSelected = selectedGrade === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition font-cinzel uppercase tracking-wider cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, LRN, or parent..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto justify-start sm:justify-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-cinzel">
            Status:
          </span>
          {['All', 'Fully Paid', 'Partial', 'Unpaid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Students List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 text-slate-400 text-[10px] uppercase font-cinzel font-bold">
                <th className="text-left py-3.5 px-4 whitespace-nowrap">Student Name</th>
                <th className="text-left py-3.5 px-4 whitespace-nowrap">Grade & Section</th>
                <th className="text-left py-3.5 px-4 whitespace-nowrap">Student ID / LRN</th>
                <th className="text-left py-3.5 px-4 whitespace-nowrap">Parent / Guardian</th>
                <th className="text-right py-3.5 px-4 whitespace-nowrap">Total Assessed</th>
                <th className="text-right py-3.5 px-4 whitespace-nowrap">Total Paid</th>
                <th className="text-right py-3.5 px-4 whitespace-nowrap">Remaining Balance</th>
                <th className="text-center py-3.5 px-4 whitespace-nowrap">Status</th>
                <th className="text-right py-3.5 px-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-400 font-cinzel">Loading students...</p>
                    </div>
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition group cursor-pointer"
                    onClick={() => navigate(`/collections/${s.id}`)}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-slate-900 border border-brand-200 dark:border-slate-700 flex items-center justify-center font-cinzel font-bold text-brand-600 dark:text-brand-400 text-xs shrink-0">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white uppercase font-sans truncate">
                            {s.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400">{s.gender || 'Student'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {s.grade_level}
                      </span>
                      <p className="text-[10px] text-slate-400">{s.section || 'Faith'}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {s.student_id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{s.parent_name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.parent_contact || ''}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatPeso(s.total_due)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatPeso(s.total_paid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {formatPeso(s.outstanding_balance)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-cinzel border ${
                        s.payment_status === 'Fully Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                          : s.payment_status === 'Partial'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                      }`}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openQuickPay(s)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Record payment for this student"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pay</span>
                        </button>
                        {s.outstanding_balance > 0 && (
                          <button
                            onClick={() => openNoticeLetter(s.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shrink-0"
                            title="Generate payment notice letter"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Notice</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/collections/${s.id}`)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                          title="View student profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No students match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                  Add New Student Profile
                </h3>
                <p className="text-xs text-slate-400">
                  Initializes standard fee schedules for Tuition, Registration, Books, Energy, and Other Fees
                </p>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Student ID / LRN
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.student_id}
                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                    placeholder="e.g. LRN-2026-0042"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Grade Level
                  </label>
                  <select
                    value={newStudent.grade_level}
                    onChange={(e) => setNewStudent({ ...newStudent, grade_level: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    {GRADE_LEVELS.filter(g => g !== 'All').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Full Name of Student
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  placeholder="e.g. Juan Carlos Santos"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newStudent.section}
                    onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                    placeholder="e.g. Faith"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Gender
                  </label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Parent / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.parent_name}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={newStudent.parent_contact}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_contact: e.target.value })}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStudent}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingStudent ? 'Creating Profile...' : 'Save & Open Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {showQuickPayModal && selectedStudentForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                  Quick Record Payment
                </h3>
                <p className="text-xs text-slate-400">
                  Student: <span className="font-bold text-brand-600 dark:text-brand-400">{selectedStudentForPay.full_name}</span> ({selectedStudentForPay.grade_level})
                </p>
              </div>
              <button
                onClick={() => setShowQuickPayModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordQuickPayment} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 font-cinzel">
                    Official Receipt Number (Auto-Generated)
                  </p>
                  <p className="text-base font-mono font-black text-emerald-900 dark:text-emerald-200 tracking-wider">
                    {nextOrNumber}
                  </p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Fee Category
                </label>
                <select
                  value={payFeeType}
                  onChange={(e) => {
                    setPayFeeType(e.target.value);
                    if (e.target.value === 'Tuition Fee') setPayAmount('1906.00');
                    else if (e.target.value === 'Energy Fee') setPayAmount('300.00');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                >
                  <option value="Tuition Fee">Tuition Fee</option>
                  <option value="Registration Fee">Registration Fee</option>
                  <option value="Books">Books & Materials</option>
                  <option value="Energy Fee">Energy Fee</option>
                  <option value="Other Fees">Other Fees (Tours, Swimming, Activities)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Amount to Collect (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-mono font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Cash">Cash (Window / Brown Envelope)</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Ref # / Notes
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Optional ref"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowQuickPayModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {recordingPay ? 'Saving...' : 'Issue Receipt & Save'}
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
    </div>
  );
}
