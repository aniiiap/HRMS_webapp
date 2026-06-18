export function ProfileField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{value || '—'}</p>
    </div>
  )
}

export default function ProfileSectionCard({ title, children, action }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</h4>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
