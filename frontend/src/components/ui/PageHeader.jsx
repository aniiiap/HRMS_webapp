export default function PageHeader({ title, subtitle, action, badge }) {
  return (
    <header className="motion-safe:animate-fade-up mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {badge && (
          <p className="mb-2 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            {badge}
          </p>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 motion-safe:animate-fade-up stagger-2">{action}</div>}
    </header>
  )
}
