import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, BarChart3, AlertCircle,
  Plus, ArrowRight, CheckCircle2, Clock
} from 'lucide-react';
import PesoSign from '../components/PesoSign';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import api from '../api';
import { formatPeso, formatPHDate } from '../utils/schoolData';

export const StatCard = ({ label, value, sub, icon: Icon, color, accentBg, trendUp = null }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-slate-700 hover:shadow-[0_12px_30px_-6px_rgba(2,40,104,0.16)] transition-all relative overflow-hidden group flex flex-col justify-between h-full">
    <div className="absolute top-0 right-0 p-5 opacity-[0.05] group-hover:opacity-[0.10] transition-opacity pointer-events-none">
      <Icon className={`w-20 h-20 ${color}`} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-cinzel">
          {label}
        </p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${accentBg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white break-words font-mono">
        {value}
      </h3>
    </div>
    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 relative z-10 flex items-center gap-1 font-medium">
      <span>{sub}</span>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = (() => {
    try {
      return (JSON.parse(localStorage.getItem('cca_cf_user') || '{}')?.role || '').toLowerCase() === 'admin';
    } catch {
      return false;
    }
  })();

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
          <p className="text-xs font-semibold text-slate-400 font-cinzel">Loading Collections Overview...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-md text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white font-cinzel">Unable to Load Dashboard Data</h3>
        <p className="text-xs text-slate-400 mt-1">Please ensure the backend service is running and retry.</p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-cinzel tracking-tight truncate">
            Financial Dashboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time school revenue, tuition collections, and student ledger performance for SY 2026-2027.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to="/income"
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{isAdmin ? 'View Collections' : 'Manage Collections'}</span>
          </Link>
          {!isAdmin && (
            <Link
              to="/notifications"
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Post Payment Announcement</span>
            </Link>
          )}
        </div>
      </div>

      {/* 4 Revenue & Collections KPI Cards (Expenses & Expense Vouchers removed per Inspection 2.2.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total School Revenue"
          value={formatPeso(stats.total_income)}
          sub={`This month: ${formatPeso(stats.income_this_month)}`}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-400"
          accentBg="bg-emerald-50 dark:bg-emerald-950/60"
        />

        <StatCard
          label="Outstanding Balances"
          value={formatPeso(stats.total_outstanding_balances)}
          sub={`Expected: ${formatPeso(stats.total_expected_collections)}`}
          icon={PesoSign}
          color="text-rose-600 dark:text-rose-400"
          accentBg="bg-rose-50 dark:bg-rose-950/60"
        />

        <StatCard
          label="Collection Rate"
          value={`${stats.collection_rate || 0}%`}
          sub={`${stats.fully_paid_students || 0} of ${stats.total_students || 0} students fully paid`}
          icon={CheckCircle2}
          color="text-brand-600 dark:text-brand-400"
          accentBg="bg-brand-50 dark:bg-brand-950/60"
        />

        <StatCard
          label="Accounts With Balance"
          value={(stats.students_with_balance ?? 0).toString()}
          sub={`Out of ${stats.total_students || 0} enrolled students`}
          icon={Users}
          color="text-amber-600 dark:text-amber-400"
          accentBg="bg-amber-50 dark:bg-amber-950/60"
        />
      </div>

      {/* 12-Month School Revenue Comparison: 2026 vs 2025 (Inspection Report 2.2.3) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_6px_26px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-slate-700 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-cinzel tracking-wider uppercase">
              12-Month School Revenue Comparison (2026 vs. 2025)
            </h3>
            <p className="text-[11px] text-slate-400">
              Year-over-year monthly tuition &amp; school fee collection trajectory
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              2026 Revenue
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              2025 Revenue
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthly_revenue_comparison || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev2026Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="rev2025Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.45} />
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
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue_2026"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#rev2026Grad)"
                name="2026 School Revenue"
              />
              <Area
                type="monotone"
                dataKey="revenue_2025"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 4"
                fillOpacity={1}
                fill="url(#rev2025Grad)"
                name="2025 School Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Revenue Breakdowns (Disbursements graph removed per Inspection 2.2.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_6px_26px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-cinzel tracking-wider uppercase">
              Revenue Breakdown by Category
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {(stats.income_by_category || []).length} sources
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.income_by_category || []}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {(stats.income_by_category || []).map((entry, index) => (
                    <Cell key={`cell-inc-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [formatPeso(val), '']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(val) => <span className="text-[11px] text-slate-600 dark:text-slate-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Level Collection Performance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-[0_6px_26px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-cinzel tracking-wider uppercase">
              Collections by Grade Level
            </h3>
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
              Collected vs. Balance
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.grade_collections || []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                <XAxis dataKey="grade" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => [formatPeso(val), '']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Revenue Transactions Table (Expenses removed per Inspection 2.2.4) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_6px_26px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.5)] border border-slate-200/90 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-cinzel tracking-wider uppercase">
              Recent School Revenue Transactions
            </h3>
            <p className="text-[11px] text-slate-400">
              Latest student fee collections and verified OR issuances
            </p>
          </div>
          <Link
            to="/income"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 flex items-center font-cinzel shrink-0"
          >
            All Collections <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
                <th className="py-3 px-4">OR #</th>
                <th className="py-3 px-4">Description / Student</th>
                <th className="py-3 px-4">Fee Category</th>
                <th className="py-3 px-4">Date Recorded</th>
                <th className="py-3 px-4 text-right">Amount Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {(stats.recent_transactions || []).map((tx, idx) => (
                <tr key={`tx-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                    {tx.or_number || '—'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-white">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {tx.category}
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {formatPHDate(tx.date)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    +{formatPeso(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
