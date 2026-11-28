import React from 'react';
import { Printer, X } from 'lucide-react';
import Modal from './Modal';
import { CCA_OFFICE_INFO, formatPeso } from '../utils/schoolData';

export default function PaymentNoticeLetterModal({ letterData, onClose }) {
  if (!letterData) return null;

  const handlePrint = () => {
    window.print();
  };

  const { letter_date, student, parent, unpaid_fees, total_outstanding, signatories } = letterData;
  const noticeYear = String(letter_date || '').match(/\d{4}$/)?.[0];

  return (
    <Modal
      isOpen={!!letterData}
      onClose={onClose}
      title="Official Statement of Account & Payment Notice"
      maxWidth="max-w-2xl"
      hideHeader
      printable
      autoFocusClose={false}
      className="bg-white"
    >
      <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-cinzel truncate">
              Official Statement of Account &amp; Payment Notice
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
              data-initial-focus="true"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-10 font-sans overflow-y-auto print:overflow-visible print:p-6 print:py-4" id="printable-letter">
          <div className="text-center pb-3 mb-4 print:pb-2 print:mb-2.5">
            <img
              src={CCA_OFFICE_INFO.crestLogoUrl}
              alt="Calvary Christian Academy Crest"
              className="h-14 w-auto mx-auto mb-2 object-contain print:h-12"
            />
            <h1 className="text-base sm:text-xl font-black tracking-wider text-[#022868] font-cinzel uppercase leading-tight print:text-base">
              {CCA_OFFICE_INFO.schoolName}
            </h1>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#022868] font-cinzel uppercase mt-0.5 print:text-xs">
              {CCA_OFFICE_INFO.officeName}
            </p>
            <p className="text-[10px] text-slate-600 mt-1 print:text-[9px]">{CCA_OFFICE_INFO.address}</p>
            <p className="text-[10px] text-slate-600 print:text-[9px]">{CCA_OFFICE_INFO.contact}</p>

            <div className="border-t-2 border-slate-800 my-3 print:my-2" />
            <h2 className="text-base sm:text-xl font-bold tracking-[0.22em] text-slate-900 font-cinzel uppercase py-0.5 print:text-base">
              Payment Notice
            </h2>
            <div className="border-b-2 border-slate-800 mt-3 print:mt-2" />
          </div>

          <div className="flex justify-between items-center text-xs mb-3 print:mb-2">
            <p className="font-semibold text-slate-800">{letter_date}</p>
            <span className="text-[10px] uppercase font-bold text-slate-500 font-cinzel">
              Ref: NOTICE-{student.student_id}{noticeYear ? `-${noticeYear}` : ''}
            </span>
          </div>

          <div className="text-xs text-slate-800 mb-3 print:mb-2 space-y-1">
            <p className="font-bold">Dear Mr. &amp; Mrs. {parent?.name || 'Parents / Guardians'}</p>
            <p className="italic font-medium text-slate-700">
              Greetings in the name of our Lord and Saviour Jesus Christ!
            </p>
          </div>

          <div className="text-xs text-slate-800 space-y-2 leading-relaxed mb-3.5 print:mb-2.5 print:space-y-1.5 text-justify">
            <p>
              This is a friendly reminder of your account balance here at school. We have decided that we will not be
              applying penalties for overdue tuition payments at this time. However, we do ask that you exert all
              effort to make monthly payments, no matter how small, in order to overcome this balance.
            </p>
            <p className="indent-4">
              Below, you will find an itemized list of your over due balance. Please come to the office at your
              earliest convenience in order to take care of these matters. If you feel that there has been some error,
              please contact the office as soon as possible, so that we may confirm our records.
            </p>
            <p>Thank you for your kind and immediate attention.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-900 pb-1.5 mb-2 border-b border-slate-200">
            <span>
              Student: <span className="uppercase">{student.full_name}</span> ({student.student_id})
            </span>
            <span>
              Grade &amp; Section: <span>{student.grade_level} - {student.section}</span>
            </span>
          </div>

          <div className="mb-4 border border-slate-300 rounded-lg overflow-hidden print:mb-3">
            <table className="w-full text-xs"><caption className="sr-only">payment notice letter modal records table 1</caption>
              <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-300">
                <tr>
                  <th scope="col" className="py-1.5 px-3 text-left">Fee Item</th>
                  <th scope="col" className="py-1.5 px-3 text-left">Coverage / Notes</th>
                  <th scope="col" className="py-1.5 px-3 text-right">Amount Due</th>
                  <th scope="col" className="py-1.5 px-3 text-right">Deadline</th>
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
                        due date: {item.due_date}
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

          <div className="pt-2 text-xs flex justify-between items-end">
            <div>
              <p className="text-slate-500 mb-4 print:mb-3 text-[11px]">Prepared by:</p>
              <div className="border-b border-slate-400 mb-0.5 w-44 font-bold text-slate-900">
                {signatories?.cashier || 'School Cashier'}
              </div>
              <p className="text-[11px] font-semibold text-slate-700">{signatories?.cashier_title || 'School Cashier'}</p>
            </div>

            <div className="text-right">
              <p className="text-slate-500 mb-4 print:mb-3 text-[11px]">Approved by:</p>
              <div className="border-b border-slate-400 mb-0.5 w-48 font-bold text-slate-900 ml-auto">
                {signatories?.administrator || 'Michelle Jean Gormley'}
              </div>
              <p className="text-[11px] font-semibold text-slate-700">
                {signatories?.administrator_title || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-500">Calvary Christian Academy</p>
            </div>
          </div>
      </div>
    </Modal>
  );
}
