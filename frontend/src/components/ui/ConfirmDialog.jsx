import { AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/45 backdrop-blur-sm dark:bg-black/55"
        aria-label="Cancel"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-warm-200 bg-white p-5 shadow-2xl motion-safe:animate-scale-in dark:border-stone-700 dark:bg-stone-900"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              destructive
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            {message && (
              <p id="confirm-dialog-message" className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={destructive ? 'rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700' : 'btn-primary'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
