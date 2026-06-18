import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Circle, Clock, IndianRupee, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, messageFromError } from '../../api/client'
import StatusBadge from '../ui/StatusBadge'
import { fmtInr } from '../../utils/payrollFormat'

const WORKFLOW = [
  { key: 'draft', label: 'Draft', desc: 'Edit register & paid days' },
  { key: 'ready', label: 'Ready', desc: 'Validated for finalize' },
  { key: 'finalized', label: 'Finalized', desc: 'Payslips unlocked' },
  { key: 'paid', label: 'Paid', desc: 'Payout complete' },
]

export default function PayrollDashboardPanel({
  orgId,
  runs = [],
  onRefreshRuns,
  onOpenPayRuns,
  onNavigate,
  embedded = false,
}) {
  const [dashboard, setDashboard] = useState(null)
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/payroll/dashboard/', {
        params: { organization: orgId, year: yearFilter },
      })
      setDashboard(data)
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [orgId, yearFilter])

  useEffect(() => {
    void load()
  }, [load])

  const latest = dashboard?.latest_run
  const kpis = dashboard?.kpis || {}
  const trend = dashboard?.payroll_cost_trend || []
  const maxGross = Math.max(...trend.map((t) => t.gross || 0), 1)

  const workflowIndex = WORKFLOW.findIndex((w) => w.key === latest?.status)
  const draftCount = runs.filter((r) => r.status === 'draft').length
  const readyCount = runs.filter((r) => r.status === 'ready').length

  if (loading && !dashboard) {
    return <p className="text-sm text-slate-500">Loading payroll analytics…</p>
  }

  return (
    <div className={`space-y-6 ${embedded ? 'border-t border-slate-200 pt-8 dark:border-slate-700' : ''}`}>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className={`font-semibold text-slate-900 dark:text-white ${embedded ? 'text-base' : 'text-lg'}`}>
            {embedded ? 'Yearly insights' : 'Payroll overview'}
          </h3>
          <p className="text-sm text-slate-500">Cost trends, department split, and workflow status</p>
        </div>
        <label className="text-xs font-medium text-slate-500">
          Financial year
          <select
            className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {[0, 1, 2].map((i) => {
              const y = new Date().getFullYear() - i
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              )
            })}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Wallet} label="Total monthly gross payroll" value={fmtInr(kpis.total_payroll_cost)} sub="Latest finalized run · prorated gross" tone="brand" />
        <KpiCard icon={IndianRupee} label="Actual net payout" value={fmtInr(kpis.net_salary_payout)} sub="Bank-ready net after deductions" tone="emerald" />
        <KpiCard icon={Users} label="Employees paid" value={String(kpis.employees_processed ?? 0)} sub={`${kpis.employees_pending ?? 0} employees pending`} tone="accent" />
        <KpiCard icon={Clock} label="Payroll runs" value={String((kpis.draft_runs ?? 0) + (kpis.finalized_runs ?? 0))} sub={`${draftCount} draft · ${readyCount} ready to finalize`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900 dark:text-white">Payroll cost trend</h4>
            <span className="text-xs text-slate-500">Last {trend.length} periods</span>
          </div>
          <div className="mt-6 flex h-44 items-end gap-1 border-b border-slate-200 pb-1 dark:border-slate-700">
            {trend.length === 0 ? (
              <p className="text-sm text-slate-500">No payroll runs for this year yet.</p>
            ) : (
              trend.map((t) => {
                const hGross = Math.max(8, (t.gross / maxGross) * 120)
                const hNet = Math.max(6, (t.net / maxGross) * 120)
                return (
                  <div key={t.period} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-[120px] w-full max-w-[52px] items-end justify-center gap-0.5">
                      <div
                        className="w-[45%] rounded-t bg-brand-500/90 transition group-hover:bg-brand-600"
                        style={{ height: `${hGross}px` }}
                        title={`Gross ${fmtInr(t.gross)}`}
                      />
                      <div
                        className="w-[45%] rounded-t bg-emerald-500/90 transition group-hover:bg-emerald-600"
                        style={{ height: `${hNet}px` }}
                        title={`Net ${fmtInr(t.net)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">{t.period?.slice(5) || t.period}</span>
                  </div>
                )
              })
            )}
          </div>
          {trend.length > 0 && (
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Gross
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Net
              </span>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h4 className="font-semibold text-slate-900 dark:text-white">Workflow</h4>
          <p className="mt-1 text-xs text-slate-500">
            {latest ? (
              <>
                Current: {latest.period} · <StatusBadge status={latest.status} />
              </>
            ) : (
              'No payroll run yet'
            )}
          </p>
          <ol className="mt-4 space-y-3">
            {WORKFLOW.map((step, i) => {
              const done = workflowIndex > i
              const current = workflowIndex === i
              return (
                <li key={step.key} className="flex gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : current ? (
                    <Circle className="h-5 w-5 shrink-0 fill-brand-100 text-brand-600" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${current ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          {latest?.status === 'draft' && (
            <button
              type="button"
              onClick={() => onOpenPayRuns?.()}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              Continue pay run <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="font-semibold">Department-wise cost</h4>
          <ul className="mt-4 max-h-56 space-y-3 overflow-y-auto">
            {(dashboard?.department_wise_payroll || []).map((d) => {
              const pct = kpis.total_payroll_cost ? Math.round((d.gross / kpis.total_payroll_cost) * 100) : 0
              return (
                <li key={d.department}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{d.department}</span>
                    <span className="tabular-nums text-slate-900 dark:text-white">{fmtInr(d.gross)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
            {(dashboard?.department_wise_payroll || []).length === 0 && (
              <li className="text-sm text-slate-500">No department data for the latest run.</li>
            )}
          </ul>
        </div>

        <div className="card p-5">
          <h4 className="font-semibold">Quick actions</h4>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <QuickAction label="Create pay run" onClick={() => onNavigate?.('run', 'runs') || onOpenPayRuns?.()} />
            <QuickAction label="Open pay register" onClick={() => onNavigate?.('run', 'register')} />
            <QuickAction label="Salary structure" onClick={() => onNavigate?.('setup', 'create')} />
            <QuickLink to="/employees" label="Employee profiles" />
          </div>
          {onRefreshRuns && (
            <button type="button" className="btn-secondary mt-4 w-full text-sm" onClick={() => void onRefreshRuns()}>
              Refresh run list
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, tone }) {
  const tones = {
    brand: 'from-brand-500/10 to-brand-600/5 border-brand-200/60 dark:border-brand-900',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200/60',
    accent: 'from-accent-500/10 to-accent-600/5 border-accent-200/60 dark:border-accent-900/40',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-200/60',
  }
  const iconTones = { brand: 'text-brand-600', emerald: 'text-emerald-600', accent: 'text-accent-600', amber: 'text-amber-600' }
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${tones[tone] || tones.brand}`}>
      <Icon className={`h-5 w-5 ${iconTones[tone] || iconTones.brand}`} />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  )
}

function QuickLink({ to, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-warm-200 bg-warm-50/80 px-4 py-3 text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-soft dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  )
}

function QuickAction({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-warm-200 bg-warm-50/80 px-4 py-3 text-left text-sm font-medium text-stone-700 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-soft dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200"
    >
      {label}
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </button>
  )
}
