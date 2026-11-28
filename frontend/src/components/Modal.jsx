import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-xl',
  busy = false,
  autoFocusClose = true,
  hideHeader = false,
  printable = false,
  className = '',
}) {
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (isOpen && !dialog.open) {
      restoreFocusRef.current = document.activeElement;
      dialog.showModal();
      dialog.querySelector('[data-initial-focus]')?.focus();
    }
    if (!isOpen && dialog.open) {
      dialog.close();
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus();
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const handleCancel = (event) => {
      if (busy) {
        event.preventDefault();
        return;
      }
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [busy, onClose]);

  const printClasses = printable
    ? 'print:static print:block print:max-w-none print:w-full print:max-h-none print:overflow-visible print:shadow-none print:border-0 print:bg-white print:rounded-none print:text-black'
    : 'print:hidden';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${maxWidth} rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${printable ? 'p-0' : 'p-6 sm:p-8'} text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto animate-zoom-in ${printClasses} ${className}`}
    >
      {hideHeader ? (
        <h2 id={titleId} className="sr-only">{title}</h2>
      ) : (
        <div className="flex items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100 dark:border-slate-700">
          <h2 id={titleId} className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white font-cinzel tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            data-initial-focus={autoFocusClose ? 'true' : undefined}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {children}
    </dialog>
  );
}
