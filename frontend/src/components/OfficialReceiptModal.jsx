import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function OfficialReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none print:w-full">
        {/* Header Actions - hidden in print */}
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              Official Soft-Copy Receipt
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Print Physical Receipt</span>
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

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 font-sans print:p-0 print:text-black" id="printable-receipt">
          {/* School Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900/80 mb-3 print:pb-2 print:mb-2">
            <div className="flex justify-center items-center gap-2 mb-1.5">
              <img
                src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                alt="CCA Logo"
                className="h-10 sm:h-12 w-auto object-contain print:h-9 shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 font-cinzel uppercase print:text-sm">
                  Calvary Christian Academy
                </h1>
                <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest print:text-[8px]">
                  School Cashier's Office • Official Receipt
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 print:text-[8px]">
              Calvary Christian Academy Campus, City of San Jose del Monte, Bulacan
            </p>
            <p className="text-[10px] text-slate-500 print:text-[8px]">
              Tel: (044) 815-1234 • Email: cashier@cca.edu.ph
            </p>
          </div>

          {/* Receipt Info Bar */}
          <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-slate-200 text-xs print:py-1.5 print:text-[9.5px]">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-black font-cinzel">Official Receipt No.</p>
              <p className="text-sm sm:text-base font-extrabold text-brand-600 print:text-black font-mono tracking-wider">
                {receipt.or_number || 'OR-2026-00000'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-black font-cinzel">Date & Time Issued</p>
              <p className="font-bold text-slate-800 print:text-black text-[11px] print:text-[9px]">{receipt.date || new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Student Info */}
          <div className="py-2.5 border-b border-slate-200 text-xs space-y-1 print:py-1.5 print:text-[9.5px] print:space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black font-medium">Received From (Student):</span>
              <span className="font-bold text-slate-900 print:text-black uppercase">{receipt.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black font-medium">Student ID / LRN:</span>
              <span className="font-mono font-bold text-slate-800 print:text-black">{receipt.student_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black font-medium">Grade Level & Section:</span>
              <span className="font-semibold text-slate-800 print:text-black">{receipt.grade_level} - {receipt.section || 'Faith'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black font-medium">Parent / Guardian:</span>
              <span className="font-semibold text-slate-800 print:text-black">{receipt.parent_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 print:text-black font-medium">School Year:</span>
              <span className="font-semibold text-slate-800 print:text-black">{receipt.school_year || '2026-2027'}</span>
            </div>
          </div>

          {/* Fee Itemization */}
          <div className="py-2.5 border-b-2 border-slate-900/80 print:py-1.5">
            <table className="w-full text-xs print:text-[9.5px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 print:text-black text-[10px] print:text-[8.5px] uppercase font-cinzel font-bold">
                  <th className="text-left pb-1.5">Fee Category</th>
                  <th className="text-left pb-1.5">Description</th>
                  <th className="text-right pb-1.5">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 font-bold text-slate-800 print:text-black whitespace-nowrap">{receipt.fee_type}</td>
                  <td className="py-2 text-slate-600 print:text-black text-[11px] print:text-[9px]">{receipt.description}</td>
                  <td className="py-2 text-right font-black text-slate-900 print:text-black font-mono text-sm print:text-xs whitespace-nowrap">
                    {formatPeso(receipt.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="pt-2 text-right font-bold text-slate-700 print:text-black text-xs print:text-[9.5px] uppercase font-cinzel">
                    Total Amount Received:
                  </td>
                  <td className="pt-2 text-right font-black text-emerald-700 print:text-black text-base print:text-sm font-mono whitespace-nowrap">
                    {formatPeso(receipt.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Details & Balance */}
          <div className="py-2.5 border-b border-slate-200 text-xs grid grid-cols-2 gap-4 print:py-1.5 print:text-[9.5px]">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-black font-cinzel">Payment Method</p>
              <p className="font-bold text-slate-800 print:text-black">{receipt.payment_method}</p>
              {receipt.reference_number && receipt.reference_number !== 'N/A' && (
                <p className="text-[10px] text-slate-500 print:text-black font-mono">Ref: {receipt.reference_number}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400 print:text-black font-cinzel">Remaining Balance ({receipt.fee_type})</p>
              <p className={`font-mono font-bold ${Number(receipt.remaining_balance) > 0 ? 'text-amber-600 print:text-black' : 'text-emerald-600 print:text-black'}`}>
                {formatPeso(receipt.remaining_balance)}
              </p>
              <p className="text-[10px] text-slate-400 print:text-black">
                {Number(receipt.remaining_balance) <= 0 ? 'Fully Paid' : 'Partial Payment'}
              </p>
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="pt-4 grid grid-cols-2 gap-6 text-center text-xs print:pt-2 print:text-[9px]">
            <div className="pt-4 print:pt-3">
              <div className="border-b border-slate-400 mb-1"></div>
              <p className="font-semibold text-slate-700 print:text-black">Student / Parent Signature</p>
              <p className="text-[10px] text-slate-400 print:text-black">Acknowledged receipt</p>
            </div>
            <div className="pt-4 print:pt-3">
              <div className="border-b border-slate-400 mb-1 font-bold font-cinzel text-slate-900 print:text-black">
                {receipt.cashier_name || 'Maria Santos'}
              </div>
              <p className="font-bold text-slate-800 print:text-black">Authorized School Cashier</p>
              <p className="text-[10px] text-slate-400 print:text-black">Calvary Christian Academy</p>
            </div>
          </div>

          {/* Institutional Footer */}
          <div className="mt-4 pt-2.5 border-t border-dashed border-slate-200 text-center print:mt-2">
            <p className="text-[10px] text-slate-400 print:text-black">
              Official Computer-Generated Receipt • Soft-Copy automatically preserved in Student Profile.
            </p>
            <p className="text-[9px] text-slate-400 print:text-black font-mono mt-0.5">
              CCA FlowSys v1.0 • Calvary Christian Academy Cashiering & Anomaly Detection System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
