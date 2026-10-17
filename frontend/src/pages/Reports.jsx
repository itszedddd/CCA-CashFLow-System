import { useState, useEffect } from 'react';
import {
  FileBarChart, Printer, Calendar, Download,
  TrendingUp, TrendingDown, DollarSign, CheckCircle2,
  Filter, Layers, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api from '../api';
import { StatCard } from './Dashboard';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('cashflow'); // 'cashflow' | 'budget' | 'disbursement'
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const user = JSON.parse(localStorage.getItem('cca_cf_user') || '{}');

  useEffect(() => {
    fetchReportData();
  }, [schoolYear]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [statsRes, budgetsRes] = await Promise.all([
        api.get('/dashboard/stats', { params: { school_year: schoolYear } }),
        api.get('/dashboard/budgets', { params: { school_year: schoolYear } }),
      ]);
      setStats(statsRes.data);
      setBudgets(budgetsRes.data);
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Generating Financial Statements...</p>
        </div>
      </div>
    );
  }

  const isNetPositive = stats?.net_cashflow >= 0;

  return (
    <div className="space-y-6">
      {/* Top Controls - Hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Financial Statements & Formal Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-ready cashflow statements, budget variance analysis, and executive accounting reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Statement
          </button>
        </div>
      </div>

      {/* Report Type Selector & Filter Bar - Hidden on print */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors print:hidden">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {[
            { id: 'cashflow', label: 'Cashflow Statement' },
            { id: 'budget', label: 'Budget Variance' },
            { id: 'disbursement', label: 'Disbursement Register' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-cinzel tracking-wider uppercase transition ${
                reportType === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-400">School Year:</span>
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="py-1.5 px-3 text-xs font-semibold bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
          >
            <option value="2026-2027">SY 2026-2027</option>
            <option value="2025-2026">SY 2025-2026</option>
          </select>
        </div>
      </div>

      {/* Formal Printable Document Area */}
      <div className="printable-area bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
        {/* Formal School Header */}
        <div className="text-center pb-6 border-b-2 border-slate-200 dark:border-slate-700 mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
              alt="CCA Logo"
              className="h-20 w-auto object-contain dark:hidden"
              onError={(e) => {
                e.target.src = '/cca-logo-full.png';
              }}
            />
            <img
              src="/assets/[CCA L3.1] CCA EduSys Logo V2 White Transparent.png"
              alt="CCA Logo"
              className="h-20 w-auto object-contain hidden dark:block"
              onError={(e) => {
                e.target.src = '/cca-logo-white.png';
              }}
            />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold font-cinzel text-brand-900 dark:text-white uppercase tracking-wider">
            Calvary Christian Academy
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Office of the Comptroller & Financial Administration
          </p>
          <div className="mt-3 inline-block px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest font-cinzel">
            {reportType === 'cashflow' && 'Official Statement of Cash Receipts and Disbursements'}
            {reportType === 'budget' && 'Annual Budget Variance & Departmental Expenditure Report'}
            {reportType === 'disbursement' && 'Official Disbursement & Voucher Register'}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            School Year {schoolYear} • As of{' '}
            {new Date().toLocaleDateString('en-PH', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* 1. Cashflow Statement View */}
        {reportType === 'cashflow' && (
          <div className="space-y-8">
            {/* Summary Highlights */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
                  Total Operating Revenue
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatPeso(stats.total_income)}
                </p>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
                  Total Operating Disbursements
                </p>
                <p className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {formatPeso(stats.total_expenses)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
                  Net Operating Balance
                </p>
                <p
                  className={`text-lg sm:text-xl font-extrabold mt-1 ${
                    isNetPositive ? 'text-brand-600 dark:text-brand-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPeso(stats.net_cashflow)}
                </p>
              </div>
            </div>

            {/* Income Streams Table */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-cinzel tracking-wider">
                  I. Cash Inflows & Collections (By Revenue Stream)
                </h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Subtotal: {formatPeso(stats.total_income)}
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase font-cinzel">
                    <th className="py-2">Category Description</th>
                    <th className="py-2 text-right">Share (%)</th>
                    <th className="py-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {stats.income_by_category.map((cat, i) => {
                    const share = stats.total_income > 0 ? (cat.amount / stats.total_income) * 100 : 0;
                    return (
                      <tr key={`inc-cat-${i}`}>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                        <td className="py-2.5 text-right text-slate-400">{share.toFixed(1)}%</td>
                        <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatPeso(cat.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expense Streams Table */}
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 mb-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase font-cinzel tracking-wider">
                  II. Cash Disbursements & Expenditures (By Department)
                </h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Subtotal: {formatPeso(stats.total_expenses)}
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 uppercase font-cinzel">
                    <th className="py-2">Department / Account Title</th>
                    <th className="py-2 text-right">Share (%)</th>
                    <th className="py-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {stats.expenses_by_category.map((cat, i) => {
                    const share = stats.total_expenses > 0 ? (cat.amount / stats.total_expenses) * 100 : 0;
                    return (
                      <tr key={`exp-cat-${i}`}>
                        <td className="py-2.5 font-semibold text-slate-800 dark:text-white">{cat.name}</td>
                        <td className="py-2.5 text-right text-slate-400">{share.toFixed(1)}%</td>
                        <td className="py-2.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatPeso(cat.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Budget Variance View */}
        {reportType === 'budget' && (
          <div className="space-y-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700 font-cinzel uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3">Category Title</th>
                  <th className="py-3 text-right">Allocated Budget</th>
                  <th className="py-3 text-right">Actual Disbursed</th>
                  <th className="py-3 text-right">Remaining Variance</th>
                  <th className="py-3 text-right">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-semibold text-slate-800 dark:text-white">{b.category_name}</td>
                    <td className="py-3 text-right font-mono">{formatPeso(b.allocated_amount)}</td>
                    <td className="py-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {formatPeso(b.spent_amount)}
                    </td>
                    <td
                      className={`py-3 text-right font-mono font-bold ${
                        b.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPeso(b.remaining)}
                    </td>
                    <td className="py-3 text-right font-bold">{b.utilization_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Disbursement Register View */}
        {reportType === 'disbursement' && (
          <div className="space-y-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 dark:border-slate-700 font-cinzel uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-3">Date</th>
                  <th className="py-3">Voucher #</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Particulars</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {stats.recent_transactions
                  .filter((t) => t.type === 'expense')
                  .map((t, idx) => (
                    <tr key={`disp-${idx}`}>
                      <td className="py-3 text-slate-400">
                        {new Date(t.date).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 font-mono font-bold text-rose-600">DV-{String(t.id).padStart(5, '0')}</td>
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">{t.category}</td>
                      <td className="py-3 text-slate-800 dark:text-white max-w-xs truncate">{t.description}</td>
                      <td className="py-3 font-semibold text-emerald-600">{t.status || 'Approved'}</td>
                      <td className="py-3 text-right font-mono font-bold text-rose-600">
                        {formatPeso(t.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Formal Signatories Block */}
        <div className="mt-16 pt-8 border-t-2 border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5" />
            <p className="font-bold text-slate-800 dark:text-white font-cinzel uppercase text-[11px]">
              {user?.full_name || 'School Accountant'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Prepared By / Comptroller</p>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5" />
            <p className="font-bold text-slate-800 dark:text-white font-cinzel uppercase text-[11px]">
              Maria Santos
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Verified By / Cashier Head</p>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5" />
            <p className="font-bold text-slate-800 dark:text-white font-cinzel uppercase text-[11px]">
              Dr. Rebecca Lim
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Approved By / School Principal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
