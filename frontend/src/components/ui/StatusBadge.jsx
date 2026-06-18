const STYLES = {
  draft: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  processing: 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
  ready: 'bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200',
  submitted: 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
  finalized: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  paid: 'bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-200',
  pending: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  approved: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  rejected: 'bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  present: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
  late: 'bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
  absent: 'bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  incomplete: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  on_hold: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

export default function StatusBadge({ status, label }) {
  const key = String(status || '').toLowerCase()
  const text = label || key.replace(/_/g, ' ')
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STYLES[key] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {text}
    </span>
  )
}
