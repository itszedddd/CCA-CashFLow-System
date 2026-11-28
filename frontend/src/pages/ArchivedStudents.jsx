import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, Search, RotateCcw, ChevronRight,
  AlertCircle, GraduationCap
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { GRADE_LEVELS, formatPeso, resolveSection } from '../utils/schoolData';

export default function ArchivedStudents() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [restoringId, setRestoringId] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);

  useEffect(() => {
    fetchArchived();
  }, [searchQuery, selectedGrade]);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const params = { archived: true };
      if (selectedGrade !== 'All') params.grade_level = selectedGrade;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      const res = await api.get('/students/', { params });
      setStudents(res.data || []);
    } catch {
      addToast('Failed to load archived students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (student) => {
    setRestoreTarget(student);
  };

  const confirmRestore = async () => {
    const student = restoreTarget;
    if (!student) return;
    setRestoringId(student.id);
    try {
      await api.post(`/students/${student.id}/unarchive`);
      addToast(`${student.full_name} restored successfully`, 'success');
      setRestoreTarget(null);
      await fetchArchived();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to restore student', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white font-cinzel uppercase tracking-tight">
                Archived Students
              </h2>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or LRN..."
                className="w-full sm:w-56 pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option value="All">All Grade Levels</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-14 text-center">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-cinzel mt-2">Loading archive...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center px-5">
            <AlertCircle className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No archived students found</p>
            <p className="text-xs text-slate-400 mt-1">
              Use the Archive button on a student in Collections to hide them without deleting records.
            </p>
          </div>
        ) : (
          <div role="region" aria-label="archived students data table 1" className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]"><caption className="sr-only">archived students records table 1</caption>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-widest font-cinzel">
                  <th scope="col" className="py-3 px-4">Student</th>
                  <th scope="col" className="py-3 px-3">LRN</th>
                  <th scope="col" className="py-3 px-3">Grade / Section</th>
                  <th scope="col" className="py-3 px-3 text-right">Outstanding</th>
                  <th scope="col" className="py-3 px-3">Archived</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-xs shrink-0">
                          {student.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white uppercase text-xs truncate">
                            {student.full_name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{student.parent_name || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-300 text-xs">
                      {student.student_id}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                        {student.grade_level} • {resolveSection(student.grade_level, student.section)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                      {formatPeso(student.outstanding_balance)}
                    </td>
                    <td className="py-3 px-3 text-[10px] text-slate-500 dark:text-slate-400">
                      <p>{student.archived_at ? new Date(student.archived_at).toLocaleString() : '—'}</p>
                      {student.archived_by && <p className="truncate max-w-[120px]">by {student.archived_by}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/collections/${student.id}`)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="View archived profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestore(student)}
                          disabled={restoringId === student.id}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg text-[10px] font-bold font-cinzel uppercase tracking-wider transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Restore to active collections"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={confirmRestore}
        title="Restore Student"
        message={
          restoreTarget
            ? `Restore ${restoreTarget.full_name} to the active Collections list?`
            : ''
        }
        confirmLabel="Restore Student"
        tone="restore"
        Icon={RotateCcw}
        busy={Boolean(restoreTarget) && restoringId === restoreTarget.id}
      />
    </div>
  );
}
