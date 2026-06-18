import { fmtInrFull } from '../../utils/payrollFormat'
import CtcIncludeToggles from './CtcIncludeToggles'

const TAX_STYLES = {
  taxable: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  partially_exempt: 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  tax_free: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  na: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  deduction: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
}

const TAX_LABELS = {
  taxable: 'Fully taxable',
  partially_exempt: 'Partially exempt',
  tax_free: 'Tax-free',
  na: 'N/A',
  deduction: 'Deduction',
}

export default function CtcBreakupPreview({
  breakup,
  loading = false,
  includeFlags,
  onIncludeChange,
  statutoryFlags,
  onStatutoryChange,
  canEditIncludes = true,
}) {
  const togglePanel =
    includeFlags && onIncludeChange ? (
      <CtcIncludeToggles 
        includeFlags={includeFlags} 
        onChange={onIncludeChange} 
        statutoryFlags={statutoryFlags}
        onStatutoryChange={onStatutoryChange}
        disabled={!canEditIncludes} 
      />
    ) : null

  if (loading && !breakup?.earnings?.length) {
    return (
      <div className="space-y-4">
        {togglePanel}
        <p className="text-sm text-slate-500">Calculating CTC breakup…</p>
      </div>
    )
  }

  if (!breakup?.earnings?.length) {
    return (
      <div className="space-y-4">
        {togglePanel}
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
          Enter monthly gross salary, annual CTC, or monthly CTC to see the full structure
        </div>
      </div>
    )
  }

  const mode = breakup.input_mode || 'gross'
  const employerShare = Number(breakup.monthly_ctc || 0) - Number(breakup.gross_salary_monthly || 0)
  return (
    <div className="space-y-4 text-sm">
      {togglePanel}

      {loading && (
        <p className="text-xs text-slate-500">Recalculating…</p>
      )}

      {breakup.warnings?.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {breakup.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      {mode === 'gross' && breakup.target_monthly_gross && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="font-medium text-emerald-900 dark:text-emerald-200">
            You entered <strong>monthly gross salary</strong> {fmtInrFull(breakup.target_monthly_gross)}/month
          </p>
          <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
            Gross on payslip = {fmtInrFull(breakup.gross_salary_monthly)} (matches your input). Company CTC is higher at{' '}
            {fmtInrFull(breakup.monthly_ctc)} because employer PF, gratuity &amp; insurance are extra company cost.
          </p>
        </div>
      )}

      {(mode === 'monthly_ctc' || mode === 'ctc') && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            You entered <strong>monthly CTC</strong> {fmtInrFull(breakup.target_monthly_ctc || breakup.monthly_ctc)}/month
            (total company budget)
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            From this budget, {fmtInrFull(employerShare)} goes to employer PF, gratuity &amp; insurance — not to the employee.
            So in-hand <strong>gross is only {fmtInrFull(breakup.gross_salary_monthly)}</strong>. This is standard India payroll
            when starting from CTC (offer letter style).
          </p>
          <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
            If you meant &quot;salary is ₹20,000&quot; (what employee earns), switch input type to{' '}
            <strong>Monthly gross salary</strong> instead.
          </p>
        </div>
      )}

      {mode === 'annual' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            You entered <strong>annual CTC</strong> {fmtInrFull(breakup.target_annual_ctc || breakup.annual_ctc)}/year
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Monthly gross (in-hand) is {fmtInrFull(breakup.gross_salary_monthly)} — less than monthly CTC{' '}
            {fmtInrFull(breakup.monthly_ctc)} because employer costs are carved out of the CTC budget first.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-brand-200/80 bg-brand-50/50 px-4 py-3 dark:border-brand-900/50 dark:bg-brand-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-800 dark:text-brand-300">Salary summary</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {mode === 'gross' ? (
            <>
              <Stat
                label="Gross salary (what you entered)"
                value={fmtInrFull(breakup.gross_salary_monthly)}
                accent
                hint="Payslip earnings before employee PF / PT / TDS"
              />
              <Stat label="Monthly CTC (company pays)" value={fmtInrFull(breakup.monthly_ctc)} hint="Gross + employer costs" />
              <Stat label="Annual CTC (company pays)" value={fmtInrFull(breakup.annual_ctc)} />
              <Stat label="Net take-home (est.)" value={fmtInrFull(breakup.net_take_home_monthly)} accent />
            </>
          ) : (
            <>
              <Stat label="Monthly CTC (what you entered)" value={fmtInrFull(breakup.monthly_ctc)} accent hint="Total company budget" />
              <Stat
                label="Gross salary (employee earns)"
                value={fmtInrFull(breakup.gross_salary_monthly)}
                hint="Always less than CTC — employer costs come out first"
              />
              <Stat label="Annual CTC" value={fmtInrFull(breakup.annual_ctc)} />
              <Stat label="Net take-home (est.)" value={fmtInrFull(breakup.net_take_home_monthly)} accent />
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          <strong>Standard India formula:</strong> Monthly CTC = gross salary + employer PF + gratuity + insurance. They are
          never equal when employer costs exist.
        </p>
        {breakup.ctc_reconciliation && (
          <p className="mt-1 text-xs text-slate-500">
            Check: gross + employer = {fmtInrFull(breakup.ctc_reconciliation)} (monthly CTC)
          </p>
        )}
        {breakup.skipped_allowances?.length > 0 && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
            Budget too low for full ₹: {breakup.skipped_allowances.join(', ')}
          </p>
        )}
      </div>

      <AllocationExplainer breakup={breakup} />

      <Section
        title="Earnings (employee payslip)"
        rows={breakup.earnings}
        total={breakup.gross_salary_monthly}
        totalLabel="Gross salary"
      />
      {breakup.employer?.length > 0 && (
        <Section
          title="Employer costs (in CTC, not in hand)"
          rows={breakup.employer}
          total={breakup.employer_cost_monthly}
          totalLabel="Employer total"
          muted
        />
      )}
      <Section title="Deductions from salary" rows={breakup.deductions} total={breakup.total_deductions_monthly} totalLabel="Total deductions" deduction />

      <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-4 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">Estimated net take-home</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{fmtInrFull(breakup.net_take_home_monthly)}</p>
        <p className="mt-1 text-xs text-white/75">
          Gross {fmtInrFull(breakup.gross_salary_monthly)} − deductions {fmtInrFull(breakup.total_deductions_monthly)} · before attendance & pay run
        </p>
      </div>

      <p className="text-xs text-slate-500">
        Tax badges are indicative. Exemptions depend on Old vs New regime, proofs submitted, and state rules. Configure formulas under
        Payroll → CTC formulas.
      </p>
    </div>
  )
}

