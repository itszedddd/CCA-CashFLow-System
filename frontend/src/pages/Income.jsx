import { useState, useEffect } from 'react';
import {
  Plus, Search, TrendingUp, Receipt, X, Trash2,
  Printer, ArrowLeft, ArrowRight, Filter, AlertTriangle,
  CheckCircle2, ShieldAlert, FileCheck, Info, Sparkles,
  Upload, Download, FileSpreadsheet, Loader2
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// CCA Official Fee Standards for SY 2026-2027
const CCA_FEES = {
    'Registration & Misc Fees': 5700.0,
    'Tuition Fees': {
        'Kindergarten': 1606.0,
        'Grade 1-6': 1701.0,
        'Grade 7-10': 1906.0,
        'Default': 1906.0
    },
    'Books & Materials': {
        'Kindergarten': 5500.0,
        'Grade 1-6': 6900.0,
        'Grade 7-10': 9200.0,
        'Default': 6900.0
    },
    'Energy Fees': {
        'Kindergarten': 150.0,
        'Grade 1-6': 300.0,
        'Grade 7-10': 300.0,
        'Default': 300.0
    },
    'Swimming Class Fees': 1200.0,
    'Events & Activities': 1000.0,
    'Other Income': 500.0
};

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [page, setPage] = useState(0);
  const addToast = useToast();

  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    or_number: '',
    payer_name: '',
    payer_type: 'Student',
    grade_level: 'Grade 7-10',
    payment_method: 'Cash',
    reference_number: '',
    remarks: '',
  });

  // Feature #2 State: Automated Validation
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [validationState, setValidationState] = useState({
    isHigher: false,
    isLower: false,
    isExact: false,
    remainingBalance: 0,
    warningMsg: '',
  });

  // Feature #6 Real-time Anomaly Pre-Score State
  const [liveAnomaly, setLiveAnomaly] = useState(null);

  // CSV Import State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [search, filterCat, page]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/income/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const params = { skip: page * 15, limit: 15, school_year: '2026-2027' };
      if (search) params.search = search;
      if (filterCat) params.category_id = filterCat;
      const res = await api.get('/income/', { params });
      setIncomes(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update expected amount dynamically when category or grade level changes
  useEffect(() => {
    const selectedCat = categories.find((c) => c.id === parseInt(form.category_id));
    if (!selectedCat) {
      setExpectedAmount(0);
      return;
    }

    const catName = selectedCat.name;
    let fee = selectedCat.expected_amount || 0;

    if (CCA_FEES[catName]) {
      if (typeof CCA_FEES[catName] === 'object') {
        fee = CCA_FEES[catName][form.grade_level] || CCA_FEES[catName]['Default'] || 1906.0;
      } else {
        fee = CCA_FEES[catName];
      }
    }

    setExpectedAmount(fee);
  }, [form.category_id, form.grade_level, categories]);

  // Feature #2 Validation Engine & Live Anomaly Pre-check
  useEffect(() => {
    const entered = parseFloat(form.amount) || 0;
    if (entered <= 0 || expectedAmount <= 0) {
      setValidationState({
        isHigher: false,
        isLower: false,
        isExact: false,
        remainingBalance: 0,
        warningMsg: '',
      });
      setLiveAnomaly(null);
      return;
    }

    if (entered > expectedAmount) {
      setValidationState({
        isHigher: true,
        isLower: false,
        isExact: false,
        remainingBalance: 0,
        warningMsg: `Cannot process: Entered amount (₱${entered.toLocaleString()}) exceeds desired fee (₱${expectedAmount.toLocaleString()}). This action is blocked to prevent category misclassification.`,
      });
      setLiveAnomaly({
        level: 'High',
        score: 85.0,
        message: 'High Anomaly: Payment exceeds official category fee benchmark.',
      });
    } else if (entered < expectedAmount) {
      const remaining = expectedAmount - entered;
      setValidationState({
        isHigher: false,
        isLower: true,
        isExact: false,
        remainingBalance: remaining,
        warningMsg: `Action will process: Automatically flagged as PARTIALLY PAID. Remaining Balance is ₱${remaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
      });
      setLiveAnomaly({
        level: 'Medium',
        score: 48.0,
        message: 'Moderate Risk: Partial payment flagged. Verification with student envelope required.',
      });
    } else {
      setValidationState({
        isHigher: false,
        isLower: false,
        isExact: true,
        remainingBalance: 0,
        warningMsg: 'Full payment amount matches official fee schedule.',
      });
      setLiveAnomaly({
        level: 'Low',
        score: 12.0,
        message: 'Healthy: Standard payment aligned with established CCA benchmarks.',
      });
    }
  }, [form.amount, expectedAmount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validationState.isHigher) {
      addToast('Cannot save: Entered amount exceeds the expected fee.', 'error');
      return;
    }

    try {
      const payload = {
        ...form,
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
        expected_amount: expectedAmount,
        is_partial: validationState.isLower ? 1 : 0,
        remaining_balance: validationState.remainingBalance,
      };

      const res = await api.post('/income/', payload);
      addToast(
        validationState.isLower
          ? `Partially paid recorded! Remaining balance: ${formatPeso(validationState.remainingBalance)}`
          : 'Collection recorded successfully!',
        'success'
      );
      setShowModal(false);
      resetForm();
      fetchIncomes();
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to record collection', 'error');
    }
  };

  const handleVoid = async (id, desc) => {
    if (!window.confirm(`Are you sure you want to void income record "${desc}"?`)) return;
    try {
      await api.delete(`/income/${id}`);
      addToast('Income record has been voided', 'info');
      fetchIncomes();
      fetchCategories();
    } catch (err) {
      addToast('Failed to void income record', 'error');
    }
  };

  const handleToggleEnvelope = async (incomeId, currentStatus) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      await api.put(`/ai/anomaly/envelope-verify/${incomeId}`, {
        status: nextStatus,
        cashier_notes: nextStatus === 1 ? 'Verified in student brown envelope' : 'Marked pending envelope check',
      });
      addToast(
        nextStatus === 1
          ? 'Physical record verified in Student Brown Envelope'
          : 'Envelope status set to Pending',
        'success'
      );
      fetchIncomes();
    } catch (err) {
      addToast('Failed to update envelope status', 'error');
    }
  };

  const resetForm = () => {
    const defaultCat = categories[0]?.id?.toString() || '';
    setForm({
      category_id: defaultCat,
      amount: '',
      description: '',
      or_number: `OR-${Math.floor(100000 + Math.random() * 900000)}`,
      payer_name: '',
      payer_type: 'Student',
      grade_level: 'Grade 7-10',
      payment_method: 'Cash',
      reference_number: '',
      remarks: '',
    });
    setLiveAnomaly(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / 15);

  // CSV Import Handlers
  const handleCsvFileSelect = (file) => {
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    // Parse preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        addToast('CSV file appears empty or has no data rows.', 'error');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const preview = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        const vals = lines[i].match(/(?:"[^"]*"|[^,])*/g) || [];
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = (vals[idx] || '').trim().replace(/^"|"$/g, '');
        });
        preview.push(row);
      }
      setCsvPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleCsvDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleCsvFileSelect(file);
    } else {
      addToast('Please drop a .csv file.', 'error');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      const res = await api.post('/income/import-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvResult(res.data);
      if (res.data.imported_count > 0) {
        addToast(`Successfully imported ${res.data.imported_count} transactions totaling ₱${Number(res.data.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 'success');
        fetchIncomes();
      }
      if (res.data.error_count > 0) {
        addToast(`${res.data.error_count} rows had errors and were skipped.`, 'warning');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'CSV import failed. Please check file format.';
      addToast(msg, 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/income/csv-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'CCA_Payment_Import_Template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Template downloaded!', 'success');
    } catch {
      addToast('Failed to download template.', 'error');
    }
  };

  const resetCsvModal = () => {
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvPreview([]);
    setCsvResult(null);
    setDragActive(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-cinzel">
              CCA Cashier Portal • Standard Operating Procedures
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Tuition & Revenue Collections
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record student payments with automated validation, brown envelope tracking, and instant ML anomaly scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Import CSV
          </button>
          <button
            onClick={openNewModal}
            className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search OR#, student name, details..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          <div className="w-52">
            <select
              value={filterCat}
              onChange={(e) => {
                setFilterCat(e.target.value);
                setPage(0);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.expected_amount > 0 ? `(₱${c.expected_amount.toLocaleString()})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-cinzel">
          {total} Verified Entries
        </div>
      </div>

      {/* Collection Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold font-cinzel text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">OR Number</th>
                <th className="py-3 px-4">Student / Payer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Expected Fee</th>
                <th className="py-3 px-4 text-center">Envelope Status</th>
                <th className="py-3 px-4 text-center">ML Risk</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading income records...
                  </td>
                </tr>
              ) : incomes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No income records found matching criteria.
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-700 dark:text-brand-300">
                      <div>{inc.or_number || '—'}</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        {new Date(inc.date_recorded).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {inc.payer_name || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-slate-400">{inc.description}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-100 dark:border-brand-800">
                        {inc.category_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-mono">
                      +{formatPeso(inc.amount)}
                      {inc.is_partial === 1 && (
                        <span className="block text-[9px] text-amber-500 font-sans font-semibold">
                          Partial (Bal: {formatPeso(inc.remaining_balance)})
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-400 whitespace-nowrap">
                      {inc.expected_amount ? formatPeso(inc.expected_amount) : '—'}
                    </td>

                    {/* Brown Envelope Physical Verification (Objective 3) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleEnvelope(inc.id, inc.envelope_verified)}
                        title="Click to toggle verification against Student Brown Envelope"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          inc.envelope_verified === 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-emerald-50'
                        }`}
                      >
                        <FileCheck className="w-3 h-3" />
                        {inc.envelope_verified === 1 ? 'In Envelope' : 'Pending'}
                      </button>
                    </td>

                    {/* ML Anomaly Level Badge (Feature #6) */}
                    <td className="py-3 px-4 text-center">
                      {inc.anomaly_level === 'High' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          Critical ({inc.anomaly_score})
                        </span>
                      ) : inc.anomaly_level === 'Medium' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Moderate ({inc.anomaly_score})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Healthy ({inc.anomaly_score})
                        </span>
                      )}
                    </td>

                    {/* View Official Receipt */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedReceipt(inc)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="View Official Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Void */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleVoid(inc.id, inc.description)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Void record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Income Modal - With Feature #2 Validation & Feature #6 Anomaly Pre-Score */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record New Payment Collection" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Dropdown List Combo Box */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Fee Category (Drop Down List Combo Box) *
              </label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Level Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Grade Level
              </label>
              <select
                value={form.grade_level}
                onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Kindergarten">Kindergarten</option>
                <option value="Grade 1-6">Grade 1 to 6</option>
                <option value="Grade 7-10">Grade 7 to 10</option>
              </select>
            </div>
          </div>

          {/* Amount to Pay (TEXT ONLY - non-editable display) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider font-cinzel text-indigo-700 dark:text-indigo-300 block">
                Official Amount to Pay (Standard Fee)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Determined by CCA official fee schedule
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold font-mono text-indigo-900 dark:text-indigo-200">
                {expectedAmount > 0 ? formatPeso(expectedAmount) : '—'}
              </span>
              <span className="block text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                Text Only / Non-editable
              </span>
            </div>
          </div>

          {/* Enter Amount Field */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Enter Amount (PHP) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className={`w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-slate-800 dark:text-white focus:ring-2 outline-none font-semibold text-sm ${
                validationState.isHigher
                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                  : validationState.isLower
                  ? 'border-amber-400 focus:ring-amber-500'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
              }`}
            />
          </div>

          {/* Feature #2 Validation Feedback Messages */}
          {validationState.isHigher && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Error Prevention: Action Blocked</p>
                <p className="text-[10px] leading-relaxed mt-0.5">{validationState.warningMsg}</p>
              </div>
            </div>
          )}

          {validationState.isLower && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Partial Payment Flagged</p>
                <p className="text-[10px] leading-relaxed mt-0.5">{validationState.warningMsg}</p>
              </div>
            </div>
          )}

          {/* Feature #6 Live ML Anomaly Pre-Score Indicator */}
          {liveAnomaly && (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold uppercase font-cinzel text-slate-600 dark:text-slate-300">
                  ML Outlier Pre-Score:
                </span>
                <span className="font-mono font-bold text-xs">
                  {liveAnomaly.score} / 100
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  liveAnomaly.level === 'High'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                    : liveAnomaly.level === 'Medium'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}
              >
                {liveAnomaly.level} Risk
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Official Receipt (OR) #
              </label>
              <input
                type="text"
                value={form.or_number}
                onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                placeholder="OR-123456"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Student / Payer Name *
              </label>
              <input
                type="text"
                required
                value={form.payer_name}
                onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                placeholder="Full student or parent name"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Payment Channel
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (BDO/BPI)</option>
                <option value="GCash">GCash</option>
                <option value="Check">Check</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Reference Number (Optional)
              </label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="Check # or Bank Reference"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Description / Particulars *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. October Tuition Fee - Grade 10 St. Jude"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={validationState.isHigher}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold transition shadow-sm font-cinzel uppercase tracking-wider cursor-pointer"
            >
              Process & Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Receipt (OR) Preview Modal - Objective 4 Accuracy */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title="Official Receipt Voucher (Parent Record)"
          maxWidth="max-w-lg"
        >
          <div className="printable-area bg-white p-6 rounded-2xl border border-slate-200 text-slate-800">
            {/* CCA School Header */}
            <div className="text-center pb-4 border-b border-slate-200 mb-4">
              <div className="flex justify-center mb-2">
                <img
                  src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                  alt="CCA Logo"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    e.target.src = '/cca-logo-full.png';
                  }}
                />
              </div>
              <h3 className="text-sm font-extrabold font-cinzel uppercase tracking-wider text-brand-900">
                Calvary Christian Academy
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Official Collection & Revenue Receipt • Cashier Copy
              </p>
            </div>

            {/* Receipt Details */}
            <div className="flex justify-between items-center text-xs mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Issued</span>
                <span className="font-semibold">
                  {new Date(selectedReceipt.date_recorded).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Receipt #</span>
                <span className="font-mono font-bold text-brand-700 text-sm">
                  {selectedReceipt.or_number || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs py-3 border-y border-slate-100 my-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Student / Payer:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.payer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Category:</span>
                <span className="font-semibold text-brand-700">{selectedReceipt.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Particulars:</span>
                <span className="font-medium text-slate-800 text-right max-w-xs">
                  {selectedReceipt.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Total:</span>
                <span className="font-mono font-medium text-slate-700">
                  {selectedReceipt.expected_amount ? formatPeso(selectedReceipt.expected_amount) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.payment_method}</span>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-3 bg-emerald-50 rounded-xl my-4 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase font-cinzel text-emerald-900 tracking-wider">
                  Total Amount Paid
                </span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {formatPeso(selectedReceipt.amount)}
                </span>
              </div>
              {selectedReceipt.is_partial === 1 && (
                <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60 text-xs text-amber-800">
                  <span className="font-semibold uppercase text-[10px]">Remaining Balance Due:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {formatPeso(selectedReceipt.remaining_balance)}
                  </span>
                </div>
              )}
            </div>

            {/* Cashier Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between text-center text-[10px]">
              <div>
                <p className="font-bold text-slate-800 mb-0.5">Maria Santos</p>
                <div className="w-32 border-b border-slate-400 mb-1 mx-auto" />
                <span className="text-slate-500 uppercase">Received By (Cashier)</span>
              </div>
              <div>
                <div className="w-32 border-b border-slate-400 mb-1 mx-auto" />
                <span className="text-slate-500 uppercase">Parent / Student Signature</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
      {/* CSV Import Modal */}
      <Modal isOpen={showCsvModal} onClose={resetCsvModal} title="Import Transactions from CSV / Excel" maxWidth="max-w-2xl">
        <div className="space-y-4 text-xs">
          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <div>
                <p className="font-bold text-blue-900 dark:text-blue-200 text-[11px]">Need a template?</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">Download our pre-formatted CSV with correct column headers</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Download className="w-3 h-3" /> Download Template
            </button>
          </div>

          {/* Drag & Drop Zone */}
          {!csvFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleCsvDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => document.getElementById('csv-file-input').click()}
            >
              <Upload className={`w-8 h-8 mx-auto mb-3 ${dragActive ? 'text-emerald-500' : 'text-slate-400'}`} />
              <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-slate-400 text-[10px]">
                or click to browse • Accepts .csv files exported from Excel
              </p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleCsvFileSelect(e.target.files[0])}
              />
            </div>
          )}

          {/* Selected File Info */}
          {csvFile && !csvResult && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">{csvFile.name}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    {(csvFile.size / 1024).toFixed(1)} KB • {csvPreview.length} data rows detected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setCsvFile(null); setCsvPreview([]); }}
                className="text-slate-400 hover:text-rose-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Preview Table */}
          {csvPreview.length > 0 && !csvResult && (
            <div className="overflow-x-auto max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                    {Object.keys(csvPreview[0]).map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                      {Object.values(row).map((val, vIdx) => (
                        <td key={vIdx} className="px-2 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Upload Button */}
          {csvFile && !csvResult && (
            <button
              type="button"
              onClick={handleCsvUpload}
              disabled={csvImporting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
            >
              {csvImporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing & Scoring Transactions...</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload & Record {csvPreview.length} Transactions</>
              )}
            </button>
          )}

          {/* Import Results */}
          {csvResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{csvResult.imported_count}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Imported</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                  <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">{formatPeso(csvResult.total_amount)}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total Amount</p>
                </div>
                <div className={`p-3 rounded-xl text-center border ${csvResult.error_count > 0 ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                  <p className={`text-lg font-extrabold ${csvResult.error_count > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400'}`}>{csvResult.error_count}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Errors</p>
                </div>
              </div>

              {/* Imported rows summary */}
              {csvResult.imported?.length > 0 && (
                <div className="overflow-x-auto max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-[10px]">
                    <thead className="bg-emerald-50 dark:bg-emerald-950/40 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-bold text-emerald-700 uppercase">Student</th>
                        <th className="px-2 py-1.5 text-left font-bold text-emerald-700 uppercase">Category</th>
                        <th className="px-2 py-1.5 text-right font-bold text-emerald-700 uppercase">Amount</th>
                        <th className="px-2 py-1.5 text-center font-bold text-emerald-700 uppercase">Anomaly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvResult.imported.map((r, idx) => (
                        <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
                          <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300">{r.student}</td>
                          <td className="px-2 py-1.5 text-slate-500">{r.category}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold">{formatPeso(r.amount)}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              r.anomaly_level === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                              r.anomaly_level === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                              {r.anomaly_level} ({r.anomaly_score})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Error rows */}
              {csvResult.errors?.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <p className="font-bold text-rose-700 dark:text-rose-300 text-[11px] mb-1">Skipped Rows:</p>
                  {csvResult.errors.map((err, idx) => (
                    <p key={idx} className="text-[10px] text-rose-600 dark:text-rose-400">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={resetCsvModal}
                className="w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
