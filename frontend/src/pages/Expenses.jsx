import { useState, useEffect } from 'react';
import {
  Plus, Search, TrendingDown, FileText, X, Trash2,
  CheckCircle, XCircle, Printer, ArrowLeft, ArrowRight,
  Clock, ShieldAlert, Check, Ban
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [page, setPage] = useState(0);
  const addToast = useToast();
  const user = JSON.parse(localStorage.getItem('cca_cf_user') || '{}');
  const canApprove = ['Admin', 'Principal'].includes(user?.role);

  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    payee: '',
    payment_method: 'Cash',
    reference_number: '',
    voucher_number: '',
    remarks: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [search, filterCat, filterStatus, page]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expenses/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { skip: page * 15, limit: 15, school_year: '2026-2027' };
      if (search) params.search = search;
      if (filterCat) params.category_id = filterCat;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/expenses/', { params });
      setExpenses(res.data.items);
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
      await api.post('/expenses/', {
        ...form,
        category_id: parseInt(form.category_id),
        amount: parseFloat(form.amount),
      });
      addToast('Disbursement voucher created successfully!', 'success');
      setShowModal(false);
      resetForm();
      fetchExpenses();
      fetchCategories();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to record expense', 'error');
    }
  };

  const handleApprove = async (id, voucher) => {
    try {
      await api.put(`/expenses/${id}/approve`);
      addToast(`Disbursement voucher ${voucher || ''} approved!`, 'success');
      fetchExpenses();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to approve voucher', 'error');
    }
  };

  const handleReject = async (id, voucher) => {
    if (!window.confirm(`Reject disbursement voucher ${voucher || ''}?`)) return;
    try {
      await api.put(`/expenses/${id}/reject`);
      addToast('Expense voucher rejected', 'warning');
      fetchExpenses();
    } catch (err) {
      addToast('Failed to reject voucher', 'error');
    }
  };

  const handleVoid = async (id, desc) => {
    if (!window.confirm(`Are you sure you want to void expense record "${desc}"?`)) return;
    try {
      await api.delete(`/expenses/${id}`);
      addToast('Expense voucher voided', 'info');
      fetchExpenses();
      fetchCategories();
    } catch (err) {
      addToast('Failed to void expense record', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      category_id: categories[0]?.id?.toString() || '',
      amount: '',
      description: '',
      payee: '',
      payment_method: 'Cash',
      reference_number: '',
      voucher_number: `DV-${Math.floor(100000 + Math.random() * 900000)}`,
      remarks: '',
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const totalPages = Math.ceil(total / 15);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1.5" /> Pending Review
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Ban className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Expense Disbursements & Vouchers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Process vendor vouchers, utility bills, maintenance charges, and administrative approvals.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Record Expense
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search voucher#, payee, item..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
          </div>

          <div className="w-40">
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

          <div className="w-36">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-cinzel">
            {total} Vouchers
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-4">Voucher Number</th>
                <th className="py-3.5 px-4">Payee / Creditor</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Particulars</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Voucher</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading expense vouchers...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No expense records found matching criteria.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-rose-700 dark:text-rose-300">
                      {exp.voucher_number || '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                      {exp.payee || 'Direct Vendor'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-100 dark:border-rose-800">
                        {exp.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(exp.status)}</td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(exp.date_recorded).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -{formatPeso(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedVoucher(exp)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        title="View Disbursement Voucher"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {canApprove && exp.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(exp.id, exp.voucher_number)}
                              className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                              title="Approve Voucher"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(exp.id, exp.voucher_number)}
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Reject Voucher"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleVoid(exp.id, exp.description)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Void Voucher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {/* Record Expense Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Disbursement Voucher">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Expense Category *
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
                Disbursement Voucher #
              </label>
              <input
                type="text"
                value={form.voucher_number}
                onChange={(e) => setForm({ ...form, voucher_number: e.target.value })}
                placeholder="DV-123456"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Payee / Beneficiary *
              </label>
              <input
                type="text"
                required
                value={form.payee}
                onChange={(e) => setForm({ ...form, payee: e.target.value })}
                placeholder="Vendor, Staff, or Utility Provider"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
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
                <option value="Check">Check</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Petty Cash">Petty Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
                Reference / Check #
              </label>
              <input
                type="text"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="Check number or billing ref"
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Particulars / Purpose of Expenditure *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. October Electricity Bill - Main Campus"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Additional Remarks
            </label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Invoice number, purchase request code..."
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
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-sm font-cinzel uppercase tracking-wider cursor-pointer"
            >
              Submit Voucher
            </button>
          </div>
        </form>
      </Modal>

      {/* Disbursement Voucher Printable Preview */}
      {selectedVoucher && (
        <Modal
          isOpen={!!selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          title="Disbursement Voucher"
          maxWidth="max-w-xl"
        >
          <div className="printable-area bg-white p-6 rounded-2xl border border-slate-200 text-slate-800">
            {/* Header */}
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
                Disbursement & Expenditure Voucher
              </p>
            </div>

            {/* Voucher Metadata */}
            <div className="flex justify-between items-center text-xs mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Processed</span>
                <span className="font-semibold">
                  {new Date(selectedVoucher.date_recorded).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher Code</span>
                <span className="font-mono font-bold text-rose-700 text-sm">
                  {selectedVoucher.voucher_number || 'N/A'}
                </span>
              </div>
            </div>

            {/* Particulars */}
            <div className="space-y-2 text-xs py-3 border-y border-slate-100 my-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Payee / Beneficiary:</span>
                <span className="font-bold text-slate-800">{selectedVoucher.payee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Budget Category:</span>
                <span className="font-semibold text-rose-700">{selectedVoucher.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Particulars:</span>
                <span className="font-medium text-slate-800 text-right max-w-sm">
                  {selectedVoucher.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Disbursement Channel:</span>
                <span className="font-medium text-slate-700">{selectedVoucher.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval Status:</span>
                <span className="font-bold text-slate-800">{selectedVoucher.status}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 bg-rose-50 rounded-xl px-4 my-4">
              <span className="font-bold text-xs uppercase font-cinzel text-rose-900 tracking-wider">
                Total Amount Payable
              </span>
              <span className="text-base font-extrabold text-rose-700 font-mono">
                {formatPeso(selectedVoucher.amount)}
              </span>
            </div>

            {/* Approval Signatures */}
            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div>
                <div className="border-b border-slate-400 mb-1" />
                <span className="text-slate-500 uppercase">Prepared By (Accountant)</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1" />
                <span className="text-slate-500 uppercase">Checked By (Cashier)</span>
              </div>
              <div>
                <div className="border-b border-slate-400 mb-1" />
                <span className="text-slate-500 uppercase">Approved (Principal)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print Voucher
            </button>
            <button
              onClick={() => setSelectedVoucher(null)}
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
