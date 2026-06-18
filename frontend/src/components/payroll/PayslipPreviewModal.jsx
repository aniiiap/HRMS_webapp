import { useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function PayslipPreviewModal({ url, employeeName, period, onClose, onDownload }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!url) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Payslip preview</h3>
            <p className="text-sm text-slate-500">
              {employeeName}
              {period ? ` · ${period}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button type="button" className="btn-secondary !py-2 text-sm" onClick={onDownload}>
                <Download className="mr-1.5 inline h-4 w-4" />
                Download PDF
              </button>
            )}
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe title="Payslip" src={url} className="min-h-0 flex-1 w-full bg-slate-100" />
      </div>
    </div>
  )
}