function AllocationExplainer({ breakup }) {
  const earnings = breakup.earnings || []
  const coreCodes = new Set(['BASIC', 'DEARNESS_ALLOWANCE', 'HRA'])
  const core = earnings.filter((e) => coreCodes.has(e.code))
  const variable = earnings.find((e) => e.code === 'VARIABLE_PAY')
  const special = earnings.find((e) => e.code === 'SPECIAL_ALLOWANCE')
  const fixed = earnings.filter((e) => !coreCodes.has(e.code) && e.code !== 'VARIABLE_PAY' && e.code !== 'SPECIAL_ALLOWANCE')

  const sum = (rows) => rows.reduce((t, r) => t + Number(r.monthly || 0), 0)
  const coreTotal = sum(core)
  const variableTotal = Number(variable?.monthly || 0)
  const fixedTotal = sum(fixed)
  const specialTotal = Number(special?.monthly || 0)
  const gross = Number(breakup.gross_salary_monthly || 0)

  const rows = [
    { label: 'Basic + DA + HRA', amount: coreTotal, note: 'Fixed % of CTC (statutory base)' },
    ...(variableTotal > 0 ? [{ label: 'Variable pay', amount: variableTotal, note: '% of CTC' }] : []),
    ...(fixedTotal > 0 ? [{ label: `Fixed allowances (${fixed.length})`, amount: fixedTotal, note: 'CEA, LTA, transport, etc.' }] : []),
    { label: 'Special allowance', amount: specialTotal, note: 'Leftover only — not a separate negotiated amount', highlight: specialTotal < gross * 0.05 },
  ]

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        Where your {fmtInrFull(gross)} gross goes
      </p>
      <ul className="mt-2 space-y-1.5 text-xs">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start justify-between gap-3">
            <span className="text-slate-600 dark:text-slate-400">
              {r.label}
              <span className="block text-[10px] text-slate-500">{r.note}</span>
            </span>
            <span className={`shrink-0 font-semibold tabular-nums ${r.highlight ? 'text-amber-700 dark:text-amber-300' : ''}`}>
              {fmtInrFull(r.amount)}
            </span>
          </li>
        ))}
      </ul>
      {variableTotal === 0 && breakup.skipped_allowances?.length === 0 && (
        <p className="mt-2 text-[10px] text-slate-500">Variable pay is disabled in CTC formulas, or budget ran out before it could be allocated.</p>
      )}
      {specialTotal < 500 && gross > 0 && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Special allowance is tiny because Basic + DA + HRA + variable + fixed allowances already use almost all of the gross.
          At ₹{Math.round(gross).toLocaleString('en-IN')}/month, consider lowering fixed ₹ amounts under Payroll → CTC formulas,
          or disable meal / transport for junior salaries.
        </p>
      )}
      {breakup.skipped_allowances?.length > 0 && (
        <p className="mt-2 text-[10px] text-amber-800 dark:text-amber-200">
          Not paid (budget too low): {breakup.skipped_allowances.join(', ')}
        </p>
      )}
    </div>
  )
}

function Section({ title, rows, total, totalLabel, muted, deduction }) {
  const bar = muted
    ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
    : deduction
      ? 'border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20'
      : 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'

  return (
    <div className={`overflow-hidden rounded-xl border ${bar}`}>
      <div className="border-b border-inherit px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        {title}
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row) => (
          <li key={row.code} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                {row.formula && <p className="mt-0.5 text-xs text-slate-500">{row.formula}</p>}
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums">{fmtInrFull(row.monthly)}</p>
                <p className="text-xs text-slate-500">{fmtInrFull(row.annual)}/yr</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAX_STYLES[row.tax_treatment] || TAX_STYLES.taxable}`}>
                {TAX_LABELS[row.tax_treatment] || row.tax_treatment}
              </span>
              {row.tax_note && <span className="text-xs text-slate-500">{row.tax_note}</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-inherit bg-white/60 px-4 py-2.5 font-semibold dark:bg-slate-900/40">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{fmtInrFull(total)}</span>
      </div>
    </div>
  )
}

function Stat({ label, value, accent, hint }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${accent ? 'text-brand-700 dark:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>}
    </div>
  )
}
