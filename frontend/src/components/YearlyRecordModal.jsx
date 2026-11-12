import React from 'react';
import { Printer, X, Award, CheckCircle } from 'lucide-react';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function YearlyRecordModal({ recordData, onClose }) {
  if (!recordData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { school, student, financial_summary, fee_breakdown, receipts, certified_by } = recordData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none">
        {/* Modal Controls - hidden in print */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel">
              End-of-School-Year Official Payment Record & Certificate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Complete Record</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable / Printable Certificate & Statement */}
        <div className="p-8 sm:p-12 font-sans overflow-y-auto print:overflow-visible print:p-8" id="printable-yearly-record">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-slate-900/80 mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                alt="CCA Logo"
                className="h-14 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-left">
                <h1 className="text-xl font-black tracking-wider text-slate-900 font-cinzel uppercase leading-tight">
                  {school?.name || 'CALVARY CHRISTIAN ACADEMY'}
                </h1>
                <p className="text-xs text-brand-600 font-extrabold uppercase tracking-widest font-cinzel">
                  {school?.title || 'Official Statement of Account & Complete Payment Record'}
                </p>
                <p className="text-[10px] text-slate-500">School Year {school?.school_year || '2026-2027'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Generated: {school?.generated_at} • Permanent Student Archival Copy
            </p>
          </div>

          {/* Student Profile Overview */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-cinzel">Student Name</p>
              <p className="text-sm font-black text-slate-900 uppercase">{student.full_name}</p>
              <p className="text-slate-500 mt-1">LRN: <span className="font-mono font-bold text-slate-700">{student.student_id}</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase font-cinzel">Grade Level & Section</p>
              <p className="text-sm font-black text-brand-600">{student.grade_level} - {student.section}</p>
              <p className="text-slate-500 mt-1">Parent: <span className="font-semibold text-slate-700">{student.parent_name}</span></p>
            </div>
          </div>

          {/* Financial Summary KPI Box */}
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-[10px] font-bold text-blue-700 uppercase font-cinzel">Total Assessment</p>
              <p className="text-base font-black text-blue-900 font-mono mt-0.5">
                {formatPeso(financial_summary?.total_assessment)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-[10px] font-bold text-emerald-700 uppercase font-cinzel">Total Payments Cleared</p>
              <p className="text-base font-black text-emerald-900 font-mono mt-0.5">
                {formatPeso(financial_summary?.total_payments_made)}
              </p>
            </div>
            <div className={`p-3 border rounded-xl ${Number(financial_summary?.remaining_balance) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-[10px] font-bold uppercase font-cinzel text-slate-600">Remaining Balance</p>
              <p className={`text-base font-black font-mono mt-0.5 ${Number(financial_summary?.remaining_balance) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {formatPeso(financial_summary?.remaining_balance)}
              </p>
            </div>
          </div>

          {/* Fee Categories Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-cinzel mb-2">
              1. Fee Category Assessment Breakdown
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 font-cinzel font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3 text-left">Category</th>
                    <th className="py-2 px-3 text-left">Description</th>
                    <th className="py-2 px-3 text-right">Assessment</th>
                    <th className="py-2 px-3 text-right">Total Paid</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fee_breakdown?.map((fb, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{fb.fee_type}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{fb.description}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatPeso(fb.total_due)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">{formatPeso(fb.total_paid)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{formatPeso(fb.balance)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${fb.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {fb.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Official Receipts History Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-cinzel mb-2">
              2. Official Receipts Ledger & Transaction History
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600 font-cinzel font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3 text-left">OR Number</th>
                    <th className="py-2 px-3 text-left">Date Recorded</th>
                    <th className="py-2 px-3 text-left">Fee Category</th>
                    <th className="py-2 px-3 text-right">Amount Paid</th>
                    <th className="py-2 px-3 text-left">Method</th>
                    <th className="py-2 px-3 text-left">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts && receipts.length > 0 ? (
                    receipts.map((rc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-brand-600">{rc.or_number}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {rc.date ? rc.date.split('T')[0] : 'N/A'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{rc.fee_type}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatPeso(rc.amount)}</td>
                        <td className="py-2 px-3 text-slate-600">{rc.payment_method}</td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">{rc.cashier}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400">
                        No receipts recorded for this school year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Certification Stamp */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 pt-6">
                Maria Santos
              </div>
              <p className="font-semibold text-slate-700">School Cashier</p>
              <p className="text-[10px] text-slate-400">Prepared & Verified</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 pt-6">
                Accounting Office
              </div>
              <p className="font-semibold text-slate-700">School Accountant</p>
              <p className="text-[10px] text-slate-400">Audited & Reconciled</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 pt-6">
                Pastor David Reyes, M.Div.
              </div>
              <p className="font-semibold text-slate-700">School Principal</p>
              <p className="text-[10px] text-slate-400">Approved for School Archives</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

