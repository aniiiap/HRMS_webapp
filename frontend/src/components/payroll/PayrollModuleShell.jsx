import { ChevronRight } from 'lucide-react'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString('en-IN', { month: 'short' }),
}))

export const PAYROLL_SECTIONS = [
  {
    id: 'run',
    label: 'Run Payroll',
    subs: [
      { id: 'overview', label: 'Overview' },
      { id: 'runs', label: 'Pay runs' },
      { id: 'register', label: 'Pay register' },
      { id: 'payout', label: 'Payout' },
      { id: 'reports', label: 'Statutory & reports' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup & Components',
    subs: [
      { id: 'settings', label: 'Payroll settings' },
      { id: 'components', label: 'Salary components' },
      { id: 'create', label: 'Salary structures' },
      { id: 'assign', label: 'Assign structure' },
    ],
  },
  {
    id: 'statutory',
    label: 'Taxes & Compliance',
    subs: [
      { id: 'compliance', label: 'PF / ESI / PT' },
      { id: 'tax', label: 'Tax Declarations' },
    ],
  },
]

export default function PayrollModuleShell({
  section,
  subTab,
  onSectionChange,
  onSubTabChange,
  periodYear,
  periodMonth,
  onPeriodChange,
  runStatus,
  children,
}) {
  const activeSection = PAYROLL_SECTIONS.find((s) => s.id === section) || PAYROLL_SECTIONS[0]
  const subs = activeSection.subs

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white shadow-sm dark:border-slate-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Payroll</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">
              {MONTHS.find((m) => m.value === Number(periodMonth))?.label} {periodYear}
            </h2>
            {runStatus && (
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium capitalize">{runStatus}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-slate-300">
            Period
            <div className="mt-1 flex gap-1">
              <select
                className="rounded-lg border-0 bg-white/10 px-2 py-1.5 text-sm text-white"
                value={periodMonth}
                onChange={(e) => onPeriodChange(periodYear, e.target.value)}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value} className="text-slate-900">
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border-0 bg-white/10 px-2 py-1.5 text-sm text-white"
                value={periodYear}
                onChange={(e) => onPeriodChange(e.target.value, periodMonth)}
              >
                {[0, 1, 2].map((i) => {
                  const y = new Date().getFullYear() - i
                  return (
                    <option key={y} value={y} className="text-slate-900">
                      {y}
                    </option>
                  )
                })}
              </select>
            </div>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/50">
        {PAYROLL_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSectionChange(s.id, s.subs[0].id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              section === s.id
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {subs.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1 dark:border-slate-700">
          {subs.map((sub, idx) => (
            <span key={sub.id} className="flex items-center">
              {idx > 0 && <ChevronRight className="mx-0.5 h-3 w-3 text-slate-400" />}
              <button
                type="button"
                disabled={subTab === sub.id}
                onClick={() => onSubTabChange(sub.id)}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  subTab === sub.id
                    ? section === 'setup'
                      ? 'cursor-default bg-brand-600 text-white shadow-sm'
                      : 'cursor-default border-b-2 border-brand-600 text-brand-700 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {sub.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {children}
    </div>
  )
}
