import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox }) {
  return (
    <div className="motion-safe:animate-scale-in flex flex-col items-center justify-center rounded-2xl border border-dashed border-warm-200 bg-warm-50/50 px-6 py-14 text-center dark:border-stone-700 dark:bg-stone-900/30">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 shadow-inner-warm dark:from-brand-950 dark:to-brand-900/40 dark:text-brand-300">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
