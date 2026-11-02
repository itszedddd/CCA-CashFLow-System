import { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  RefreshCw, Search, Filter, Info, Eye, Check, X,
  FileCheck, ArrowRight, Sparkles, TrendingUp, Cpu, FileText
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function AnomalyDetection() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [filterLevel, setFilterLevel] = useState('All'); // 'All' | 'High' | 'Medium' | 'Low'
  const [filterStatus, setFilterStatus] = useState('All'); // 'All' | 'Flagged' | 'Verified_Cleared'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [cashierNotes, setCashierNotes] = useState('');
  const addToast = useToast();

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterLevel, filterStatus, search, page]);

  const fetchSummary = async () => {
    try {
      const res = await api.get('/ai/anomaly/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load anomaly summary', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * 15,
        limit: 15,
      };
      if (filterLevel !== 'All') params.level = filterLevel;
      if (filterStatus !== 'All') params.status = filterStatus;
      if (search) params.search = search;

      const res = await api.get('/ai/anomaly/transactions', { params });
      setTransactions(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const res = await api.post('/ai/anomaly/scan-all');
      setSummary(res.data);
      addToast(`ML Anomaly Scan finished. Scanned ${res.data.total_analyzed} transactions!`, 'success');
      fetchTransactions();
    } catch (err) {
      addToast('Failed to execute ML anomaly scan', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (incomeId, action) => {
    try {
      await api.put(`/ai/anomaly/resolve/${incomeId}`, {
        action,
        cashier_notes: cashierNotes || 'Verified and confirmed against source records by Cashier',
      });
      addToast(
        action === 'verify_clear'
          ? 'Transaction verified & marked as Cleared'
          : 'Transaction flagged for manual correction',
        'info'
      );
      setSelectedTx(null);
      setCashierNotes('');
      fetchTransactions();
      fetchSummary();
    } catch (err) {
      addToast('Failed to update resolution status', 'error');
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
      fetchTransactions();
    } catch (err) {
      addToast('Failed to update envelope status', 'error');
    }
  };

  const getBadgeForLevel = (level, score) => {
    switch (level) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Critical ({score})
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Moderate ({score})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Healthy ({score})
          </span>
        );
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-cinzel">
                Proposed Feature #6 • Machine Learning Intelligence
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
                ML-Based Anomaly Detection & Verification
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Detect unusual payment spikes, cross-category misclassifications, and student envelope discrepancies.
            Supports CCA's objective to eliminate the 2–3 monthly recording errors and reduce revenue loss to 0%.
          </p>
        </div>

        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Running ML Model...' : 'Re-scan All Records'}
        </button>
      </div>

      {/* 4 Overview Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ledger Health Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
              Ledger Health Index
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="my-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white">
              {summary ? `${summary.health_score}%` : '—'}
            </h3>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              {summary ? `${summary.healthy_count} of ${summary.total_analyzed} normal` : 'Analyzing records...'}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${summary ? summary.health_score : 0}%` }}
            />
          </div>
        </div>

        {/* Critical High Risk Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
              High Risk Anomalies
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="my-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {summary ? summary.high_count : '—'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Score 70–100 • Critical verification needed
            </p>
          </div>
          <span className="text-[10px] text-rose-500 font-semibold">Priority Review</span>
        </div>

        {/* Moderate Verification Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
              Moderate Variations
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="my-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary ? summary.moderate_count : '—'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Score 40–69 • Partial payments & timing
            </p>
          </div>
          <span className="text-[10px] text-amber-500 font-semibold">Verification Recommended</span>
        </div>

        {/* Manuscript Objective Target Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
              Target Objective Goal
            </span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="my-1">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-600 dark:text-brand-400">
              0.0%
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Target recording errors & monthly revenue loss
            </p>
          </div>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Manuscript Alignment</span>
        </div>
      </div>

      {/* 3-Level Anomaly Threshold Scale Guide */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider font-cinzel">
              3-Level Anomaly Scoring Thresholds (System Standard)
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            Model: Scikit-Learn IsolationForest + Deterministic Rule Heuristics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-emerald-400 uppercase tracking-wider font-cinzel">
                Level 1: Healthy / Normal
              </span>
              <span className="font-mono font-bold text-emerald-300">0 – 39</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Standard payments that match CCA official fee brackets (e.g. ₱5,700 registration, ₱1,906 monthly tuition). No cashier intervention required.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-amber-400 uppercase tracking-wider font-cinzel">
                Level 2: Moderate Risk
              </span>
              <span className="font-mono font-bold text-amber-300">40 – 69</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Unusual installment amounts, partial payments without remaining balance log, or payment date variances. Cashier should check student brown envelope.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-rose-400 uppercase tracking-wider font-cinzel">
                Level 3: Critical Anomaly
              </span>
              <span className="font-mono font-bold text-rose-300">70 – 100</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Drastic overpayment amounts, possible fee misclassification (e.g. tuition entered under energy fee), or repeated void adjustments.
            </p>
          </div>
        </div>
      </div>

      {/* Generative AI Insights Panel */}
      {summary?.generative_insights && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase font-cinzel tracking-wider">
              Generative AI Financial Insights & Actionable Directives
            </h3>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {summary.generative_insights.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider font-cinzel text-slate-500 dark:text-slate-400 block mb-2">
                Identified Pattern Findings
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {summary.generative_insights.key_findings.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-[11px] font-bold uppercase tracking-wider font-cinzel text-indigo-700 dark:text-indigo-300 block mb-2">
                Cashier Recommended Actions
              </span>
              <ul className="space-y-1.5 text-xs text-indigo-900 dark:text-indigo-200">
                {summary.generative_insights.cashier_action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs">
            {['All', 'High', 'Medium', 'Low'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setFilterLevel(lvl);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterLevel === lvl
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {lvl === 'All' ? 'All Risks' : `${lvl} Risk`}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs">
            {[
              { id: 'All', label: 'All Status' },
              { id: 'Flagged', label: 'Flagged Only' },
              { id: 'Verified_Cleared', label: 'Cleared' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => {
                  setFilterStatus(st.id);
                  setPage(0);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterStatus === st.id
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search student, OR#, particulars..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Flagged Transactions Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-cinzel uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Scanned Collection Ledger
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              ({total} Total Records)
            </span>
          </div>
          <span className="text-[10px] uppercase font-cinzel font-bold text-slate-400">
            Sorted by Anomaly Score
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 text-[11px] font-bold font-cinzel text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">OR # & Date</th>
                <th className="py-3 px-4">Student / Payer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Expected Fee</th>
                <th className="py-3 px-4 text-center">Envelope Status</th>
                <th className="py-3 px-4 text-center">3-Level Risk</th>
                <th className="py-3 px-4 text-center">Resolution</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Evaluating transactions with ML model...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No transactions found matching criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors ${
                      tx.anomaly_level === 'High' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      <div>{tx.or_number || '—'}</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        {new Date(tx.date_recorded).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {tx.payer_name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        {tx.description}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {tx.category_name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-bold font-mono text-slate-800 dark:text-white">
                      {formatPeso(tx.amount)}
                      {tx.is_partial === 1 && (
                        <span className="block text-[9px] text-amber-500 font-sans font-semibold">
                          Partial (Bal: {formatPeso(tx.remaining_balance)})
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      {tx.expected_amount ? formatPeso(tx.expected_amount) : '—'}
                    </td>

                    {/* Physical Envelope Verification Check */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleEnvelope(tx.id, tx.envelope_verified)}
                        title="Click to toggle Brown Envelope physical verification"
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          tx.envelope_verified === 1
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-emerald-50'
                        }`}
                      >
                        <FileCheck className="w-3 h-3" />
                        {tx.envelope_verified === 1 ? 'Verified in Envelope' : 'Pending Check'}
                      </button>
                    </td>

                    {/* 3-Level Risk Badge */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getBadgeForLevel(tx.anomaly_level, tx.anomaly_score)}
                    </td>

                    {/* Resolution Status */}
                    <td className="py-3 px-4 text-center">
                      {tx.anomaly_status === 'Verified_Cleared' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Cleared
                        </span>
                      ) : tx.anomaly_status === 'Pending_Correction' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md">
                          For Correction
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {tx.anomaly_level === 'Low' ? 'Normal' : 'Pending Review'}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedTx(tx);
                          setCashierNotes(tx.cashier_notes || '');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Details
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed AI Anomaly Review Modal */}
      {selectedTx && (
        <Modal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          title={`AI Anomaly Diagnostics • ${selectedTx.or_number || 'Transaction'}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Transaction Overview Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Student</span>
                <span className="font-bold text-slate-800 dark:text-white">{selectedTx.payer_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Category</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedTx.category_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount Paid</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatPeso(selectedTx.amount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Fee</span>
                <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                  {selectedTx.expected_amount ? formatPeso(selectedTx.expected_amount) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Score & Risk Level Meter */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase font-cinzel text-indigo-900 dark:text-indigo-200">
                    Anomaly Score: {selectedTx.anomaly_score} / 100
                  </span>
                  {getBadgeForLevel(selectedTx.anomaly_level, selectedTx.anomaly_score)}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Threshold: {selectedTx.anomaly_level === 'High' ? 'Critical (70–100)' : selectedTx.anomaly_level === 'Medium' ? 'Moderate (40–69)' : 'Healthy (0–39)'}
                </p>
              </div>

              <div className="w-full sm:w-48 bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedTx.anomaly_level === 'High'
                      ? 'bg-rose-500'
                      : selectedTx.anomaly_level === 'Medium'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${selectedTx.anomaly_score}%` }}
                />
              </div>
            </div>

            {/* Why was this flagged? (Root Cause Insights) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider font-cinzel text-slate-600 dark:text-slate-300 block mb-2">
                Why was this flagged by the ML Model?
              </span>
              <div className="space-y-2">
                {selectedTx.reasons && selectedTx.reasons.length > 0 ? (
                  selectedTx.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{r}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No specific anomalies detected.</p>
                )}
              </div>
            </div>

            {/* Cashier Verification Guide */}
            {selectedTx.recommendations && selectedTx.recommendations.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider font-cinzel text-indigo-600 dark:text-indigo-400 block mb-2">
                  Actionable Cashier Verification Steps
                </span>
                <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  {selectedTx.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-indigo-950 dark:text-indigo-200">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cashier Verification Notes Input */}
            <div className="space-y-1 pt-2">
              <label className="text-[11px] font-bold uppercase font-cinzel tracking-wider text-slate-500">
                Cashier Review Notes / Physical Envelope Verification Log
              </label>
              <textarea
                rows={2}
                value={cashierNotes}
                onChange={(e) => setCashierNotes(e.target.value)}
                placeholder="e.g. Cross-checked with student brown envelope. Payment verified for 2 months advance tuition."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleEnvelope(selectedTx.id, selectedTx.envelope_verified)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <FileCheck className="w-4 h-4 text-emerald-600" />
                {selectedTx.envelope_verified === 1 ? 'Mark Envelope Unchecked' : 'Verify in Envelope'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResolve(selectedTx.id, 'mark_correction')}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/40 font-semibold transition"
                >
                  Flag for Correction
                </button>
                <button
                  type="button"
                  onClick={() => handleResolve(selectedTx.id, 'verify_clear')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition font-cinzel uppercase tracking-wider"
                >
                  Verify & Clear
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
