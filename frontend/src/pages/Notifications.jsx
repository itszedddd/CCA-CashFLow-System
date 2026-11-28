import { useState, useEffect } from 'react';
import {
  Bell, Plus, CheckCircle2, Megaphone, Trash2, Calendar
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import { formatPeso, GRADE_LEVELS } from '../utils/schoolData';

const GRADE_OPTIONS = ['All Grades', ...GRADE_LEVELS];

export default function Notifications() {
  const addToast = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('cca_cf_user') || '{}');
    } catch {
      return {};
    }
  })();
  const isParent = (currentUser?.role || '').toLowerCase() === 'parent';
  const isAdmin = (currentUser?.role || '').toLowerCase() === 'admin';

  const [form, setForm] = useState({
    title: '',
    fee_type: 'Educational Tour',
    grade_level: 'All Grades',
    description: '',
    amount: '',
    due_date: ''
  });

  const [targetType, setTargetType] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsList, setStudentsList] = useState([]);

  useEffect(() => {
    fetchNotifications();
    if (!isParent) {
      fetchStudents();
    }
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students/');
      setStudentsList(res.data || []);
    } catch {
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (isParent && (currentUser?.student_id || currentUser?.id)) {
        params.student_id = currentUser.student_id || currentUser.id;
      }
      const res = await api.get('/notifications/', { params });

      const parentStudentId = currentUser?.student_id || currentUser?.id;
      const safeData = (res.data || []).filter((n) => {
        if ((n.title || '').startsWith('Official Overdue Balance Notice')) {
          return false;
        }
        if (!isParent) return true;
        if (n.student_id && parentStudentId && Number(n.student_id) !== Number(parentStudentId)) {
          return false;
        }
        if (
          n.grade_level &&
          currentUser?.grade_level &&
          n.grade_level !== currentUser.grade_level &&
          n.grade_level !== 'All Grades'
        ) {
          return false;
        }
        return true;
      });

      setNotifications(safeData);
    } catch (err) {
      addToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      addToast('Please enter announcement title and details', 'error');
      return;
    }
    if (targetType === 'student' && !selectedStudentId) {
      addToast('Please select a target student / parent', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const selectedStudent = studentsList.find((s) => s.id === Number(selectedStudentId));
      const payload = {
        title: form.title,
        fee_type: form.fee_type,
        grade_level:
          targetType === 'student'
            ? selectedStudent?.grade_level || null
            : targetType === 'grade' && form.grade_level !== 'All Grades'
              ? form.grade_level
              : null,
        student_id: targetType === 'student' ? Number(selectedStudentId) : null,
        description: form.description,
        amount: parseFloat(form.amount) || 0.0,
        due_date: form.due_date || null
      };

      await api.post('/notifications/', payload);
      addToast('Payment announcement published! Parents can now view it in their portal.', 'success');
      setShowModal(false);
      setForm({
        title: '',
        fee_type: 'Educational Tour',
        grade_level: 'All Grades',
        description: '',
        amount: '',
        due_date: ''
      });
      setTargetType('all');
      setSelectedStudentId('');
      setStudentSearch('');
      fetchNotifications();
    } catch (err) {
      addToast('Failed to publish announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      addToast('Announcement deleted', 'info');
      fetchNotifications();
    } catch {
      addToast('Failed to delete announcement', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white font-cinzel tracking-tight uppercase">
            Payment Announcements &amp; Event Fees
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isParent
              ? 'Official school announcements for upcoming activities, educational tours, and special fee schedules.'
              : 'Post school-wide or grade-level payment announcements (e.g. Educational Tour, school activities, event contributions). Overdue balance notices are managed directly under Collections.'}
          </p>
        </div>

        {!isParent && !isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-md flex items-center gap-2 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {isParent && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-xs uppercase font-cinzel tracking-wider text-emerald-800 dark:text-emerald-300">
                School Announcements Feed
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                Showing fee announcements relevant to{' '}
                <span className="font-bold underline text-emerald-900 dark:text-emerald-100">
                  {currentUser.student_name || 'Your Student'}
                </span>
                {currentUser.grade_level ? ` (${currentUser.grade_level})` : ''}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-cinzel">Loading announcements...</p>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-cinzel bg-brand-50 text-brand-700 dark:bg-slate-900 dark:text-brand-400 border border-brand-200 dark:border-slate-700 shrink-0">
                      {n.fee_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-cinzel bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {n.grade_level ? n.grade_level : 'All Students'}
                    </span>
                  </div>
                  {!isParent && !isAdmin && (
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel">Fee Amount</p>
                  <p className="text-base font-black text-brand-600 dark:text-brand-400 font-mono truncate">
                    {formatPeso(n.amount)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 font-cinzel flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3" /> Due Date
                  </p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {n.due_date || 'TBA'}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 font-cinzel">No Announcements Posted</p>
            <p className="text-xs text-slate-400 mt-1">
              Cashier has not posted any event or fee announcements yet.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-cinzel uppercase text-slate-800 dark:text-white">
                  Post Payment Announcement
                </h3>
                <p className="text-xs text-slate-400">
                  Announce upcoming events, educational tours, or activity contributions
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition cursor-pointer"
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

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-2">
                  <button
                    type="button"
                    onClick={() => { setTargetType('all'); setSelectedStudentId(''); }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase font-cinzel tracking-wider transition cursor-pointer ${targetType === 'all'
                      ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    Entire School
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTargetType('grade'); setSelectedStudentId(''); }}
                    className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase font-cinzel tracking-wider transition cursor-pointer ${targetType === 'grade'
                      ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    By Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('student')}
                    className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase font-cinzel tracking-wider transition cursor-pointer ${targetType === 'student'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                  >
                    Specific Student
                  </button>
                </div>

                {targetType === 'grade' && (
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-cinzel">
                      Select Grade Level
                    </label>
                    <select
                      value={form.grade_level}
                      onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'student' && (
                  <div className="space-y-1.5 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Filter by student name or LRN..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-slate-800 dark:text-white outline-none"
                    />
                    <select
                      required={targetType === 'student'}
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">-- Choose Student --</option>
                      {studentsList
                        .filter((s) => {
                          if (!studentSearch.trim()) return true;
                          const q = studentSearch.toLowerCase();
                          return (
                            (s.full_name || '').toLowerCase().includes(q) ||
                            (s.student_id || '').toLowerCase().includes(q)
                          );
                        })
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name} ({s.grade_level} - {s.section}) • {s.student_id}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                    Announcement Type
                  </label>
                  <select
                    value={form.fee_type}
                    onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
                  >
                    <option value="Educational Tour">Educational Tour</option>
                    <option value="Activity / Fair">School Activity / Event</option>
                    <option value="Swimming Fee">Swimming Fee</option>
                    <option value="Tuition Fee">Tuition Fee Notice</option>
                    <option value="Registration Fee">Registration &amp; Matriculation</option>
                    <option value="Books">Books &amp; Modules</option>
                    <option value="Energy Fee">Energy Subsidy</option>
                    <option value="Other Fees">Other Fees</option>
                  </select>
                </div>

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

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel">
                  Announcement Details
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the event, destination, inclusion, or schedule..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
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
