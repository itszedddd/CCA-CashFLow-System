import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, Clock,
  ArrowUpRight, ArrowDownRight, BarChart3, AlertCircle,
  Plus, Calendar, ArrowRight, ShieldCheck, Wallet
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';

const formatPeso = (val) =>
  `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

export const StatCard = ({ label, value, sub, icon: Icon, color, accentBg, trendUp = null }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between h-full">
    <div className="absolute top-0 right-0 p-5 opacity-[0.04] group-hover:opacity-[0.09] transition-opacity pointer-events-none">
      <Icon className={`w-20 h-20 ${color}`} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-cinzel">
          {label}
        </p>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accentBg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white break-words">
        {value}
      </h3>
    </div>
    <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-2.5 relative z-10 flex items-center gap-1 font-medium">
      {trendUp === true && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />}
      {trendUp === false && <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />}
      <span>{sub}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Loading Financial Overview...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">Unable to Load Dashboard Data</h3>
        <p className="text-xs text-slate-400 mt-1">Please ensure the backend service is running and retry.</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isNetPositive = stats.net_cashflow >= 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white font-cinzel tracking-tight">
            Financial Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time cashflow metrics, income streams, and disbursements for School Year 2026-2027.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/income"
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Record Income
          </Link>
          <Link
            to="/expenses"
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Record Expense
          </Link>
        </div>
      </div>

      {/* 4 Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Income"
          value={formatPeso(stats.total_income)}
          sub={`This month: ${formatPeso(stats.income_this_month)}`}
          icon={TrendingUp}
          color="text-emerald-500"
          accentBg="bg-emerald-50 dark:bg-emerald-950/60"
          trendUp={true}
        />

        <StatCard
          label="Total Expenses"
          value={formatPeso(stats.total_expenses)}
          sub={`This month: ${formatPeso(stats.expenses_this_month)}`}
          icon={TrendingDown}
          color="text-rose-500"
          accentBg="bg-rose-50 dark:bg-rose-950/60"
          trendUp={false}
        />

        <StatCard
          label="Net CashFlow"
          value={formatPeso(stats.net_cashflow)}
          sub={isNetPositive ? 'Healthy Operating Surplus' : 'Disbursements Exceed Inflow'}
          icon={DollarSign}
          color={isNetPositive ? 'text-brand-600 dark:text-brand-400' : 'text-rose-500'}
          accentBg={isNetPositive ? 'bg-brand-50 dark:bg-brand-950/60' : 'bg-rose-50 dark:bg-rose-950/60'}
          trendUp={isNetPositive}
        />

        <StatCard
          label="Pending Approvals"
          value={stats.pending_expenses.toString()}
          sub={stats.pending_expenses > 0 ? 'Vouchers awaiting sign-off' : 'All vouchers reviewed'}
          icon={Clock}
          color="text-amber-500"
          accentBg="bg-amber-50 dark:bg-amber-950/60"
        />
      </div>

      {/* Monthly Trend Area Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
              12-Month Cashflow Trajectory
            </h3>
            <p className="text-[11px] text-slate-400">Monthly comparison of tuition & revenue vs expenditures</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Income
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Expenses
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthly_trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
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
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#incomeGrad)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseGrad)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column: Category Breakdowns (Income & Expense) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
              Revenue Breakdown by Category
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.income_by_category.length} sources
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.income_by_category}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {stats.income_by_category.map((entry, index) => (
                    <Cell key={`cell-inc-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
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
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
              Disbursements by Department / Category
            </h3>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {stats.expenses_by_category.length} categories
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.expenses_by_category}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {stats.expenses_by_category.map((entry, index) => (
                    <Cell key={`cell-exp-${index}`} fill={entry.color || '#ef4444'} />
                  ))}
                </Pie>
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
                  verticalAlign="bottom"
                  height={36}
                  formatter={(val) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-cinzel tracking-wider uppercase">
              Recent Financial Transactions
            </h3>
            <p className="text-[11px] text-slate-400">Latest recordings across all revenue and expenditure vouchers</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/income"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 flex items-center font-cinzel"
            >
              Incomes <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <Link
              to="/expenses"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 flex items-center font-cinzel"
            >
              Expenses <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Date Recorded</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {stats.recent_transactions.map((tx, idx) => {
                const isIncome = tx.type === 'income';
                return (
                  <tr
                    key={`tx-${idx}`}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isIncome ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                      {tx.description}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {tx.category}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(tx.date).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatPeso(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
