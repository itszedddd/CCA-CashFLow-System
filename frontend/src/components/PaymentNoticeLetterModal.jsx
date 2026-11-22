import React from 'react';
import { Printer, X } from 'lucide-react';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function PaymentNoticeLetterModal({ letterData, onClose }) {
  if (!letterData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { school, letter_date, student, parent, unpaid_fees, total_outstanding, signatories } = letterData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
        {/* Modal Controls - hidden on print */}
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              Official Statement of Account & Payment Notice
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Notice Letter</span>
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

        {/* Scrollable / Printable Letter Content */}
        <div className="p-6 sm:p-10 font-sans overflow-y-auto print:overflow-visible print:p-6 print:py-4" id="printable-letter">
          {/* Institutional School Letterhead */}
          <div className="text-center pb-3 border-b-2 border-slate-900/80 mb-3.5 print:pb-2 print:mb-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-900 font-serif leading-tight print:text-lg">
              Calvary Christian Academy
            </h1>
            <p className="text-xs text-slate-700 font-medium mt-0.5 print:text-[10px]">
              9-10 Genesis Ave., Sarmiento Townville Subdivision
            </p>
            <p className="text-xs text-slate-700 font-medium print:text-[10px]">
              Poblacion, City of San Jose del Monte, Bulacan
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5 font-mono print:text-[9.5px]">
              Cellphone No. 09561504946 / Globe Landline: 044-3056166
            </p>
          </div>

          {/* Letter Meta & Date */}
          <div className="flex justify-between items-center text-xs mb-3 print:mb-2">
            <p className="font-semibold text-slate-800">{letter_date}</p>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">
              Ref: NOTICE-{student.student_id}-2026
            </span>
          </div>

          {/* Addressee & Salutation */}
          <div className="text-xs text-slate-800 mb-3 print:mb-2 space-y-1">
            <p className="font-bold">
              Dear Mr. & Mrs. {parent?.name || 'Parents / Guardians'}
            </p>
            <p className="italic font-medium text-slate-700">
              Greetings in the name of our Lord and Saviour Jesus Christ!
            </p>
          </div>

          {/* Formal Body Paragraph - Exactly matching CCA Institutional Notice Letter */}
          <div className="text-xs text-slate-800 space-y-2 leading-relaxed mb-3.5 print:mb-2.5 print:space-y-1.5 text-justify">
            <p>
              This is a friendly reminder of your account balance here at school. We have decided that we will not be applying penalties for overdue tuition payments at this time. However, we do ask that you exert all effort to make monthly payments, no matter how small, in order to overcome this balance.
            </p>
            <p className="indent-4">
              Below, you will find an itemized list of your over due balance. Please come to the office at your earliest convenience in order to take care of these matters. If you feel that there has been some error, please contact the office as soon as possible, so that we may confirm our records.
            </p>
            <p>
              Thank you for your kind and immediate attention.
            </p>
          </div>

          {/* Student Identifier Subhead */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 pb-1 mb-1.5 border-b border-slate-200">
            <span>Student: <span className="uppercase">{student.full_name}</span></span>
            <span>Grade & Section: <span>{student.grade_level} - {student.section}</span></span>
          </div>

          {/* Itemized Table of Unpaid Fees */}
          <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden print:mb-3">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-300">
                <tr>
                  <th className="py-1.5 px-3 text-left">Fee Item</th>
                  <th className="py-1.5 px-3 text-left">Coverage / Notes</th>
                  <th className="py-1.5 px-3 text-right">Amount Due</th>
                  <th className="py-1.5 px-3 text-right">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {unpaid_fees && unpaid_fees.length > 0 ? (
                  unpaid_fees.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">{item.fee_type}</td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">{item.description}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPeso(item.outstanding_amount)}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[11px] text-slate-600 font-mono">
                        due date: {item.due_date === 'Immediate' ? 'March 16, 2026' : item.due_date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-2.5 text-center text-slate-400">
                      No outstanding balance found. All fees have been cleared.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-2 px-3 text-right uppercase text-xs text-slate-800">
                    Total Over Due Balance:
                  </td>
                  <td colSpan={2} className="py-2 px-3 text-right font-mono font-black text-rose-600 text-sm">
                    {formatPeso(total_outstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatories - Michelle Jean Gormley, Administrator */}
          <div className="pt-2 text-xs flex justify-between items-end">
            <div>
              <p className="text-slate-500 mb-4 print:mb-3 text-[11px]">Prepared by:</p>
              <div className="border-b border-slate-400 mb-0.5 w-44 font-bold text-slate-900">
                {signatories?.cashier || 'Maria Santos'}
              </div>
              <p className="text-[11px] font-semibold text-slate-700">{signatories?.cashier_title || 'School Cashier'}</p>
            </div>

            <div className="text-right">
              <p className="text-slate-500 mb-4 print:mb-3 text-[11px]">Approved by:</p>
              <div className="border-b border-slate-400 mb-0.5 w-48 font-bold text-slate-900 ml-auto">
                {signatories?.administrator || 'Michelle Jean Gormley'}
              </div>
              <p className="text-[11px] font-semibold text-slate-700">{signatories?.administrator_title || 'Administrator'}</p>
              <p className="text-[10px] text-slate-500">Calvary Christian Academy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
