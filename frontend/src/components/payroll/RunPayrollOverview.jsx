import { IndianRupee, Users, Wallet } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { fmtInr, fmtInrFull } from '../../utils/payrollFormat'
import PayrollDashboardPanel from './PayrollDashboardPanel'

function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-brand-200 bg-brand-50/50 dark:border-brand-900/50 dark:bg-brand-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/30'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function RunPayrollOverview({
  selectedRun,
  results = [],
  employees = [],
  runs = [],
  onCreateRun,
  onFinalize,
  onMarkReady,
  onRecalculate,
  onNext,
  onRefreshRuns,
  onNavigate,
  isPrivileged,
  newRun,
  setNewRun,
  orgId,
}) {
  const totals = results.reduce(
    (acc, r) => ({
      gross: acc.gross + Number(r.gross_prorated || 0),
      net: acc.net + Number(r.net_pay || 0),
      tds: acc.tds + Number(r.tds || 0),
      pf: acc.pf + Number(r.pf_employee || 0),
      esi: acc.esi + Number(r.esi_employee || 0),
      pt: acc.pt + Number(r.professional_tax || 0),
      pfEmployer: acc.pfEmployer + Number(r.pf_employer || 0),
      esiEmployer: acc.esiEmployer + Number(r.esi_employer || 0),
    }),
    { gross: 0, net: 0, tds: 0, pf: 0, esi: 0, pt: 0, pfEmployer: 0, esiEmployer: 0 }
  )

  const finalized = results.filter((r) => Number(r.net_pay) > 0).length
  const periodLabel = selectedRun
    ? `1 ${new Date(selectedRun.period_year, selectedRun.period_month - 1).toLocaleString('en-IN', { month: 'short' })} – ${new Date(selectedRun.period_year, selectedRun.period_month, 0).getDate()} ${new Date(selectedRun.period_year, selectedRun.period_month - 1).toLocaleString('en-IN', { month: 'short' })}, ${selectedRun.period_year}`
    : null

  return (
    <div className="space-y-6">
      {!selectedRun && (
        <form onSubmit={onCreateRun} className="card flex flex-wrap items-end gap-3 p-4">
          <p className="w-full text-sm text-slate-600 dark:text-slate-400">
            No payroll run for this month. Create a draft — paid days and salary are calculated from attendance automatically.
          </p>
          <div>
            <label className="text-xs text-slate-500">Working days</label>
            <input
              className="block rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600"
              value={newRun.working_days}
              onChange={(e) => setNewRun({ ...newRun, working_days: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary !py-2" disabled={!orgId || !isPrivileged}>
            Create &amp; calculate
          </button>
        </form>
      )}

      {selectedRun && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">This month</h3>
              <p className="text-sm text-slate-500">{periodLabel}</p>
            </div>
            <StatusBadge status={selectedRun.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total employees" value={results.length || employees.length} icon={Users} />
            <KpiCard label="Processed" value={finalized} />
            <KpiCard label="Gross pay" value={fmtInr(totals.gross)} icon={IndianRupee} accent />
            <KpiCard label="Net pay" value={fmtInr(totals.net)} icon={Wallet} accent />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Income tax (TDS)" value={fmtInrFull(totals.tds)} />
            <KpiCard label="PF (employee)" value={fmtInrFull(totals.pf)} />
            <KpiCard label="ESI (employee)" value={fmtInrFull(totals.esi)} />
            <KpiCard label="Professional tax" value={fmtInrFull(totals.pt)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Employer PF" value={fmtInrFull(totals.pfEmployer)} />
            <KpiCard label="Employer ESI" value={fmtInrFull(totals.esiEmployer)} />
            <KpiCard
              label="Total employer statutory"
              value={fmtInrFull(totals.pfEmployer + totals.esiEmployer)}
              accent
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <strong>TDS (FY 2025-26):</strong> Under the new tax regime, employees with taxable income up to{' '}
            <strong>₹12 lakh/year</strong> (after ₹75,000 standard deduction) typically have <strong>zero TDS</strong>.
            Above that, slab-based TDS is deducted monthly. Employees can choose old/new regime under Declaration.
          </div>

          {isPrivileged && (selectedRun.status === 'draft' || selectedRun.status === 'ready') && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => onRecalculate?.(selectedRun.id)}>
                Recalculate
              </button>
              {selectedRun.status === 'draft' && (
                <button type="button" className="btn-secondary" onClick={() => onMarkReady?.(selectedRun.id)}>
                  Mark ready
                </button>
              )}
              <button type="button" className="btn-primary" onClick={() => onFinalize?.(selectedRun.id)}>
                Finalize payroll
              </button>
              <button type="button" className="btn-secondary ml-auto" onClick={onNext}>
                Next: Pay register →
              </button>
            </div>
          )}
        </>
      )}

      <PayrollDashboardPanel
        embedded
        orgId={orgId}
        runs={runs}
        onRefreshRuns={onRefreshRuns}
        onOpenPayRuns={() => onNavigate?.('run', 'runs')}
        onNavigate={onNavigate}
      />
    </div>
  )
}
