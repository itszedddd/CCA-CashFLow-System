import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Plus, CreditCard, ChevronRight,
  AlertCircle, AlertTriangle, FileText, ArrowUpRight,
  Upload, Download, FileSpreadsheet, X, Receipt, Lock, Info, Archive
} from 'lucide-react';
import PesoSign from '../components/PesoSign';
import api from '../api';
import { useToast } from '../components/Toast';
import OfficialReceiptModal from '../components/OfficialReceiptModal';
import PaymentNoticeLetterModal from '../components/PaymentNoticeLetterModal';
import ConfirmModal from '../components/ConfirmModal';
import {
  GRADE_LEVELS,
  resolveSection,
  formatPeso,
  getDefaultStudentPassword,
  formatStudentFullName,
} from '../utils/schoolData';

const GRADE_FILTERS = ['All', ...GRADE_LEVELS];

export default function Collections() {
  const navigate = useNavigate();
  const addToast = useToast();

  const isAdmin = (() => {
    try {
      return (JSON.parse(localStorage.getItem('cca_cf_user') || '{}')?.role || '').toLowerCase() === 'admin';
    } catch {
      return false;
    }
  })();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showQuickPayModal, setShowQuickPayModal] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [noticeLetterData, setNoticeLetterData] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [archivingId, setArchivingId] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [checkingCsv, setCheckingCsv] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/students/csv-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'CCA_Students_Import_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('CSV Template downloaded successfully', 'info');
    } catch {
      addToast('Failed to download CSV template', 'error');
    }
  };

  const buildCsvFormData = () => {
    const formData = new FormData();
    formData.append('file', csvFile);
    return formData;
  };

  const runCsvImport = async (skipDuplicates = false) => {
    setImportingCsv(true);
    try {
      const res = await api.post('/students/import-csv', buildCsvFormData(), {
        params: skipDuplicates ? { skip_duplicates: true } : {},
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ignored = res.data.duplicate_count || 0;
      addToast(
        `Imported ${res.data.imported_count} students! ` +
        `(${res.data.updated_existing_count} updated/existing${ignored ? `, ${ignored} duplicate rows ignored` : ''})`,
        'success'
      );
      setCsvResult(res.data);
      setCsvFile(null);
      setShowDuplicateModal(false);
      setDuplicateCheck(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to import CSV file', 'error');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleImportCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      addToast('Please select a CSV file to upload', 'error');
      return;
    }
    setCheckingCsv(true);
    try {
      const res = await api.post('/students/check-csv-duplicates', buildCsvFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.has_duplicates) {
        setDuplicateCheck(res.data);
        setShowDuplicateModal(true);
        return;
      }
      await runCsvImport(false);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to check CSV for duplicates', 'error');
    } finally {
      setCheckingCsv(false);
    }
  };

  const [newStudent, setNewStudent] = useState({
    student_id: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    grade_level: 'Grade 1',
    section: resolveSection('Grade 1'),
    gender: 'Male',
    parent_name: '',
    parent_contact: '',
    parent_email: '',
    address: 'City of San Jose del Monte, Bulacan'
  });
  const [creatingStudent, setCreatingStudent] = useState(false);

  const [payOrNumber, setPayOrNumber] = useState('');
  const [payFeeType, setPayFeeType] = useState('Tuition Fee');
  const [payAmount, setPayAmount] = useState('1906.00');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
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

      const stuRes = await api.get('/students/', { params });
      setStudents(stuRes.data);
    } catch {
      addToast('Failed to load collections data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveStudent = (student) => {
    setArchiveTarget(student);
  };

  const confirmArchiveStudent = async () => {
    const student = archiveTarget;
    if (!student) return;
    setArchivingId(student.id);
    try {
      await api.post(`/students/${student.id}/archive`);
      addToast(`${student.full_name} archived successfully`, 'success');
      setArchiveTarget(null);
      await fetchData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to archive student', 'error');
    } finally {
      setArchivingId(null);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const formattedName = formatStudentFullName(newStudent.last_name, newStudent.first_name, newStudent.middle_name);
    if (!newStudent.student_id.trim() || !newStudent.last_name.trim() || !newStudent.first_name.trim()) {
      addToast('Please enter mandatory Student ID / LRN, Last Name, and First Name', 'error');
      return;
    }
    if (!/^\d+$/.test(newStudent.student_id.trim())) {
      addToast('Student ID / LRN must contain numbers only.', 'error');
      return;
    }
    const cleanContact = newStudent.parent_contact.replace(/\D/g, '');
    if (!cleanContact || cleanContact.length !== 11) {
      addToast('Contact number is required and must be exactly 11 digits (e.g. 09171234567). Bawal kulang, bawal sobra.', 'error');
      return;
    }
    setCreatingStudent(true);
    try {
      const payload = {
        student_id: newStudent.student_id.trim(),
        full_name: formattedName,
        grade_level: newStudent.grade_level,
        section: resolveSection(newStudent.grade_level),
        gender: newStudent.gender,
        parent_name: newStudent.parent_name,
        parent_contact: cleanContact,
        parent_email: newStudent.parent_email,
        address: newStudent.address,
      };
      const res = await api.post('/students/', payload);
      addToast(
        `Student profile created for ${res.data.full_name}! Initial Parent Password: ${res.data.initial_password || 'Issued'}`,
        'success'
      );
      setShowAddStudentModal(false);
      setNewStudent({
        student_id: '',
        last_name: '',
        first_name: '',
        middle_name: '',
        grade_level: 'Grade 1',
        section: resolveSection('Grade 1'),
        gender: 'Male',
        parent_name: '',
        parent_contact: '',
        parent_email: '',
        address: 'City of San Jose del Monte, Bulacan'
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

  const openQuickPay = (student) => {
    setSelectedStudentForPay(student);
    setPayOrNumber('');
    setPayFeeType('Tuition Fee');
    setPayAmount('1906.00');
    setPayMethod('Cash');
    setPayRemarks('');
    setPayRef('');
    setShowQuickPayModal(true);
  };

  const handleRecordQuickPayment = async (e) => {
    e.preventDefault();
    const cleanOr = payOrNumber.trim();
    if (!cleanOr) {
      addToast('Please enter the Official Receipt (OR) Number from the physical receipt.', 'error');
      return;
    }
    const amountVal = parseFloat(payAmount);
    if (!amountVal || amountVal <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setRecordingPay(true);
    try {
      const res = await api.post(`/students/${selectedStudentForPay.id}/payments`, {
        or_number: cleanOr,
        fee_type: payFeeType,
        amount: amountVal,
        payment_method: payMethod,
        reference_number: payRef || null,
        description: `Payment for ${payFeeType} - ${selectedStudentForPay.full_name}`,
        remarks: payRemarks || null,
        envelope_verified: 1
      });

      if (res.data.anomaly && res.data.anomaly.status === 'Flagged') {
        addToast(
          `⚠️ Anomaly Flagged: ${res.data.anomaly.level} Risk (Score: ${res.data.anomaly.score}). Logged in ML Anomaly Ledger!`,
          'warning'
        );
      } else {
        addToast(res.data.message || 'Payment recorded successfully!', 'success');
      }
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
    } catch {
      addToast('Failed to generate notice letter', 'error');
    }
  };

  const totalDueAll = students.reduce((sum, s) => sum + (s.total_due || 0), 0);
  const totalPaidAll = students.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const totalOutstandingAll = students.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cinzel tracking-tight uppercase">
              Collections &amp; Student Profiles
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-cinzel">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ML Ledger Shield Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organized list of enrolled students by Grade Level with physical OR tracking and Digital Receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!isAdmin && (
            <>
              <button
                onClick={() => { setCsvResult(null); setShowCsvModal(true); }}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Import CSV</span>
              </button>

              <button
                onClick={() => {
                  setNewStudent({
                    student_id: '',
                    full_name: '',
                    grade_level: 'Grade 1',
                    section: resolveSection('Grade 1'),
                    gender: 'Male',
                    parent_name: '',
                    parent_contact: '',
                    parent_email: '',
                    address: 'City of San Jose del Monte, Bulacan'
                  });
                  setShowAddStudentModal(true);
                }}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Student Profile</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Students</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono truncate">
              {students.length}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {selectedGrade === 'All' ? 'Across all grade levels' : `Enrolled in ${selectedGrade}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Total Assessment</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono truncate">
              {formatPeso(totalDueAll)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Assessed for SY 2026-2027</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <PesoSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-between gap-3">
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

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-rose-500 font-cinzel">Outstanding Due</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono truncate">
              {formatPeso(totalOutstandingAll)}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">Unpaid tuition &amp; fees</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 font-cinzel">
            Grade Level:
          </span>
          {GRADE_FILTERS.map((g) => {
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
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

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div className="hidden md:block">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-cinzel font-bold">
                <th className="text-left py-3.5 px-3 w-[23%]">Student &amp; Grade</th>
                <th className="text-left py-3.5 px-2.5 w-[13%]">Student LRN</th>
                <th className="text-left py-3.5 px-2.5 w-[16%]">Parent / Guardian</th>
                <th className="text-right py-3.5 px-2.5 w-[13%]">Paid / Assessed</th>
                <th className="text-right py-3.5 px-2.5 w-[11%]">Balance</th>
                <th className="text-center py-3.5 px-2 w-[10%]">Status</th>
                <th className="text-right py-3.5 px-3 w-[14%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
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
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-700/30 transition group cursor-pointer"
                    onClick={() => navigate(`/collections/${s.id}`)}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-slate-900 border border-brand-200 dark:border-slate-700 flex items-center justify-center font-cinzel font-bold text-brand-700 dark:text-brand-400 text-xs shrink-0">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white uppercase font-sans truncate">
                            {s.full_name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {s.grade_level} • {resolveSection(s.grade_level, s.section)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                      {s.student_id}
                    </td>
                    <td className="py-3 px-2.5 min-w-0">
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{s.parent_name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{s.parent_contact || ''}</p>
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatPeso(s.total_paid)}</p>
                      <p className="text-[10px] text-slate-400">/ {formatPeso(s.total_due)}</p>
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      {formatPeso(s.outstanding_balance)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-cinzel border ${
                          s.payment_status === 'Fully Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                            : s.payment_status === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                        }`}
                      >
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {!isAdmin && (
                          <button
                            onClick={() => openQuickPay(s)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shrink-0"
                            title="Record payment for this student"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}
                        {!isAdmin && (
                          <button
                            onClick={() => handleArchiveStudent(s)}
                            disabled={archivingId === s.id}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded-lg transition cursor-pointer shrink-0 disabled:opacity-50"
                            title="Archive student (records are preserved)"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {s.outstanding_balance > 0 && (
                          <button
                            onClick={() => openNoticeLetter(s.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 rounded-lg transition cursor-pointer shrink-0"
                            title="Generate payment notice letter"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/collections/${s.id}`)}
                          className="p-1 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
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
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No students match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400 font-cinzel">Loading students...</div>
          ) : students.length > 0 ? (
            students.map((s) => (
              <div
                key={`mob-${s.id}`}
                onClick={() => navigate(`/collections/${s.id}`)}
                className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-700/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white uppercase truncate">{s.full_name}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      {s.student_id} • {s.grade_level} ({resolveSection(s.grade_level, s.section)})
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-cinzel border shrink-0 ${
                      s.payment_status === 'Fully Paid'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : s.payment_status === 'Partial'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-rose-50 text-rose-700 border-rose-300'
                    }`}
                  >
                    {s.payment_status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-slate-400">Balance: </span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                      {formatPeso(s.outstanding_balance)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openQuickPay(s)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase font-cinzel"
                    >
                      Record Pay
                    </button>
                    <button
                      onClick={() => handleArchiveStudent(s)}
                      disabled={archivingId === s.id}
                      className="px-2.5 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 rounded-lg text-[10px] font-bold uppercase font-cinzel disabled:opacity-50"
                    >
                      Archive
                    </button>
                    {s.outstanding_balance > 0 && (
                      <button
                        onClick={() => openNoticeLetter(s.id)}
                        className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold uppercase font-cinzel"
                      >
                        Notice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-xs text-slate-400">No students match the current filters.</div>
          )}
        </div>
      </div>

      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                  Add New Student Profile
                </h3>
                <p className="text-xs text-slate-400">
                  Initializes 5 standard CCA fee schedules &amp; LRN-generated Parent password
                </p>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Student ID / LRN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={newStudent.student_id}
                    onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter DepEd LRN (Numbers Only)"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Grade Level
                  </label>
                  <select
                    value={newStudent.grade_level}
                    onChange={(e) => {
                      const grade = e.target.value;
                      setNewStudent({
                        ...newStudent,
                        grade_level: grade,
                        section: resolveSection(grade),
                      });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.last_name}
                    onChange={(e) => setNewStudent({ ...newStudent, last_name: e.target.value })}
                    placeholder="e.g. Santos"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.first_name}
                    onChange={(e) => setNewStudent({ ...newStudent, first_name: e.target.value })}
                    placeholder="e.g. Juan"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.middle_name}
                    onChange={(e) => setNewStudent({ ...newStudent, middle_name: e.target.value })}
                    placeholder="e.g. Reyes"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Section (Auto-Synced)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={resolveSection(newStudent.grade_level)}
                      className="w-full px-3.5 py-2 pr-8 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed outline-none"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Contact Number (11 Digits)
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={newStudent.parent_contact}
                    onChange={(e) => setNewStudent({ ...newStudent, parent_contact: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    placeholder="e.g. 09171234567"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-cinzel flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                    Default Parent Password
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300 px-2 py-0.5 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 rounded-md">
                    {getDefaultStudentPassword(newStudent.last_name)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Default format: First 3 letters of student's last name + <strong>#0000</strong>. Parents can change this upon initial login.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/90 dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide font-cinzel">
                    Standard Fee Assessment
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Account will automatically initialize with the standard <span className="font-bold text-slate-900 dark:text-white">{newStudent.grade_level}</span> fee schedule (Tuition, Registration, Books, Energy &amp; Other Fees).
                  </p>
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
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
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordQuickPayment} className="p-6 space-y-4">
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest block mb-1.5 font-cinzel flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Physical Official Receipt (OR) Number <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={payOrNumber}
                  onChange={(e) => setPayOrNumber(e.target.value)}
                  placeholder="Enter OR # from physical receipt (e.g. OR-2026-00412)"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                  Must match the issued physical Official Receipt booklet number (duplicates prevented).
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block font-cinzel">
                    Fee Category
                  </label>
                  {(() => {
                    const sched = selectedStudentForPay?.fee_schedules?.find(
                      (fs) => (fs.category_name || '').toLowerCase() === (payFeeType || '').toLowerCase()
                    );
                    if (!sched) return null;
                    const bal = Math.max(0, (sched.total_due || 0) - (sched.total_paid || 0));
                    return (
                      <span
                        className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md ${
                          bal === 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        }`}
                      >
                        Remaining: {formatPeso(bal)}
                      </span>
                    );
                  })()}
                </div>
                <select
                  value={payFeeType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setPayFeeType(newType);
                    const sched = selectedStudentForPay?.fee_schedules?.find(
                      (fs) => (fs.category_name || '').toLowerCase() === (newType || '').toLowerCase()
                    );
                    const bal = sched ? Math.max(0, (sched.total_due || 0) - (sched.total_paid || 0)) : 0;
                    if (newType === 'Tuition Fee') setPayAmount(bal > 0 ? (bal < 1906 ? bal.toFixed(2) : '1906.00') : '0.00');
                    else if (newType === 'Energy Fee') setPayAmount(bal > 0 ? (bal < 300 ? bal.toFixed(2) : '300.00') : '0.00');
                    else setPayAmount(bal > 0 ? bal.toFixed(2) : '0.00');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-white outline-none"
                >
                  <option value="Tuition Fee">Tuition Fee (Monthly ₱1,906 / Annual ₱19,060)</option>
                  <option value="Registration Fee">Registration Fee (Annual ₱5,700)</option>
                  <option value="Books">Books &amp; Materials (₱6,900)</option>
                  <option value="Energy Fee">Energy Fee (Monthly ₱300 / Annual ₱3,000)</option>
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

                {(() => {
                  const sched = selectedStudentForPay?.fee_schedules?.find(
                    (fs) => (fs.category_name || '').toLowerCase() === (payFeeType || '').toLowerCase()
                  );
                  if (!sched) return null;
                  const bal = Math.max(0, (sched.total_due || 0) - (sched.total_paid || 0));
                  const amt = parseFloat(payAmount) || 0;

                  if (bal === 0 && amt > 0) {
                    return (
                      <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold font-cinzel text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 animate-pulse" />
                          <span>ML Alert: Account Already Fully Paid</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Student has <strong>₱0.00</strong> outstanding balance for <strong>{payFeeType}</strong>. Recording payment of{' '}
                          <strong>{formatPeso(amt)}</strong> will be flagged as an invalid excess collection anomaly.
                        </p>
                      </div>
                    );
                  }

                  if (bal > 0 && amt > bal) {
                    const overpay = amt - bal;
                    const pct = ((overpay / bal) * 100).toFixed(1);
                    return (
                      <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold font-cinzel text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 animate-pulse" />
                          <span>ML Alert: Critical Overpayment Detected</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Entered amount of <strong>{formatPeso(amt)}</strong> exceeds student&apos;s remaining balance of{' '}
                          <strong>{formatPeso(bal)}</strong> by <strong>{formatPeso(overpay)}</strong> (+{pct}%).
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
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
                    Ref # / Check #
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
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {recordingPay ? 'Saving...' : 'Save & View Digital Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReceipt && (
        <OfficialReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {noticeLetterData && (
        <PaymentNoticeLetterModal
          letterData={noticeLetterData}
          onClose={() => setNoticeLetterData(null)}
        />
      )}

      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-950/60 rounded-xl text-brand-600 dark:text-brand-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">
                    Import Enrolled Students (CSV)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sync registrar student roster, grade-level fees &amp; initial LRN passwords
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportCsv} className="space-y-4 pt-4">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-white">Registrar Sync Format:</p>
                <p>
                  1. Required: <code>student_id</code> (LRN), <code>full_name</code>, <code>grade_level</code>.
                  Use <code>Last, First, Middle</code> for names (e.g. <code>Lopez, Ana, Patricia</code>). Section auto-syncs by grade level.
                </p>
                <p>
                  2. Each newly imported student automatically receives all 5 CCA fee schedules and a unique LRN-generated initial password for Parent Portal login.
                </p>
                <p>
                  3. Duplicates in the CSV or already in the system are detected before upload. You can cancel or continue while skipping duplicate rows. Keep LRNs as Text in Excel.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample Template (.CSV)</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Choose CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
              </div>

              {csvResult && csvResult.imported_students?.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 font-cinzel uppercase">
                    Generated Initial Parent LRN Credentials ({csvResult.imported_students.length})
                  </p>
                  <div className="max-h-36 overflow-y-auto divide-y divide-emerald-200/60 dark:divide-emerald-800/50">
                    {csvResult.imported_students.map((st, i) => (
                      <div key={i} className="py-1 flex justify-between font-mono text-[11px]">
                        <span className="text-slate-700 dark:text-slate-200 truncate pr-2">
                          {st.student_id} ({st.full_name})
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {st.initial_password}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowCsvModal(false); setCsvFile(null); setCsvResult(null); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importingCsv || checkingCsv}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{checkingCsv ? 'Checking Duplicates...' : importingCsv ? 'Importing Records...' : 'Upload & Sync'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={confirmArchiveStudent}
        title="Archive Student"
        message={
          archiveTarget
            ? `Archive ${archiveTarget.full_name}? They will be hidden from active collections, but their balance, fee schedules, and receipts will be kept.`
            : ''
        }
        confirmLabel="Archive Student"
        tone="archive"
        Icon={Archive}
        busy={Boolean(archiveTarget) && archivingId === archiveTarget.id}
      />

      {showDuplicateModal && duplicateCheck && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                    Duplicate data detected
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {duplicateCheck.duplicate_count} duplicate row(s) found out of {duplicateCheck.total_rows}.
                    You can cancel, or continue and skip the duplicate rows.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowDuplicateModal(false); setDuplicateCheck(null); setCsvFile(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
                aria-label="Close duplicate notice"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 font-cinzel">
                    Rows to import
                  </p>
                  <p className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-200">
                    {duplicateCheck.unique_count}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300 font-cinzel">
                    Rows to skip
                  </p>
                  <p className="text-xl font-black font-mono text-amber-800 dark:text-amber-200">
                    {duplicateCheck.duplicate_count}
                  </p>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {duplicateCheck.duplicates.map((dup, idx) => (
                  <div key={`${dup.row}-${idx}`} className="p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-800 dark:text-white truncate">
                        Row {dup.row}: {dup.full_name || 'Unnamed student'}
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-cinzel border shrink-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                        {dup.type === 'existing_system' ? 'Already in system' : 'Repeated in CSV'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {dup.student_id || 'No LRN'} • {dup.grade_level}
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">{dup.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowDuplicateModal(false); setDuplicateCheck(null); setCsvFile(null); }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel Upload
              </button>
              <button
                type="button"
                disabled={importingCsv}
                onClick={() => runCsvImport(true)}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importingCsv ? 'Importing Records...' : 'Skip Duplicates & Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
