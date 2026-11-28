import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const TONES = {
  archive: {
    iconWrap: 'bg-amber-50 dark:bg-amber-950/40',
    icon: 'text-amber-600 dark:text-amber-300',
    confirm: 'bg-rose-600 hover:bg-rose-700',
  },
  restore: {
    iconWrap: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'text-emerald-600 dark:text-emerald-300',
    confirm: 'bg-emerald-600 hover:bg-emerald-700',
  },
  danger: {
    iconWrap: 'bg-rose-50 dark:bg-rose-950/40',
    icon: 'text-rose-600 dark:text-rose-300',
    confirm: 'bg-rose-600 hover:bg-rose-700',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'archive',
  Icon = AlertTriangle,
  busy = false,
}) {
  const theme = TONES[tone] || TONES.danger;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${theme.iconWrap}`}>
            <Icon className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {message}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-semibold uppercase tracking-wider font-cinzel">
              This action will be recorded in the Audit Trail.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-cinzel shadow-sm transition cursor-pointer disabled:opacity-50 ${theme.confirm}`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
