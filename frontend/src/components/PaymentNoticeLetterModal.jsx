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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:static print:inset-auto print:block print:p-0 print:bg-white">
      <div className="bg-white text-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full print:max-h-none print:rounded-none">
        {/* Modal Controls - hidden on print */}
        <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              Payment Notice Letter
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Print Notice Letter</span>
              <span className="sm:hidden">Print (1-Page)</span>
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
        <div
          className="p-5 sm:p-8 font-sans overflow-y-auto print:overflow-visible print:p-0 print:text-black"
          id="printable-letter"
        >
          {/* Institutional School Letterhead */}
          <div className="text-center pb-2.5 border-b-2 border-slate-900 mb-2.5 print:pb-1.5 print:mb-2">
            <div className="flex items-center justify-center gap-2.5 mb-1 print:gap-2">
              <img
                src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                alt="CCA Logo"
                className="h-12 sm:h-14 w-auto object-contain print:h-10 shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="text-left">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-slate-900 font-cinzel uppercase leading-tight print:text-sm">
                  {school?.name || 'CALVARY CHRISTIAN ACADEMY'}
                </h1>
                <p className="text-[10px] text-brand-600 font-bold tracking-widest font-cinzel uppercase print:text-[8.5px] print:text-slate-800">
                  Office of the School Cashier & Finance
                </p>
                <p className="text-[9px] text-slate-500 print:text-[8px] print:text-slate-700">
                  {school?.tagline || 'Quality Christian Education for Excellence & Character'}
                </p>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 print:text-[8px] print:text-slate-700">
              {school?.address || 'Calvary Christian Academy Campus, Bulacan, Philippines'} • Tel: {school?.contact || '(044) 123-4567'}
            </p>
          </div>

          {/* Letter Meta */}
          <div className="flex justify-between items-center text-xs mb-2.5 print:mb-1.5 print:text-[9px]">
            <div>
              <p className="font-bold text-slate-800 print:text-black">Date: {letter_date}</p>
              <p className="text-slate-500 print:text-slate-700 text-[10px] print:text-[8px]">Ref: NOTICE-{student.student_id}-2026</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 font-cinzel print:border-slate-800 print:text-black print:bg-transparent">
                Notice of Outstanding Balance
              </span>
            </div>
          </div>

          {/* Addressee */}
          <div className="text-xs mb-2.5 space-y-0.5 bg-slate-50/70 print:bg-transparent p-2.5 print:p-0 rounded-xl border border-slate-100 print:border-none print:mb-1.5 print:text-[9.5px]">
            <p className="font-bold text-slate-800 print:text-black uppercase text-xs print:text-[10px]">
              {parent?.name ? `To: Mr./Ms. ${parent.name}` : 'To the Parents / Guardians of:'}
            </p>
            <p className="font-semibold text-brand-600 print:text-black">
              Student: <span className="uppercase text-slate-900 print:text-black font-bold">{student.full_name}</span> (LRN: {student.student_id})
            </p>
            <div className="flex flex-wrap gap-x-4 text-slate-600 print:text-black text-[11px] print:text-[9px]">
              <p>Grade Level & Section: <span className="font-medium text-slate-800 print:font-bold">{student.grade_level} - {student.section}</span></p>
              <p>School Year: <span className="font-medium text-slate-800 print:font-bold">{student.school_year}</span></p>
            </div>
          </div>

          {/* Formal Body Paragraph */}
          <div className="text-xs print:text-[9.5px] text-slate-700 print:text-black space-y-1 leading-snug mb-2.5 print:mb-1.5 print:space-y-0.5 text-justify">
            <p className="font-bold">Dear Mr./Ms. {parent?.name || 'Parent/Guardian'},</p>
            <p>
              Christian Greetings in the blessed name of our Lord Jesus Christ!
            </p>
            <p>
              We would like to formally bring to your kind attention the outstanding financial balance for your child,{' '}
              <strong>{student.full_name}</strong>, enrolled in <strong>{student.grade_level} - {student.section}</strong> for the School Year <strong>{student.school_year}</strong>. As per our official school cashier records, please find below the itemized breakdown of unpaid fees:
            </p>
          </div>

          {/* Itemized Table of Unpaid Fees */}
          <div className="mb-2.5 border border-slate-300 rounded-lg overflow-hidden print:mb-1.5 print:border-slate-800">
            <table className="w-full text-xs print:text-[9px]">
              <thead className="bg-slate-100 print:bg-slate-200 text-slate-700 print:text-black font-cinzel font-bold text-[9px] uppercase border-b border-slate-300 print:border-slate-800">
                <tr>
                  <th className="py-1.5 px-2.5 text-left">Fee Category</th>
                  <th className="py-1.5 px-2.5 text-left">Description</th>
                  <th className="py-1.5 px-2.5 text-right">Assessment</th>
                  <th className="py-1.5 px-2.5 text-right">Amount Paid</th>
                  <th className="py-1.5 px-2.5 text-right">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {unpaid_fees && unpaid_fees.length > 0 ? (
                  unpaid_fees.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 print:hover:bg-transparent">
                      <td className="py-1 px-2.5 font-bold text-slate-900 print:text-black whitespace-nowrap">{item.fee_type}</td>
                      <td className="py-1 px-2.5 text-slate-600 print:text-black text-[10px] print:text-[8.5px]">{item.description}</td>
                      <td className="py-1 px-2.5 text-right font-mono text-slate-700 print:text-black whitespace-nowrap">{formatPeso(item.total_due)}</td>
                      <td className="py-1 px-2.5 text-right font-mono text-emerald-600 print:text-black whitespace-nowrap">{formatPeso(item.total_paid)}</td>
                      <td className="py-1 px-2.5 text-right font-mono font-bold text-rose-600 print:text-black whitespace-nowrap">
                        {formatPeso(item.outstanding_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-2 text-center text-slate-400 print:text-black">
                      No outstanding balance found. All fees have been cleared.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 print:bg-slate-100 font-bold border-t border-slate-300 print:border-slate-800">
                <tr>
                  <td colSpan={4} className="py-1.5 px-2.5 text-right uppercase font-cinzel text-[10px] print:text-[8.5px] text-slate-800 print:text-black">
                    Total Outstanding Balance Due:
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-black text-rose-600 print:text-black text-xs print:text-[10px] whitespace-nowrap">
                    {formatPeso(total_outstanding)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Call to action & Payment instructions */}
          <div className="text-[11px] print:text-[8.5px] text-slate-700 print:text-black space-y-1 leading-snug mb-3 print:mb-2 print:leading-tight text-justify">
            <p>
              We kindly request you to settle the outstanding balance at the <strong>Calvary Christian Academy Cashier Window</strong> during regular school hours (Monday to Friday, 8:00 AM to 4:00 PM). Payments are accepted via Cash, GCash, or Bank Transfer.
            </p>
            <p>
              If payment has recently been made, please present your Official Receipt to the Cashier for ledger updating. Thank you for your continuous support and partnership in providing quality Christian education to our students. God bless you and your family!
            </p>
          </div>

          {/* Signatories */}
          <div className="grid grid-cols-2 gap-6 sm:gap-8 pt-2 text-xs print:text-[9px] print:pt-1">
            <div>
              <p className="text-slate-500 print:text-black mb-4 print:mb-3">Prepared by:</p>
              <div className="border-b border-slate-600 mb-0.5 w-44 font-bold font-cinzel text-slate-900 print:text-black">
                {signatories?.cashier || 'Maria Santos'}
              </div>
              <p className="font-bold text-slate-800 print:text-black text-[10px] print:text-[8.5px]">{signatories?.cashier_title || 'School Cashier'}</p>
              <p className="text-[9px] print:text-[8px] text-slate-500 print:text-black">Calvary Christian Academy</p>
            </div>
            <div>
              <p className="text-slate-500 print:text-black mb-4 print:mb-3">Noted by:</p>
              <div className="border-b border-slate-600 mb-0.5 w-48 font-bold font-cinzel text-slate-900 print:text-black">
                {signatories?.principal || 'Pastor David Reyes, M.Div.'}
              </div>
              <p className="font-bold text-slate-800 print:text-black text-[10px] print:text-[8.5px]">{signatories?.principal_title || 'School Principal'}</p>
              <p className="text-[9px] print:text-[8px] text-slate-500 print:text-black">Calvary Christian Academy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
