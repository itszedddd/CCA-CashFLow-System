import { useState, useEffect } from 'react';
import { Printer, AlertCircle, FileText, Download, Search } from 'lucide-react';
import api from '../api';
import { CCA_OFFICE_INFO, formatPeso, formatPHDateTime } from '../utils/schoolData';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('financial');
  const [txSearch, setTxSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [balanceFilter, setBalanceFilter] = useState('outstanding');

  useEffect(() => {
    fetchReportData();
  }, [schoolYear]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [repRes, txRes] = await Promise.all([
        api.get('/dashboard/end-of-year-report', {
          params: { school_year: schoolYear },
        }),
        api.get('/income/', {
          params: { school_year: schoolYear, limit: 500 },
        }),
      ]);
      setReport(repRes.data);
      setTransactions(txRes.data?.items || []);
    } catch (err) {
      console.error('Error fetching report data', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (!txSearch.trim()) return true;
    const q = txSearch.trim().toLowerCase();
    return (
      (tx.or_number || '').toLowerCase().includes(q) ||
      (tx.payer_name || '').toLowerCase().includes(q) ||
      (tx.student_id || '').toLowerCase().includes(q) ||
      (tx.fee_type || '').toLowerCase().includes(q) ||
      (tx.description || '').toLowerCase().includes(q)
    );
  });

  const handleExportTransactionsCsv = () => {
    const headers = ['Date (PHT)', 'OR Number', 'Student LRN', 'Payer / Student', 'Grade Level', 'Fee Category', 'Method', 'Amount', 'Anomaly Status', 'Recorded By'];
    const rows = filteredTransactions.map((tx) => [
      formatPHDateTime(tx.date_recorded),
      tx.or_number || '',
      tx.student_id || '',
      tx.payer_name || '',
      tx.grade_level || '',
      tx.fee_type || tx.category_name || '',
      tx.payment_method || 'Cash',
      Number(tx.amount || 0).toFixed(2),
      tx.anomaly_status || 'Normal',
      tx.recorder_name || 'Cashier',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CCA_Transactions_Report_${schoolYear}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">
            Generating End-of-School-Year Cashflow Report...
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">
          Unable to Generate Cashflow Report
        </h3>
        <button
          onClick={fetchReportData}
          className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const s1 = report.section_1_financial_summary || {};
  const s2 = report.section_2_by_fee_category || [];
  const s3 = report.section_3_by_grade_level || [];
  const s4 = report.section_4_monthly_summary || [];
  const s5 = report.section_5_payment_status_summary || {};
  const s6All = report.section_6_outstanding_balance_report || [];
  const s6Rows =
    balanceFilter === 'outstanding'
      ? s6All.filter((r) => Number(r.remaining_balance) > 0)
      : s6All;
  const s7 = report.section_7_transaction_summary || {};
  const s8 = report.section_8_anomaly_summary || {};
  const acct = report.accountability || {};

  const s2Totals = s2.reduce(
    (acc, r) => ({
      expected: acc.expected + (r.expected_amount || 0),
      actual: acc.actual + (r.actual_collection || 0),
      outstanding: acc.outstanding + (r.outstanding || 0),
    }),
    { expected: 0, actual: 0, outstanding: 0 }
  );

  const s3Totals = s3.reduce(
    (acc, r) => ({
      count: acc.count + (r.student_count || 0),
      expected: acc.expected + (r.expected_collection || 0),
      actual: acc.actual + (r.actual_collection || 0),
      outstanding: acc.outstanding + (r.outstanding || 0),
    }),
    { count: 0, expected: 0, actual: 0, outstanding: 0 }
  );

  const s4Totals = s4.reduce(
    (acc, r) => ({
      collections: acc.collections + (r.total_collections || 0),
      txs: acc.txs + (r.transaction_count || 0),
    }),
    { collections: 0, txs: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-cinzel tracking-tight">
            Cashflow Statements &amp; End-of-Year Reports
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('financial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-cinzel uppercase cursor-pointer transition ${activeTab === 'financial'
                ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              Financial &amp; Cashflow
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-cinzel uppercase cursor-pointer transition flex items-center gap-1 ${activeTab === 'transactions'
                ? 'bg-white dark:bg-slate-800 text-brand-700 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Transactions Report
            </button>
          </div>

          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            className="py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono shadow-xs"
          >
            <option value="2026-2027">SY 2026-2027</option>
            <option value="2025-2026">SY 2025-2026</option>
          </select>

          {activeTab === 'transactions' && (
            <button
              onClick={handleExportTransactionsCsv}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition font-cinzel uppercase tracking-wider cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition font-cinzel uppercase tracking-wider cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Letter Report
          </button>
        </div>
      </div>

      {activeTab === 'transactions' ? (
        <div className="printable-area bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-10 shadow-md border border-slate-200 dark:border-slate-700 print:p-2 print:border-none print:shadow-none print:bg-white print:text-black space-y-6">
          <div className="text-center pb-3 print:pb-2">
            <img
              src={CCA_OFFICE_INFO.crestLogoUrl}
              alt="Calvary Christian Academy Crest"
              className="h-14 w-auto mx-auto mb-2 object-contain print:h-12"
            />
            <h1 className="text-lg font-black tracking-wider text-[#022868] dark:text-white font-cinzel uppercase print:text-black">
              {CCA_OFFICE_INFO.schoolName}
            </h1>
            <p className="text-xs font-bold tracking-widest text-[#022868] dark:text-blue-200 font-cinzel uppercase print:text-black">
              {CCA_OFFICE_INFO.officeName}
            </p>
            <div className="border-t-2 border-slate-800 dark:border-slate-500 my-3 print:my-2" />
            <h2 className="text-base sm:text-xl font-bold tracking-[0.18em] text-slate-900 dark:text-white font-cinzel uppercase print:text-black">
              Official Collection Transactions Report
            </h2>
            <p className="text-xs font-bold tracking-[0.14em] text-slate-600 dark:text-slate-300 font-cinzel uppercase mt-0.5 print:text-black">
              School Year {schoolYear} • {filteredTransactions.length} Records
            </p>
            <div className="border-b-2 border-slate-800 dark:border-slate-500 mt-3 print:mt-2" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Filter by OR#, student LRN, name, or fee..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Filtered Total: {formatPeso(filteredTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0))}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
            <table className="w-full text-xs print:text-[9px]">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                <tr>
                  <th className="py-2 px-3 text-left">Date (PHT)</th>
                  <th className="py-2 px-3 text-left">OR #</th>
                  <th className="py-2 px-3 text-left">Student / Payer</th>
                  <th className="py-2 px-3 text-left">Grade</th>
                  <th className="py-2 px-3 text-left">Fee Type</th>
                  <th className="py-2 px-3 text-left">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No collection transactions match the filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-1.5 px-3 font-mono whitespace-nowrap">{formatPHDateTime(tx.date_recorded)}</td>
                      <td className="py-1.5 px-3 font-mono font-bold whitespace-nowrap">{tx.or_number || '—'}</td>
                      <td className="py-1.5 px-3">
                        <span className="font-semibold">{tx.payer_name || 'N/A'}</span>
                        {tx.student_id && <span className="ml-1.5 text-[10px] font-mono text-slate-400">({tx.student_id})</span>}
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap">{tx.grade_level || '—'}</td>
                      <td className="py-1.5 px-3 whitespace-nowrap">{tx.fee_type || tx.category_name || 'School Fee'}</td>
                      <td className="py-1.5 px-3 whitespace-nowrap">{tx.payment_method || 'Cash'}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600 print:text-black">
                        {formatPeso(tx.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="printable-area bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-3xl p-6 sm:p-10 shadow-md border border-slate-200 dark:border-slate-700 print:p-2 print:border-none print:shadow-none print:bg-white print:text-black space-y-8 print:space-y-5">
          <div className="text-center pb-3 print:pb-2">
            <img
              src={CCA_OFFICE_INFO.crestLogoUrl}
              alt="Calvary Christian Academy Crest"
              className="h-16 w-auto mx-auto mb-2 object-contain print:h-12"
            />
            <h1 className="text-lg sm:text-xl font-black tracking-wider text-[#022868] dark:text-white font-cinzel uppercase leading-tight print:text-base print:text-black">
              {CCA_OFFICE_INFO.schoolName}
            </h1>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#022868] dark:text-blue-200 font-cinzel uppercase mt-0.5 print:text-xs print:text-black">
              {CCA_OFFICE_INFO.officeName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 print:text-[8.5px] print:text-black">
              {CCA_OFFICE_INFO.address}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 print:text-[8.5px] print:text-black">
              {CCA_OFFICE_INFO.contact}
            </p>

            <div className="border-t-2 border-slate-800 dark:border-slate-500 my-3 print:my-2" />
            <h2 className="text-base sm:text-xl font-bold tracking-[0.2em] text-slate-900 dark:text-white font-cinzel uppercase print:text-base print:text-black">
              Cashflow Statements &amp; Reports
            </h2>
            <p className="text-xs sm:text-sm font-bold tracking-[0.14em] text-slate-700 dark:text-slate-300 font-cinzel uppercase mt-0.5 print:text-xs print:text-black">
              School Year {schoolYear}
            </p>
            <div className="border-b-2 border-slate-800 dark:border-slate-500 mt-3 print:mt-2" />

            <p className="text-[10px] text-slate-400 mt-2 print:text-[8px] print:text-slate-700">
              Generated: {report.generated_at} • Default Paper: US Letter (8.5&quot; × 11&quot;)
            </p>
          </div>

          <section className="break-inside-avoid">
            <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
              Section 1: Financial Summary
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
              <table className="w-full text-xs print:text-[9.5px]">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                  <tr>
                    <th className="py-2 px-3 text-left">Financial Summary Metric</th>
                    <th className="py-2 px-3 text-right">Amount / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                  <tr>
                    <td className="py-2 px-3 font-medium">Total Expected Collections</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatPeso(s1.total_expected_collections)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Total Actual Collections</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 print:text-black">{formatPeso(s1.total_actual_collections)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Total Outstanding Balances</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 print:text-black">{formatPeso(s1.total_outstanding_balances)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Total Overpayments</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatPeso(s1.total_overpayments)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Total Refunds / Adjustments</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{formatPeso(s1.total_refunds_adjustments)}</td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-900/40 font-bold">
                    <td className="py-2 px-3">Total Net Collections</td>
                    <td className="py-2 px-3 text-right font-mono font-black text-brand-700 dark:text-brand-300 print:text-black">
                      {formatPeso(s1.total_net_collections)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Collection Rate (%)</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{s1.collection_rate}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Number of Fully Paid Students</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{s1.fully_paid_students}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium">Number of Students with Outstanding Balances</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">{s1.students_with_outstanding_balances}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="break-inside-avoid">
            <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
              Section 2: Collection Summary by Fee Category
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
              <table className="w-full text-xs print:text-[9.5px]">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                  <tr>
                    <th className="py-2 px-3 text-left">Fee Category</th>
                    <th className="py-2 px-3 text-right">Expected Amount</th>
                    <th className="py-2 px-3 text-right">Actual Collection</th>
                    <th className="py-2 px-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                  {s2.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-semibold">{r.fee_category}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatPeso(r.expected_amount)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 print:text-black font-semibold">
                        {formatPeso(r.actual_collection)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600 print:text-black">
                        {formatPeso(r.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900/40 font-bold border-t-2 border-slate-200 print:border-slate-800">
                  <tr>
                    <td className="py-2 px-3 uppercase font-cinzel">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s2Totals.expected)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s2Totals.actual)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s2Totals.outstanding)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="break-inside-avoid">
            <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
              Section 3: Collection Summary by Grade Level
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
              <table className="w-full text-xs print:text-[9.5px]">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                  <tr>
                    <th className="py-2 px-3 text-left">Grade Level (Section)</th>
                    <th className="py-2 px-3 text-right">No. of Students</th>
                    <th className="py-2 px-3 text-right">Expected Collection</th>
                    <th className="py-2 px-3 text-right">Actual Collection</th>
                    <th className="py-2 px-3 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                  {s3.map((r, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 font-semibold">
                        {r.grade_level} {r.section ? `— ${r.section}` : ''}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono">{r.student_count}</td>
                      <td className="py-1.5 px-3 text-right font-mono">{formatPeso(r.expected_collection)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-600 print:text-black font-semibold">
                        {formatPeso(r.actual_collection)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-rose-600 print:text-black">
                        {formatPeso(r.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-900/40 font-bold border-t-2 border-slate-200 print:border-slate-800">
                  <tr>
                    <td className="py-2 px-3 uppercase font-cinzel">Total</td>
                    <td className="py-2 px-3 text-right font-mono">{s3Totals.count}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s3Totals.expected)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s3Totals.actual)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatPeso(s3Totals.outstanding)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            <section className="break-inside-avoid">
              <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
                Section 4: Monthly Collection Summary
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
                <table className="w-full text-xs print:text-[9px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                    <tr>
                      <th className="py-2 px-3 text-left">Month</th>
                      <th className="py-2 px-3 text-right">Total Collections</th>
                      <th className="py-2 px-3 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                    {s4.map((r, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3 font-medium">{r.month}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">{formatPeso(r.total_collections)}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{r.transaction_count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/40 font-bold border-t-2 border-slate-200 print:border-slate-800">
                    <tr>
                      <td className="py-2 px-3 uppercase font-cinzel">Total</td>
                      <td className="py-2 px-3 text-right font-mono">{formatPeso(s4Totals.collections)}</td>
                      <td className="py-2 px-3 text-right font-mono">{s4Totals.txs}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section className="break-inside-avoid">
              <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
                Section 5: Student Payment Status Summary
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
                <table className="w-full text-xs print:text-[9.5px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                    <tr>
                      <th className="py-2 px-3 text-left">Payment Status</th>
                      <th className="py-2 px-3 text-right">Number of Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                    <tr>
                      <td className="py-2 px-3 font-medium">Fully Paid</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 print:text-black">{s5.fully_paid}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Partially Paid</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-600 print:text-black">{s5.partially_paid}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">Unpaid</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600 print:text-black">{s5.unpaid}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-medium">With Overpayment</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">{s5.with_overpayment}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/40 font-bold border-t-2 border-slate-200 print:border-slate-800">
                    <tr>
                      <td className="py-2 px-3 uppercase font-cinzel">Total Students</td>
                      <td className="py-2 px-3 text-right font-mono">{s5.total_students}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel print:text-black">
                Section 6: Outstanding Balance Report ({s6Rows.length} records)
              </h3>
              <div className="flex gap-1 print:hidden">
                <button
                  onClick={() => setBalanceFilter('outstanding')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase font-cinzel cursor-pointer ${balanceFilter === 'outstanding'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  With Balance Only
                </button>
                <button
                  onClick={() => setBalanceFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase font-cinzel cursor-pointer ${balanceFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                >
                  All Students
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
              <table className="w-full text-[11px] print:text-[8.5px]">
                <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                  <tr>
                    <th className="py-2 px-2.5 text-left">Student ID</th>
                    <th className="py-2 px-2.5 text-left">Student Name</th>
                    <th className="py-2 px-2.5 text-left">Grade Level</th>
                    <th className="py-2 px-2.5 text-right">Total Fees</th>
                    <th className="py-2 px-2.5 text-right">Amount Paid</th>
                    <th className="py-2 px-2.5 text-right">Remaining Balance</th>
                    <th className="py-2 px-2.5 text-left">Unpaid Categories</th>
                    <th className="py-2 px-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                  {s6Rows.map((r, i) => (
                    <tr key={i} className="break-inside-avoid">
                      <td className="py-1.5 px-2.5 font-mono font-bold whitespace-nowrap">{r.student_id}</td>
                      <td className="py-1.5 px-2.5 font-semibold">{r.full_name}</td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">{r.grade_level}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono">{formatPeso(r.total_school_fees)}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-emerald-600 print:text-black">
                        {formatPeso(r.total_amount_paid)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-rose-600 print:text-black">
                        {formatPeso(r.remaining_balance)}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">{r.unpaid_fee_categories}</td>
                      <td className="py-1.5 px-2.5 text-center font-semibold whitespace-nowrap">{r.payment_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:gap-4">
            <section className="break-inside-avoid">
              <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
                Section 7: Transaction &amp; Payment Summary
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
                <table className="w-full text-xs print:text-[9.5px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                    <tr>
                      <th className="py-2 px-3 text-left">Metric</th>
                      <th className="py-2 px-3 text-right">Count / Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                    <tr>
                      <td className="py-1.5 px-3">Total Number of Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{s7.total_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Cash Collections</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-600 print:text-black">
                        {formatPeso(s7.total_cash_collections)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Check Collections</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{formatPeso(s7.total_check_collections)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Voided Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s7.total_voided_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Refunded Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s7.total_refunded_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Adjusted Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s7.total_adjusted_transactions}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 font-bold">
                      <td className="py-1.5 px-3">Number of Issued Receipts</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s7.issued_receipts_count}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="break-inside-avoid">
              <h3 className="text-xs font-extrabold text-brand-900 dark:text-white uppercase tracking-widest font-cinzel mb-2 pb-1 border-b border-slate-200 dark:border-slate-700 print:text-black">
                Section 8: ML-Based Anomaly Detection Summary
              </h3>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 print:border-slate-800 rounded-xl">
                <table className="w-full text-xs print:text-[9.5px]">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 print:bg-slate-200 print:text-black uppercase font-cinzel">
                    <tr>
                      <th className="py-2 px-3 text-left">Anomaly Category / Resolution</th>
                      <th className="py-2 px-3 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 print:divide-slate-300">
                    <tr>
                      <td className="py-1.5 px-3">Unusual Payment Amounts</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{s8.unusual_payment_amounts}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Incorrect Fee Classification</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{s8.incorrect_fee_classification}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Potential Duplicate Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{s8.potential_duplicate_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Payment Rule Violations</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{s8.payment_rule_violations}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900/40 font-bold">
                      <td className="py-1.5 px-3">Total Flagged Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s8.total_flagged_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Total Transactions Analyzed</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s8.total_analyzed}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Verified Legitimate Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-600 print:text-black">{s8.verified_legitimate}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Confirmed Recording Errors</td>
                      <td className="py-1.5 px-3 text-right font-mono text-rose-600 print:text-black">{s8.confirmed_errors}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Corrected Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono">{s8.corrected_transactions}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Unresolved Flagged Transactions</td>
                      <td className="py-1.5 px-3 text-right font-mono text-amber-600 print:text-black">{s8.unresolved_flagged}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="break-inside-avoid pt-8 mt-6 border-t-2 border-slate-300 dark:border-slate-600 print:border-slate-800 print:pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-black font-cinzel mb-6 print:mb-4">
              Accountability &amp; Authorization
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs print:grid-cols-3 print:text-[9px]">
              <div>
                <p className="text-[10px] text-slate-500 print:text-black mb-6 print:mb-4">Prepared by:</p>
                <div className="border-b border-slate-400 dark:border-slate-500 print:border-black w-44 mx-auto pb-1 font-bold font-cinzel uppercase">
                  {acct.prepared_by_name || 'Maria Santos'}
                </div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 print:text-black mt-1">
                  {acct.prepared_by_role || 'Cashier'}
                </p>
                <p className="text-[10px] text-slate-400 print:text-black mt-1">
                  Date Prepared: {acct.date_prepared}
                </p>
                <p className="text-[9px] text-slate-400 print:text-black italic mt-0.5">Signature over Printed Name</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 print:text-black mb-6 print:mb-4">Checked by:</p>
                <div className="border-b border-slate-400 dark:border-slate-500 print:border-black w-48 mx-auto pb-1 font-bold font-cinzel uppercase">
                  {acct.checked_by_name || 'Michelle Jean Gormley'}
                </div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 print:text-black mt-1">
                  {acct.checked_by_role || 'Authorized School Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 print:text-black mt-1">
                  Date Reviewed: {acct.date_reviewed}
                </p>
                <p className="text-[9px] text-slate-400 print:text-black italic mt-0.5">Signature over Printed Name</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 print:text-black mb-6 print:mb-4">Approved by:</p>
                <div className="border-b border-slate-400 dark:border-slate-500 print:border-black w-48 mx-auto pb-1 font-bold font-cinzel uppercase">
                  {acct.approved_by_name || 'Pastor David Reyes, M.Div.'}
                </div>
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 print:text-black mt-1">
                  {acct.approved_by_role || 'School Principal'}
                </p>
                <p className="text-[10px] text-slate-400 print:text-black mt-1">Date: ___________________</p>
                <p className="text-[9px] text-slate-400 print:text-black italic mt-0.5">Signature over Printed Name</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
