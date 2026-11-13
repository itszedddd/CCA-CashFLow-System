import React from 'react';
import { Printer, X } from 'lucide-react';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function YearlyRecordModal({ recordData, onClose }) {
  if (!recordData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { school, student, financial_summary, fee_breakdown, receipts } = recordData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:static print:inset-auto print:block print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
        {/* Modal Controls - hidden in print */}
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              End-of-School-Year Payment Record
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Print Complete Record</span>
              <span className="sm:hidden">Print</span>
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
        <div className="p-6 sm:p-8 font-sans overflow-y-auto print:overflow-visible print:p-0 print:text-black" id="printable-yearly-record">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900/80 mb-4 print:pb-2 print:mb-2">
            <div className="flex items-center justify-center gap-3 mb-1.5 print:gap-2">
              <img
                src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                alt="CCA Logo"
                className="h-12 sm:h-14 w-auto object-contain print:h-9 shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-left">
                <h1 className="text-base sm:text-xl font-black tracking-wider text-slate-900 font-cinzel uppercase leading-tight print:text-sm">
                  {school?.name || 'CALVARY CHRISTIAN ACADEMY'}
                </h1>
                <p className="text-[11px] text-brand-600 font-extrabold uppercase tracking-widest font-cinzel print:text-[8.5px] print:text-slate-800">
                  {school?.title || 'Official Statement of Account & Complete Payment Record'}
                </p>
                <p className="text-[10px] text-slate-500 print:text-[8px] print:text-slate-700">School Year {school?.school_year || '2026-2027'}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 print:text-[8px] print:text-slate-700">
              Generated: {school?.generated_at} • Permanent Student Archival Copy
            </p>
          </div>

          {/* Student Profile Overview */}
          <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs mb-4 print:p-2 print:border-slate-800 print:bg-transparent print:mb-2 print:text-[9.5px]">
            <div>
              <p className="text-[10px] font-bold text-slate-400 print:text-black uppercase font-cinzel">Student Name</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 print:text-black uppercase">{student.full_name}</p>
              <p className="text-slate-500 print:text-black mt-0.5">LRN: <span className="font-mono font-bold text-slate-700 print:text-black">{student.student_id}</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 print:text-black uppercase font-cinzel">Grade Level & Section</p>
              <p className="text-xs sm:text-sm font-black text-brand-600 print:text-black">{student.grade_level} - {student.section}</p>
              <p className="text-slate-500 print:text-black mt-0.5">Parent: <span className="font-semibold text-slate-700 print:text-black">{student.parent_name}</span></p>
            </div>
          </div>

          {/* Financial Summary KPI Box */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 text-center print:mb-2 print:gap-2">
            <div className="p-2 sm:p-2.5 bg-blue-50 border border-blue-200 rounded-xl print:bg-transparent print:border-slate-800">
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-700 print:text-black uppercase font-cinzel">Total Assessment</p>
              <p className="text-xs sm:text-base font-black text-blue-900 print:text-black font-mono mt-0.5">
                {formatPeso(financial_summary?.total_assessment)}
              </p>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl print:bg-transparent print:border-slate-800">
              <p className="text-[9px] sm:text-[10px] font-bold text-emerald-700 print:text-black uppercase font-cinzel">Total Payments Cleared</p>
              <p className="text-xs sm:text-base font-black text-emerald-900 print:text-black font-mono mt-0.5">
                {formatPeso(financial_summary?.total_payments_made)}
              </p>
            </div>
            <div className={`p-2 sm:p-2.5 border rounded-xl print:bg-transparent print:border-slate-800 ${Number(financial_summary?.remaining_balance) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase font-cinzel text-slate-600 print:text-black">Remaining Balance</p>
              <p className={`text-xs sm:text-base font-black font-mono mt-0.5 ${Number(financial_summary?.remaining_balance) > 0 ? 'text-rose-700 print:text-black' : 'text-emerald-700 print:text-black'}`}>
                {formatPeso(financial_summary?.remaining_balance)}
              </p>
            </div>
          </div>

          {/* Fee Categories Table */}
          <div className="mb-4 print:mb-2">
            <h3 className="text-xs font-bold text-slate-800 print:text-black uppercase tracking-wider font-cinzel mb-1.5 print:text-[10px]">
              1. Fee Category Assessment Breakdown
            </h3>
            <div className="border border-slate-200 print:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs print:text-[9px]">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-600 print:text-black font-cinzel font-bold text-[9px] uppercase">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left">Category</th>
                    <th className="py-1.5 px-2.5 text-left">Description</th>
                    <th className="py-1.5 px-2.5 text-right">Assessment</th>
                    <th className="py-1.5 px-2.5 text-right">Total Paid</th>
                    <th className="py-1.5 px-2.5 text-right">Balance</th>
                    <th className="py-1.5 px-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {fee_breakdown?.map((fb, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                      <td className="py-1.5 px-2.5 font-bold text-slate-800 print:text-black whitespace-nowrap">{fb.fee_type}</td>
                      <td className="py-1.5 px-2.5 text-slate-500 print:text-black text-[11px] print:text-[8.5px]">{fb.description}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap">{formatPeso(fb.total_due)}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-emerald-600 print:text-black font-semibold whitespace-nowrap">{formatPeso(fb.total_paid)}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 print:text-black whitespace-nowrap">{formatPeso(fb.balance)}</td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] print:text-[8.5px] font-bold ${fb.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700 print:text-black print:border print:border-black' : 'bg-amber-100 text-amber-700 print:text-black'}`}>
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
          <div className="mb-4 print:mb-2">
            <h3 className="text-xs font-bold text-slate-800 print:text-black uppercase tracking-wider font-cinzel mb-1.5 print:text-[10px]">
              2. Official Receipts Ledger & Transaction History
            </h3>
            <div className="border border-slate-200 print:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs print:text-[9px]">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-600 print:text-black font-cinzel font-bold text-[9px] uppercase">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left">OR Number</th>
                    <th className="py-1.5 px-2.5 text-left">Date Recorded</th>
                    <th className="py-1.5 px-2.5 text-left">Fee Category</th>
                    <th className="py-1.5 px-2.5 text-right">Amount Paid</th>
                    <th className="py-1.5 px-2.5 text-left">Method</th>
                    <th className="py-1.5 px-2.5 text-left">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {receipts && receipts.length > 0 ? (
                    receipts.map((rc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-mono font-bold text-brand-600 print:text-black whitespace-nowrap">{rc.or_number}</td>
                        <td className="py-1.5 px-2.5 text-slate-600 print:text-black text-[11px] print:text-[8.5px] whitespace-nowrap">
                          {rc.date ? rc.date.split('T')[0] : 'N/A'}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-700 print:text-black font-medium whitespace-nowrap">{rc.fee_type}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">{formatPeso(rc.amount)}</td>
                        <td className="py-1.5 px-2.5 text-slate-600 print:text-black whitespace-nowrap">{rc.payment_method}</td>
                        <td className="py-1.5 px-2.5 text-slate-500 print:text-black text-[11px] print:text-[8.5px] whitespace-nowrap">{rc.cashier}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-2.5 text-center text-slate-400 print:text-black">
                        No receipts recorded for this school year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Certification Stamp */}
          <div className="pt-4 border-t border-slate-200 print:border-slate-800 grid grid-cols-3 gap-4 text-center text-xs print:pt-2 print:text-[9px]">
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black pt-4 print:pt-2">
                Maria Santos
              </div>
              <p className="font-semibold text-slate-700 print:text-black">School Cashier</p>
              <p className="text-[10px] text-slate-400 print:text-black">Prepared & Verified</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black pt-4 print:pt-2">
                Accounting Office
              </div>
              <p className="font-semibold text-slate-700 print:text-black">School Accountant</p>
              <p className="text-[10px] text-slate-400 print:text-black">Audited & Reconciled</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black pt-4 print:pt-2">
                Pastor David Reyes, M.Div.
              </div>
              <p className="font-semibold text-slate-700 print:text-black">School Principal</p>
              <p className="text-[10px] text-slate-400 print:text-black">Approved for School Archives</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
