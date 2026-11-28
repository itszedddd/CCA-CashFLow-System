import { useState, useEffect } from 'react';
import {
  UserCog, Search, KeyRound, Copy,
  CheckCircle2, Lock, Edit2, Info
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import {
  GRADE_LEVELS,
  resolveSection,
  formatPeso,
  getDefaultStudentPassword,
  formatStudentFullName,
  splitStudentFullName,
} from '../utils/schoolData';

export default function AdminStudents() {
  const addToast = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState({
    student_id: '',
    last_name: '',
    first_name: '',
    middle_name: '',
    grade_level: 'Grade 1',
    section: resolveSection('Grade 1'),
    gender: 'Male',
    parent_name: '',
    parent_contact: '',
    parent_email: '',
    address: 'City of San Jose del Monte, Bulacan',
  });

  useEffect(() => {
    fetchStudents();
  }, [gradeFilter, searchQuery]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (gradeFilter !== 'All') params.grade_level = gradeFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();
      const res = await api.get('/students/', { params });
      setStudents(res.data || []);
    } catch {
      addToast('Failed to load student accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (st) => {
    setEditingStudent(st);
    const parsedName = splitStudentFullName(st.full_name);
    setFormState({
      student_id: st.student_id,
      ...parsedName,
      grade_level: st.grade_level,
      section: resolveSection(st.grade_level, st.section),
      gender: st.gender || 'Male',
      parent_name: st.parent_name || '',
      parent_contact: st.parent_contact || '',
      parent_email: st.parent_email || '',
      address: st.address || '',
    });
    setShowCreateModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const formattedName = formatStudentFullName(formState.last_name, formState.first_name, formState.middle_name);
    if (!formState.student_id.trim() || !formState.last_name.trim() || !formState.first_name.trim()) {
      addToast('LRN, Last Name, and First Name are required.', 'error');
      return;
    }
    if (!/^\d+$/.test(formState.student_id.trim())) {
      addToast('Student ID / LRN must contain numbers only.', 'error');
      return;
    }
    const cleanContact = formState.parent_contact.replace(/\D/g, '');
    if (!cleanContact || cleanContact.length !== 11) {
      addToast('Contact number is required and must be exactly 11 digits (e.g. 09171234567). Bawal kulang, bawal sobra.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student_id: formState.student_id.trim(),
        full_name: formattedName,
        grade_level: formState.grade_level,
        section: resolveSection(formState.grade_level),
        gender: formState.gender,
        parent_name: formState.parent_name,
        parent_contact: cleanContact,
        parent_email: formState.parent_email,
        address: formState.address,
      };
      if (editingStudent) {
        await api.put(`/students/${editingStudent.id}`, payload);
        addToast(`Updated student record for ${payload.full_name}`, 'success');
      } else {
        const res = await api.post('/students/', payload);
        addToast(
          `Student account created! LRN: ${res.data.student_id} | Initial Password: ${res.data.initial_password}`,
          'success'
        );
      }
      setShowCreateModal(false);
      fetchStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save student record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (student) => {
    try {
      const res = await api.post(`/students/${student.id}/reset-password`);
      addToast(
        `New password for ${student.student_id}: ${res.data.initial_password}`,
        'success'
      );
      fetchStudents();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to reset LRN password', 'error');
    }
  };

  const handleCopyCredentials = (lrn, password) => {
    navigator.clipboard.writeText(`CCA FlowSys Parent Login\nStudent LRN: ${lrn}\nPassword: ${password}`);
    addToast(`Copied credentials for ${lrn}`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              <UserCog className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-cinzel uppercase">
              Admin Student Accounts &amp; LRN Registry
            </h2>
          </div>
        </div>

      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LRN, student name, or parent..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none"
        >
          <option value="All">All Grade Levels</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>{g} ({resolveSection(g)})</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden">
        <div role="region" aria-label="admin students data table 1" className="overflow-x-auto">
          <table className="w-full text-xs"><caption className="sr-only">admin students records table 1</caption>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-cinzel font-bold">
                <th scope="col" className="py-3.5 px-4 text-left">Student LRN</th>
                <th scope="col" className="py-3.5 px-4 text-left">Student Name &amp; Grade</th>
                <th scope="col" className="py-3.5 px-4 text-left">Parent / Contact</th>
                <th scope="col" className="py-3.5 px-4 text-right">Total Assessment</th>
                <th scope="col" className="py-3.5 px-4 text-left">Parent LRN Password</th>
                <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-cinzel">
                    Loading student account records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No student accounts found.
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                      {st.student_id}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white uppercase">{st.full_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {st.grade_level} — {resolveSection(st.grade_level, st.section)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{st.parent_name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{st.parent_contact || ''}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                      {formatPeso(st.total_due)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {st.password_changed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Updated by Parent
                        </span>
                      ) : st.initial_password ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                          <code className="font-mono font-bold text-amber-900 dark:text-amber-200 text-xs">
                            {st.initial_password}
                          </code>
                          <button
                            onClick={() => handleCopyCredentials(st.student_id, st.initial_password)}
                            className="text-amber-700 hover:text-amber-900 dark:text-amber-300 cursor-pointer"
                            title="Copy LRN & initial password"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Click Reset to generate</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(st)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Generate new initial password for parent"
                        >
                          <KeyRound className="w-3 h-3 fill-current" />
                          <span>Reset PW</span>
                        </button>
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                          title="Edit student profile"
                        >
                          <Edit2 className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={editingStudent ? 'Edit Student Account Record' : 'Create Student Account'}
          maxWidth="max-w-lg"
        >
          <p className="text-xs text-slate-400 -mt-2 mb-5">
            Auto-assigns 5 CCA fee schedules and generates a unique LRN initial password
          </p>
          <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="student-id-lrn">
                    Student ID / LRN <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input id="student-id-lrn"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={formState.student_id}
                    onChange={(e) => setFormState({ ...formState, student_id: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter DepEd LRN (Numbers Only)"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="grade-level">
                    Grade Level
                  </label>
                  <select id="grade-level"
                    value={formState.grade_level}
                    onChange={(e) => {
                      const g = e.target.value;
                      setFormState({ ...formState, grade_level: g, section: resolveSection(g) });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="last-name">
                    Last Name <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input id="last-name"
                    type="text"
                    required
                    value={formState.last_name}
                    onChange={(e) => setFormState({ ...formState, last_name: e.target.value })}
                    placeholder="e.g. Santos"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="first-name">
                    First Name <span className="text-rose-500 dark:text-rose-400">*</span>
                  </label>
                  <input id="first-name"
                    type="text"
                    required
                    value={formState.first_name}
                    onChange={(e) => setFormState({ ...formState, first_name: e.target.value })}
                    placeholder="e.g. Juan"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="middle-name">
                    Middle Name
                  </label>
                  <input id="middle-name"
                    type="text"
                    value={formState.middle_name}
                    onChange={(e) => setFormState({ ...formState, middle_name: e.target.value })}
                    placeholder="e.g. Reyes"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="section">
                    Section (Auto-Synced)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled id="section"
                      value={resolveSection(formState.grade_level)}
                      className="w-full px-3.5 py-2 pr-8 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="gender">
                    Gender
                  </label>
                  <select id="gender"
                    value={formState.gender}
                    onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="parent-guardian-name">
                    Parent / Guardian Name
                  </label>
                  <input id="parent-guardian-name"
                    type="text"
                    value={formState.parent_name}
                    onChange={(e) => setFormState({ ...formState, parent_name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 font-cinzel" htmlFor="contact-number-11-digits">
                    Contact Number (11 Digits)
                  </label>
                  <input id="contact-number-11-digits"
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="e.g. 09171234567"
                    value={formState.parent_contact}
                    onChange={(e) => setFormState({ ...formState, parent_contact: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-cinzel flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-brand-600 dark:text-brand-300" />
                    Default Parent Password
                  </span>
                  <span className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300 px-2 py-0.5 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 rounded-md">
                    {getDefaultStudentPassword(formState.last_name)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Default format: First 3 letters of student's last name + <strong>#0000</strong>. Parents can change this upon initial login.
                </p>
              </div>

              <div className="p-3.5 bg-brand-50/90 dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 rounded-2xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-brand-600 dark:text-brand-300 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-brand-900 dark:text-brand-200 uppercase tracking-wide font-cinzel">
                    Standard Fee Assessment
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Account will automatically initialize with the standard <span className="font-bold text-slate-900 dark:text-white">{formState.grade_level}</span> fee schedule (Tuition, Registration, Books, Energy &amp; Other Fees).
                  </p>
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase font-cinzel cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingStudent ? 'Update Record' : 'Create & Generate Password'}
                </button>
              </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
