import { useState, useEffect } from 'react';
import {
  Wallet, Plus, AlertTriangle, CheckCircle2,
  Trash2, Edit3, ArrowUpRight, TrendingUp, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { StatCard } from './Dashboard';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const addToast = useToast();

  const [form, setForm] = useState({
    category_id: '',
    allocated_amount: '',
    school_year: '2026-2027',
  });

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, []);

  const fetchBudgets = async () => {
    try {
      const res = await api.get('/dashboard/budgets');
      setBudgets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/expenses/categories');
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await api.put(`/dashboard/budgets/${editingBudget.id}`, {
          allocated_amount: parseFloat(form.allocated_amount),
        });
        addToast('Budget allocation updated successfully!', 'success');
      } else {
        await api.post('/dashboard/budgets', {
          ...form,
          category_id: parseInt(form.category_id),
          allocated_amount: parseFloat(form.allocated_amount),
        });
        addToast('New budget allocation registered!', 'success');
      }
      setShowModal(false);
      setEditingBudget(null);
      setForm({ category_id: '', allocated_amount: '', school_year: '2026-2027' });
      fetchBudgets();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save budget allocation', 'error');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setForm({
      category_id: budget.category_id.toString(),
      allocated_amount: budget.allocated_amount.toString(),
      school_year: budget.school_year,
    });
    setShowModal(true);
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Delete budget allocation for "${catName}"?`)) return;
    try {
      await api.delete(`/dashboard/budgets/${id}`);
      addToast('Budget allocation deleted', 'info');
      fetchBudgets();
    } catch (err) {
      addToast('Failed to delete budget allocation', 'error');
    }
  };

  const totalAllocated = budgets.reduce((s, b) => s + b.allocated_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent_amount, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallUtilization = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const chartData = budgets.map((b) => ({
    name: b.category_name.length > 15 ? b.category_name.substring(0, 15) + '...' : b.category_name,
    Allocated: b.allocated_amount,
    Spent: b.spent_amount,
    color: b.category_color,
  }));

  const getProgressColor = (pct) => {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Annual Budget Allocation & Caps
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set and track departmental spending ceilings for School Year 2026-2027.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBudget(null);
            setForm({
              category_id: categories[0]?.id?.toString() || '',
              allocated_amount: '',
              school_year: '2026-2027',
            });
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition font-cinzel uppercase tracking-wider cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Allocate Budget
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Budget Allocated"
          value={formatPeso(totalAllocated)}
          sub="Approved annual allocations"
          icon={Wallet}
          color="text-brand-600 dark:text-brand-400"
          accentBg="bg-brand-50 dark:bg-brand-950/60"
        />

        <StatCard
          label="Total Disbursed"
          value={formatPeso(totalSpent)}
          sub={`Disbursed across all categories`}
          icon={TrendingUp}
          color="text-rose-500"
          accentBg="bg-rose-50 dark:bg-rose-950/60"
          trendUp={false}
        />

        <StatCard
          label="Remaining Allocation"
          value={formatPeso(totalRemaining)}
          sub={totalRemaining >= 0 ? 'Surplus capital available' : 'Budget deficit occurred'}
          icon={DollarSign}
          color={totalRemaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}
          accentBg={totalRemaining >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-rose-50 dark:bg-rose-950/60'}
          trendUp={totalRemaining >= 0}
        />

        <StatCard
          label="Overall Utilization"
          value={`${overallUtilization.toFixed(1)}%`}
          sub={overallUtilization < 90 ? 'Within safety margins' : 'Critical budget usage'}
          icon={AlertTriangle}
          color={overallUtilization < 80 ? 'text-emerald-500' : 'text-amber-500'}
          accentBg={overallUtilization < 80 ? 'bg-emerald-50 dark:bg-emerald-950/60' : 'bg-amber-50 dark:bg-amber-950/60'}
        />
      </div>

      {/* Comparative Bar Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
                Allocated vs Actual Spent Comparison
              </h3>
              <p className="text-[11px] text-slate-400">Departmental expenditure vs authorized ceiling</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatPeso(val), '']}
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #475569',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={32}
                  formatter={(val) => (
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>
                  )}
                />
                <Bar dataKey="Allocated" fill="#0a4fbc" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Spent" fill="#bc0c31" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Budget Category Progress Cards & Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
              Category Utilization & Progress
            </h3>
            <p className="text-[11px] text-slate-400">Detailed balances and alert thresholds</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-cinzel">
            {budgets.length} Categories
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-4">Expense Category</th>
                <th className="py-3.5 px-4">School Year</th>
                <th className="py-3.5 px-4 text-right">Allocated</th>
                <th className="py-3.5 px-4 text-right">Spent</th>
                <th className="py-3.5 px-4 text-right">Remaining</th>
                <th className="py-3.5 px-4 min-w-[180px]">Utilization Progress</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading budget allocations...
                  </td>
                </tr>
              ) : budgets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No budget allocations configured for this school year. Click "Allocate Budget" above.
                  </td>
                </tr>
              ) : (
                budgets.map((b) => {
                  const pct = b.utilization_pct || 0;
                  const isOver = pct >= 100;
                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: b.category_color || '#3b82f6' }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {b.category_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono">
                        {b.school_year}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-200">
                        {formatPeso(b.allocated_amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatPeso(b.spent_amount)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          b.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatPeso(b.remaining)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-bold shrink-0 ${
                              isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleEdit(b)}
                            className="p-1 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Edit Allocation"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id, b.category_name)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete Allocation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate / Edit Budget Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBudget ? 'Adjust Budget Allocation' : 'Allocate Annual Budget'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              Expense Department / Category *
            </label>
            <select
              required
              disabled={!!editingBudget}
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none disabled:opacity-60"
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
              Allocated Budget Cap (PHP) *
            </label>
            <input
              type="number"
              step="1000"
              min="0"
              required
              value={form.allocated_amount}
              onChange={(e) => setForm({ ...form, allocated_amount: e.target.value })}
              placeholder="e.g. 250000.00"
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none font-semibold text-sm"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 font-cinzel">
              School Year
            </label>
            <input
              type="text"
              disabled
              value={form.school_year}
              className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-mono outline-none"
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
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-sm font-cinzel uppercase tracking-wider cursor-pointer"
            >
              {editingBudget ? 'Update Cap' : 'Save Allocation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
