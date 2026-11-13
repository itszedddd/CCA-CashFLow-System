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
          <div className="text-center pb-4 border-b-2 border-slate-900/80 mb-4 print:pb-3 print:mb-3">
            <div className="flex items-center justify-center gap-3 mb-1.5">
              <img
                src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                alt="CCA Logo"
                className="h-14 sm:h-16 w-auto object-contain shrink-0 print:h-12"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-left min-w-0">
                <h1 className="text-lg sm:text-xl font-black tracking-wider text-slate-900 font-cinzel uppercase leading-tight print:text-base">
                  {school?.name || 'CALVARY CHRISTIAN ACADEMY'}
                </h1>
                <p className="text-[11px] text-brand-600 font-bold tracking-widest font-cinzel uppercase print:text-[9px]">
                  Office of the School Cashier & Finance
                </p>
                <p className="text-[10px] text-slate-500 print:text-[8.5px]">
                  {school?.tagline || 'Quality Christian Education for Excellence & Character'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 print:text-[8.5px]">
              {school?.address || 'Calvary Christian Academy Campus, Bulacan, Philippines'} • Tel: {school?.contact || '(044) 123-4567'}
            </p>
          </div>

          {/* Letter Meta */}
          <div className="flex justify-between items-start text-xs mb-4 gap-2 print:mb-3">
            <div className="min-w-0">
              <p className="font-bold text-slate-800">Date: {letter_date}</p>
              <p className="text-slate-500 mt-0.5 text-[11px]">Ref: NOTICE-{student.student_id}-2026</p>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-cinzel">
                Notice of Outstanding Balance
              </span>
            </div>
          </div>

          {/* Addressee */}
          <div className="text-xs mb-4 space-y-1 bg-slate-50/60 print:bg-transparent p-3 print:p-0 rounded-xl border border-slate-100 print:border-none print:mb-3">
            <p className="font-bold text-slate-800 uppercase text-xs">{parent?.name ? `To: Mr./Ms. ${parent.name}` : 'To the Parents / Guardians of:'}</p>
            <p className="font-semibold text-brand-600">
              Student: <span className="uppercase text-slate-900 font-bold">{student.full_name}</span> (LRN: {student.student_id})
            </p>
            <div className="flex flex-wrap gap-x-4 text-slate-600">
              <p>Grade Level & Section: <span className="font-medium text-slate-800">{student.grade_level} - {student.section}</span></p>
              <p>School Year: <span className="font-medium text-slate-800">{student.school_year}</span></p>
            </div>
          </div>

          {/* Formal Body Paragraph */}
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed mb-4 print:mb-3 print:space-y-1.5 text-justify">
            <p className="font-bold">Dear Mr./Ms. {parent?.name || 'Parent/Guardian'},</p>
            <p>
              Christian Greetings in the blessed name of our Lord Jesus Christ!
            </p>
            <p>
              We would like to formally bring to your kind attention the outstanding financial balance for your child,{' '}
              <strong>{student.full_name}</strong>, enrolled in <strong>{student.grade_level} - {student.section}</strong> for the School Year <strong>{student.school_year}</strong>.
            </p>
            <p>
              As per our official school cashier records, please find below the itemized breakdown of unpaid fees and charges as of today:
            </p>
          </div>

          {/* Itemized Table of Unpaid Fees */}
          <div className="mb-4 border border-slate-300 rounded-xl overflow-hidden print:mb-3">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-cinzel font-bold text-[10px] uppercase border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 text-left">Fee Category</th>
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-right">Total Assessment</th>
                  <th className="py-2 px-3 text-right">Amount Paid</th>
                  <th className="py-2 px-3 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {unpaid_fees && unpaid_fees.length > 0 ? (
                  unpaid_fees.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                      <td className="py-1.5 px-3 font-bold text-slate-900 whitespace-nowrap">{item.fee_type}</td>
                      <td className="py-1.5 px-3 text-slate-600 text-[11px]">{item.description}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">{formatPeso(item.total_due)}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-600 whitespace-nowrap">{formatPeso(item.total_paid)}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {formatPeso(item.outstanding_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400">
                      No outstanding balance found. All fees have been cleared.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right uppercase font-cinzel text-xs text-slate-800">
                    Total Outstanding Balance Due:
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black text-rose-600 text-sm whitespace-nowrap">
                    {formatPeso(total_outstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Call to action & Payment instructions */}
          <div className="text-xs text-slate-700 space-y-2 leading-relaxed mb-5 print:mb-4 print:space-y-1.5 text-justify">
            <p>
              We kindly request you to settle the outstanding balance at the <strong>Calvary Christian Academy Cashier Window</strong> during regular school hours (Monday to Friday, 8:00 AM to 4:00 PM). Payments can be made in Cash (via Cashier Window or Student Brown Envelope).
            </p>
            <p>
              If payment has recently been made, please present your Official Receipt to the Cashier for immediate verification and ledger updating. If you have any inquiries regarding the balance breakdown, feel free to visit our office or contact our cashier.
            </p>
            <p>
              Thank you for your continuous support and partnership in providing quality Christian education to our students. God bless you and your family!
            </p>
          </div>

          {/* Signatories */}
          <div className="grid grid-cols-2 gap-6 sm:gap-10 pt-2 text-xs">
            <div>
              <p className="text-slate-500 mb-5 print:mb-4">Prepared by:</p>
              <div className="border-b border-slate-400 mb-1 w-full max-w-[180px] font-bold font-cinzel text-slate-900">
                {signatories?.cashier || 'Maria Santos'}
              </div>
              <p className="font-bold text-slate-800">{signatories?.cashier_title || 'School Cashier'}</p>
              <p className="text-[10px] text-slate-500">Calvary Christian Academy</p>
            </div>
            <div>
              <p className="text-slate-500 mb-5 print:mb-4">Noted by:</p>
              <div className="border-b border-slate-400 mb-1 w-full max-w-[200px] font-bold font-cinzel text-slate-900">
                {signatories?.principal || 'Pastor David Reyes, M.Div.'}
              </div>
              <p className="font-bold text-slate-800">{signatories?.principal_title || 'School Principal'}</p>
              <p className="text-[10px] text-slate-500">Calvary Christian Academy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
