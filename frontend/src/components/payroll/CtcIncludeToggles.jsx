import {
  CTC_EARNING_INCLUDE_OPTIONS,
  CTC_EMPLOYER_INCLUDE_OPTIONS,
  CTC_INCLUDE_OPTIONS,
} from './ctcIncludeOptions'

function ToggleGrid({ options, includeFlags, onChange, disabled }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {options.map(({ key, label }) => (
        <label
          key={key}
          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors ${
            includeFlags[key]
              ? 'border-brand-200 bg-brand-50/60 text-slate-800 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-800/50'
          } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input
            type="checkbox"
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={!!includeFlags[key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...includeFlags, [key]: e.target.checked })}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )
}

/** Checkboxes to include/exclude optional salary & employer components in live preview. */
export default function CtcIncludeToggles({ includeFlags, onChange, statutoryFlags, onStatutoryChange, disabled = false }) {
  if (!includeFlags) return null

  const enabledCount = CTC_INCLUDE_OPTIONS.filter((o) => includeFlags[o.key]).length

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          Include in calculation
        </p>
        <span className="flex items-center gap-2">
          <button
            type="button"
            className="text-[10px] font-medium text-brand-600 hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => {
              const allOn = Object.fromEntries(CTC_INCLUDE_OPTIONS.map((o) => [o.key, true]))
              onChange(allOn)
            }}
          >
            Select all
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            className="text-[10px] font-medium text-brand-600 hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={() => {
              const allOff = Object.fromEntries(CTC_INCLUDE_OPTIONS.map((o) => [o.key, false]))
              onChange(allOff)
            }}
          >
            Unselect all
          </button>
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Checked = shown on payslip / CTC breakup. Unchecked = hidden and excluded from calculation.
        {enabledCount < CTC_INCLUDE_OPTIONS.length && (
          <span className="text-amber-700 dark:text-amber-300"> · {enabledCount} of {CTC_INCLUDE_OPTIONS.length} on</span>
        )}
      </p>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Earnings (payslip)</p>
      <div className="mt-2">
        <ToggleGrid options={CTC_EARNING_INCLUDE_OPTIONS} includeFlags={includeFlags} onChange={onChange} disabled={disabled} />
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Employer costs (CTC only)</p>
      <div className="mt-2">
        <ToggleGrid options={CTC_EMPLOYER_INCLUDE_OPTIONS} includeFlags={includeFlags} onChange={onChange} disabled={disabled} />
      </div>

      {statutoryFlags && onStatutoryChange && (
        <>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Statutory Deductions (Employee)</p>
          <div className="mt-2">
            <ToggleGrid options={[
              { key: 'pf_applicable', label: 'Employee PF (EPF)' },
              { key: 'esi_applicable', label: 'Employee ESIC' },
              { key: 'pt_applicable', label: 'Professional Tax (PT)' },
              { key: 'tds_applicable', label: 'TDS (Income Tax)' },
            ]} includeFlags={statutoryFlags} onChange={onStatutoryChange} disabled={disabled} />
          </div>
        </>
      )}

      <p className="mt-2 text-[10px] text-slate-500">
        Basic, DA &amp; HRA always apply. Disabled earnings flow into Special allowance. Disabled employer costs are not
        counted in CTC and are not listed below.
      </p>
    </div>
  )
}
