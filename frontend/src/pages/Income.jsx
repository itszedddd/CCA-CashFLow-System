import { useState, useEffect } from 'react';
import {
  Plus, Search, TrendingUp, Receipt, X, Trash2,
  Printer, ArrowLeft, ArrowRight, Filter
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [page, setPage] = useState(0);
  const addToast = useToast();

  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    or_number: '',
    payer_name: '',
    payer_type: 'Student',
    payment_method: 'Cash',
    reference_number: '',
    remarks: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchIncomes();
  }, [search, filterCat, page]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/income/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const params = { skip: page * 15, limit: 15, school_year: '2026-2027' };
      if (search) params.search = search;
      if (filterCat) params.category_id = filterCat;
      const res = await api.get('/income/', { params });
      setIncomes(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/income/', {
        ...form,
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
      });
      addToast('Income collection recorded successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchIncomes();
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to record income', 'error');
    }
  };

  const handleVoid = async (id, desc) => {
    if (!window.confirm(`Are you sure you want to void income record "${desc}"?`)) return;
    try {
      await api.delete(`/income/${id}`);
      addToast('Income record has been voided', 'info');
      fetchIncomes();
      fetchCategories();
    } catch (err) {
      addToast('Failed to void income record', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      category_id: categories[0]?.id?.toString() || '',
      amount: '',
      description: '',
      or_number: `OR-${Math.floor(100000 + Math.random() * 900000)}`,
      payer_name: '',
      payer_type: 'Student',
      payment_method: 'Cash',
      reference_number: '',
      remarks: '',
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Income & Revenue Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log, verify, and generate receipts for tuition, donations, registration, and miscellaneous fees.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Record Income
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search OR#, payer, details..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>

          <div className="w-44">
            <select
              value={filterCat}
              onChange={(e) => {
                setFilterCat(e.target.value);
                setPage(0);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-cinzel">
            {total} Entries
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-4">OR Number</th>
                <th className="py-3.5 px-4">Payer / Source</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Receipt</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading income records...
                  </td>
                </tr>
              ) : incomes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No income records found matching criteria.
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-700 dark:text-brand-300">
                      {inc.or_number || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {inc.payer_name || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-slate-400">{inc.payer_type}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-100 dark:border-brand-800">
                        {inc.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {inc.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {inc.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(inc.date_recorded).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +{formatPeso(inc.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedReceipt(inc)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="View Official Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleVoid(inc.id, inc.description)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Void record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Income Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record New Revenue / Collection">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Income Category *
              </label>
              <select
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Amount (PHP) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Official Receipt (OR) #
              </label>
              <input
                type="text"
                value={form.or_number}
                onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                placeholder="OR-123456"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Payer Name *
              </label>
              <input
                type="text"
                required
                value={form.payer_name}
                onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
                placeholder="Student, Parent, or Organization"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Payer Entity Type
              </label>
              <select
                value={form.payer_type}
                onChange={(e) => setForm({ ...form, payer_type: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="Student">Student</option>
                <option value="Parent">Parent</option>
                <option value="Donor">Donor</option>
                <option value="Alumni">Alumni</option>
                <option value="Organization">Organization</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Payment Channel
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer (BDO/BPI)</option>
                <option value="GCash">GCash</option>
                <option value="Check">Check</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Description / Particulars *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. October Tuition Fee - Grade 10 St. Jude"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Reference Number (Optional)
            </label>
            <input
              type="text"
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              placeholder="Check # or Bank Transaction Reference"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm font-cinzel uppercase tracking-wider cursor-pointer"
            >
              Save Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Receipt (OR) Preview Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title="Official Receipt Voucher"
          maxWidth="max-w-lg"
        >
          <div className="printable-area bg-white p-6 rounded-2xl border border-slate-200 text-slate-800">
            {/* CCA School Header */}
            <div className="text-center pb-4 border-b border-slate-200 mb-4">
              <div className="flex justify-center mb-2">
                <img
                  src="/assets/[CCA L3.2] CCA EduSys Logo V2 Blue Transparent.png"
                  alt="CCA Logo"
                  className="h-14 w-auto object-contain"
                  onError={(e) => {
                    e.target.src = '/cca-logo-full.png';
                  }}
                />
              </div>
              <h3 className="text-sm font-extrabold font-cinzel uppercase tracking-wider text-brand-900">
                Calvary Christian Academy
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Official Collection & Revenue Receipt
              </p>
            </div>

            {/* Receipt Details */}
            <div className="flex justify-between items-center text-xs mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date</span>
                <span className="font-semibold">
                  {new Date(selectedReceipt.date_recorded).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">OR Number</span>
                <span className="font-mono font-bold text-brand-700 text-sm">
                  {selectedReceipt.or_number || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs py-3 border-y border-slate-100 my-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Received From:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.payer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Classification:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.payer_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue Stream:</span>
                <span className="font-semibold text-brand-700">{selectedReceipt.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Particulars:</span>
                <span className="font-medium text-slate-800 text-right max-w-xs">
                  {selectedReceipt.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="font-medium text-slate-700">{selectedReceipt.payment_method}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 bg-emerald-50 rounded-xl px-4 my-4">
              <span className="font-bold text-xs uppercase font-cinzel text-emerald-900 tracking-wider">
                Total Amount Paid
              </span>
              <span className="text-base font-extrabold text-emerald-700 font-mono">
                {formatPeso(selectedReceipt.amount)}
              </span>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between text-center text-[10px]">
              <div>
                <div className="w-32 border-b border-slate-400 mb-1" />
                <span className="text-slate-500 uppercase">Received By (Cashier)</span>
              </div>
              <div>
                <div className="w-32 border-b border-slate-400 mb-1" />
                <span className="text-slate-500 uppercase">Authorized Signature</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={() => setSelectedReceipt(null)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
