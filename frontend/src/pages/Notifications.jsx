import { useState, useEffect } from 'react';
import {
  Bell, Plus, Calendar, DollarSign, Send, CheckCircle2,
  AlertCircle, Users, Sparkles, Filter, Megaphone
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const GRADE_OPTIONS = [
  'All Grades',
  'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
];

export default function Notifications() {
  const addToast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    fee_type: 'Other Fees',
    grade_level: 'All Grades',
    description: '',
    amount: '',
    due_date: ''
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (err) {
      addToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Please enter title and description', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        fee_type: form.fee_type,
        grade_level: form.grade_level === 'All Grades' ? null : form.grade_level,
        description: form.description,
        amount: parseFloat(form.amount) || 0.0,
        due_date: form.due_date || null
      };

      await api.post('/notifications/', payload);
      addToast('Payment announcement posted! Auto-reflected in parent accounts.', 'success');
      setShowModal(false);
      setForm({
        title: '',
        fee_type: 'Other Fees',
        grade_level: 'All Grades',
        description: '',
        amount: '',
        due_date: ''
      });
      fetchNotifications();
    } catch (err) {
      addToast('Failed to post notification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white font-cinzel tracking-tight uppercase">
            Payment Notifications & Fee Announcements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Post new fees, event contributions, and payment notices that automatically notify parents
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post Fee Announcement</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-cinzel">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-cinzel bg-brand-50 text-brand-700 dark:bg-slate-900 dark:text-brand-400 border border-brand-200 dark:border-slate-700 shrink-0">
                    {n.fee_type}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {n.grade_level ? `Target: ${n.grade_level}` : 'All Students'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 font-cinzel break-words">
                  {n.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 break-words">
                  {n.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Amount Due</p>
                  <p className="text-base font-black text-brand-600 dark:text-brand-400 font-mono truncate">
                    {formatPeso(n.amount)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Due Date</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {n.due_date || 'Standard'}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-cinzel">No Announcements Posted</p>
            <p className="text-xs text-slate-400 mt-1">Cashier has not posted any payment announcements yet.</p>
          </div>
        )}
      </div>

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                  Post Payment Announcement
                </h3>
                <p className="text-xs text-slate-400">
                  Notify parents of upcoming fees, tours, or school contributions
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Grade 4 Educational Tour Fee"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Fee Type
                  </label>
                  <select
                    value={form.fee_type}
                    onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Tuition Fee">Tuition Fee</option>
                    <option value="Registration Fee">Registration Fee</option>
                    <option value="Books">Books</option>
                    <option value="Energy Fee">Energy Fee</option>
                    <option value="Other Fees">Other Fees</option>
                    <option value="Educational Tour">Educational Tour</option>
                    <option value="Activity / Fair">Activity / Fair</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Target Grade
                  </label>
                  <select
                    value={form.grade_level}
                    onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Amount (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Detailed Notice / Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Explain the fee details, destination, or purpose..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

