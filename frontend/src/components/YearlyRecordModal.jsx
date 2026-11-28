import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { CCA_OFFICE_INFO, formatPeso, formatPHDateTime } from '../utils/schoolData';

export default function YearlyRecordModal({ recordData, onClose, viewOnly = false }) {
  if (!recordData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { school, student, financial_summary, fee_breakdown, receipts, certified_by } = recordData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none">
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              End-of-School-Year Payment Record
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {viewOnly ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase font-cinzel">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View-Only Record</span>
                <span className="sm:hidden">View Only</span>
              </span>
            ) : (
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Print Complete Record</span>
                <span className="sm:hidden">Print</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 font-sans overflow-y-auto print:overflow-visible print:p-0 print:text-black" id="printable-yearly-record">
          <div className="text-center pb-3 mb-4 print:pb-2 print:mb-2">
            <img
              src={CCA_OFFICE_INFO.crestLogoUrl}
              alt="Calvary Christian Academy Crest"
              className="h-14 w-auto mx-auto mb-2 object-contain print:h-11"
            />
            <h1 className="text-base sm:text-xl font-black tracking-wider text-[#022868] font-cinzel uppercase leading-tight print:text-base print:text-black">
              {CCA_OFFICE_INFO.schoolName}
            </h1>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#022868] font-cinzel uppercase mt-0.5 print:text-xs print:text-black">
              {CCA_OFFICE_INFO.officeName}
            </p>
            <p className="text-[10px] text-slate-600 mt-1 print:text-[8.5px] print:text-black">
              {CCA_OFFICE_INFO.address}
            </p>
            <p className="text-[10px] text-slate-600 print:text-[8.5px] print:text-black">
              {CCA_OFFICE_INFO.contact}
            </p>

            <div className="border-t-2 border-slate-800 my-3 print:my-2" />
            <h2 className="text-sm sm:text-lg font-bold tracking-[0.2em] text-slate-900 font-cinzel uppercase print:text-sm">
              Complete Payment Records
            </h2>
            <p className="text-xs sm:text-sm font-bold tracking-[0.14em] text-slate-700 font-cinzel uppercase mt-0.5 print:text-xs">
              School Year {school?.school_year || '2026-2027'}
            </p>
            <div className="border-b-2 border-slate-800 mt-3 print:mt-2" />

            <p className="text-[10px] text-slate-400 mt-2 print:text-[8px] print:text-slate-700">
              Generated: {school?.generated_at} • Permanent Student Archival Copy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs mb-4 print:grid-cols-2 print:p-2 print:border-slate-800 print:bg-transparent print:mb-2 print:text-[9.5px]">
            <div>
              <p className="text-[10px] font-bold text-slate-400 print:text-black uppercase font-cinzel">Student Name</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 print:text-black uppercase">{student.full_name}</p>
              <p className="text-slate-500 print:text-black mt-0.5">
                LRN: <span className="font-mono font-bold text-slate-700 print:text-black">{student.student_id}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 print:text-black uppercase font-cinzel">Grade Level &amp; Section</p>
              <p className="text-xs sm:text-sm font-black text-brand-600 print:text-black">
                {student.grade_level} - {student.section}
              </p>
              <p className="text-slate-500 print:text-black mt-0.5">
                Parent: <span className="font-semibold text-slate-700 print:text-black">{student.parent_name}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 text-center print:grid-cols-3 print:mb-2 print:gap-2">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl print:bg-transparent print:border-slate-800">
              <p className="text-[10px] font-bold text-blue-700 print:text-black uppercase font-cinzel">Total Assessment</p>
              <p className="text-sm sm:text-base font-black text-blue-900 print:text-black font-mono mt-0.5">
                {formatPeso(financial_summary?.total_assessment)}
              </p>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl print:bg-transparent print:border-slate-800">
              <p className="text-[10px] font-bold text-emerald-700 print:text-black uppercase font-cinzel">Total Payments Cleared</p>
              <p className="text-sm sm:text-base font-black text-emerald-900 print:text-black font-mono mt-0.5">
                {formatPeso(financial_summary?.total_payments_made)}
              </p>
            </div>
            <div
              className={`p-2.5 border rounded-xl print:bg-transparent print:border-slate-800 ${Number(financial_summary?.remaining_balance) > 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-slate-50 border-slate-200'
                }`}
            >
              <p className="text-[10px] font-bold uppercase font-cinzel text-slate-600 print:text-black">Remaining Balance</p>
              <p
                className={`text-sm sm:text-base font-black font-mono mt-0.5 ${Number(financial_summary?.remaining_balance) > 0
                  ? 'text-rose-700 print:text-black'
                  : 'text-emerald-700 print:text-black'
                  }`}
              >
                {formatPeso(financial_summary?.remaining_balance)}
              </p>
            </div>
          </div>

          <div className="mb-4 print:mb-2">
            <h3 className="text-xs font-bold text-slate-800 print:text-black uppercase tracking-wider font-cinzel mb-1.5 print:text-[10px]">
              1. Fee Category Assessment Breakdown
            </h3>
            <div className="border border-slate-200 print:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs print:text-[9px]">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-600 print:text-black font-cinzel font-bold text-[9px] uppercase">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left">Category</th>
                    <th className="py-1.5 px-2.5 text-left hidden sm:table-cell print:table-cell">Description</th>
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
                      <td className="py-1.5 px-2.5 text-slate-500 print:text-black text-[11px] print:text-[8.5px] hidden sm:table-cell print:table-cell">
                        {fb.description}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono whitespace-nowrap">{formatPeso(fb.total_due)}</td>
                      <td className="py-1.5 px-2.5 text-right font-mono text-emerald-600 print:text-black font-semibold whitespace-nowrap">
                        {formatPeso(fb.total_paid)}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 print:text-black whitespace-nowrap">
                        {formatPeso(fb.balance)}
                      </td>
                      <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] print:text-[8.5px] font-bold ${fb.status === 'Cleared'
                            ? 'bg-emerald-100 text-emerald-700 print:text-black print:border print:border-black'
                            : 'bg-amber-100 text-amber-700 print:text-black'
                            }`}
                        >
                          {fb.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4 print:mb-2">
            <h3 className="text-xs font-bold text-slate-800 print:text-black uppercase tracking-wider font-cinzel mb-1.5 print:text-[10px]">
              2. Official Receipts Ledger &amp; Transaction History
            </h3>
            <div className="border border-slate-200 print:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs print:text-[9px]">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-600 print:text-black font-cinzel font-bold text-[9px] uppercase">
                  <tr>
                    <th className="py-1.5 px-2.5 text-left">OR Number</th>
                    <th className="py-1.5 px-2.5 text-left">Date Recorded (PH)</th>
                    <th className="py-1.5 px-2.5 text-left">Fee Category</th>
                    <th className="py-1.5 px-2.5 text-right">Amount Paid</th>
                    <th className="py-1.5 px-2.5 text-left">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {receipts && receipts.length > 0 ? (
                    receipts.map((rc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="py-1.5 px-2.5 font-mono font-bold text-brand-600 print:text-black whitespace-nowrap">
                          {rc.or_number}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 print:text-black text-[11px] print:text-[8.5px] whitespace-nowrap">
                          {rc.date_display || formatPHDateTime(rc.date)}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-700 print:text-black font-medium whitespace-nowrap">
                          {rc.fee_type}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                          {formatPeso(rc.amount)}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 print:text-black whitespace-nowrap">
                          {rc.payment_method}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-2.5 text-center text-slate-400 print:text-black">
                        No receipts recorded for this school year.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 print:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-center text-xs print:grid-cols-2 print:pt-2 print:text-[9px]">
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black pt-3 print:pt-2">
                {certified_by?.cashier || 'Maria Santos'}
              </div>
              <p className="font-semibold text-slate-700 print:text-black">School Cashier</p>
              <p className="text-[10px] text-slate-400 print:text-black">Prepared By</p>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black pt-3 print:pt-2">
                {certified_by?.administrator || 'Michelle Jean Gormley'}
              </div>
              <p className="font-semibold text-slate-700 print:text-black">Authorized School Administrator</p>
              <p className="text-[10px] text-slate-400 print:text-black">Checked &amp; Approved By</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
