import { Save } from 'lucide-react'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const PF_BASIS_OPTIONS = [
  { value: 'basic', label: 'Basic × 12%' },
  { value: 'basic_special', label: '(Basic + Special Allowance) × 12%' },
  { value: 'basic_da', label: '(Basic + DA) × 12%' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <span
        className={`mt-0.5 inline-block h-6 w-6 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SettingRow({ label, children }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="sm:min-w-[280px]">{children}</div>
    </div>
  )
}

export default function SetupPayrollSettingsPanel({ statutory, setStatutory, onSave, isPrivileged }) {
  if (!statutory) return null

  const yesNo = (on) => (on ? 'Yes' : 'No')

  return (
    <form
      onSubmit={onSave}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/40"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <h3 className="font-semibold text-slate-900 dark:text-white">Payroll settings</h3>
        <p className="mt-0.5 text-xs text-slate-500">Company-wide payroll cycle and statutory programs</p>
      </div>

      <div className="px-5">
        <SettingRow label="Pay cycle:">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">From</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-600 dark:bg-slate-900"
              value={statutory.pay_cycle_start_day ?? 1}
              disabled={!isPrivileged}
              onChange={(e) => setStatutory({ ...statutory, pay_cycle_start_day: Number(e.target.value) })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-slate-500">To</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-1.5 dark:border-slate-600 dark:bg-slate-900"
              value={statutory.pay_cycle_end_day ?? 31}
              disabled={!isPrivileged}
              onChange={(e) => setStatutory({ ...statutory, pay_cycle_end_day: Number(e.target.value) })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </SettingRow>

        <SettingRow label="Does your company have PF?">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-slate-600">{yesNo(statutory.pf_enabled)}</span>
            <Toggle
              checked={!!statutory.pf_enabled}
              disabled={!isPrivileged}
              onChange={(v) => setStatutory({ ...statutory, pf_enabled: v })}
            />
          </div>
        </SettingRow>

        {statutory.pf_enabled && (
          <>
            <SettingRow label="Employee contribution type">
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.pf_employee_contribution_type || statutory.pf_wage_basis || 'basic_da'}
                disabled={!isPrivileged}
                onChange={(e) =>
                  setStatutory({
                    ...statutory,
                    pf_employee_contribution_type: e.target.value,
                    // keep legacy key in sync for backward compatibility
                    pf_wage_basis: e.target.value,
                  })
                }
              >
                <option value="">Select type</option>
                {PF_BASIS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </SettingRow>

            <SettingRow label="PF employee contribution (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.pf_employee_percent ?? '12'}
                disabled={!isPrivileged}
                onChange={(e) => setStatutory({ ...statutory, pf_employee_percent: e.target.value })}
              />
            </SettingRow>

            <SettingRow label="PF employer contribution (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.pf_employer_percent ?? '12'}
                disabled={!isPrivileged}
                onChange={(e) => setStatutory({ ...statutory, pf_employer_percent: e.target.value })}
              />
            </SettingRow>

            <SettingRow label="PF ceiling at ₹15,000">
              <div className="flex items-center justify-end gap-3">
                <span className="text-sm text-slate-600">{yesNo(statutory.pf_ceiling_enabled !== false)}</span>
                <Toggle
                  checked={statutory.pf_ceiling_enabled !== false}
                  disabled={!isPrivileged}
                  onChange={(v) =>
                    setStatutory({
                      ...statutory,
                      pf_ceiling_enabled: v,
                      pf_monthly_wage_ceiling: v ? '15000' : '9999999',
                    })
                  }
                />
              </div>
            </SettingRow>
          </>
        )}

        <SettingRow label="Does your company have ESI?">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-slate-600">{yesNo(statutory.esi_enabled)}</span>
            <Toggle
              checked={!!statutory.esi_enabled}
              disabled={!isPrivileged}
              onChange={(v) => setStatutory({ ...statutory, esi_enabled: v })}
            />
          </div>
        </SettingRow>

        {statutory.esi_enabled && (
          <>
            <SettingRow label="ESI employee contribution (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.esi_employee_percent ?? '0.75'}
                disabled={!isPrivileged}
                onChange={(e) => setStatutory({ ...statutory, esi_employee_percent: e.target.value })}
              />
            </SettingRow>
            <SettingRow label="ESI employer contribution (%)">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.esi_employer_percent ?? '3.25'}
                disabled={!isPrivileged}
                onChange={(e) => setStatutory({ ...statutory, esi_employer_percent: e.target.value })}
              />
            </SettingRow>
            <SettingRow label="ESI gross salary threshold (₹/month)">
              <input
                type="number"
                step="1"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                value={statutory.esi_gross_threshold ?? '21000'}
                disabled={!isPrivileged}
                onChange={(e) => setStatutory({ ...statutory, esi_gross_threshold: e.target.value })}
              />
            </SettingRow>
          </>
        )}

        <SettingRow label="Do you deduct professional tax?">
          <div className="flex items-center justify-end gap-3">
            <span className="text-sm text-slate-600">{yesNo(statutory.pt_enabled)}</span>
            <Toggle
              checked={!!statutory.pt_enabled}
              disabled={!isPrivileged}
              onChange={(v) => setStatutory({ ...statutory, pt_enabled: v })}
            />
          </div>
        </SettingRow>

        {statutory.pt_enabled && (
          <SettingRow label="Professional tax (monthly ₹)">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              value={statutory.professional_tax_monthly}
              disabled={!isPrivileged}
              onChange={(e) => setStatutory({ ...statutory, professional_tax_monthly: e.target.value })}
            />
          </SettingRow>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 dark:border-slate-800">
        <div className="py-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Company bank account (salary payout)</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Debit account used when you upload the NEFT file to your bank. Shown as a header row in the payout CSV.
          </p>
        </div>
        <SettingRow label="Account holder name">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={statutory.company_account_holder || ''}
            disabled={!isPrivileged}
            onChange={(e) => setStatutory({ ...statutory, company_account_holder: e.target.value })}
          />
        </SettingRow>
        <SettingRow label="Bank name">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={statutory.company_bank_name || ''}
            disabled={!isPrivileged}
            onChange={(e) => setStatutory({ ...statutory, company_bank_name: e.target.value })}
          />
        </SettingRow>
        <SettingRow label="Account number">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={statutory.company_account_number || ''}
            disabled={!isPrivileged}
            onChange={(e) => setStatutory({ ...statutory, company_account_number: e.target.value })}
          />
        </SettingRow>
        <SettingRow label="IFSC code">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase dark:border-slate-600 dark:bg-slate-900"
            value={statutory.company_ifsc || ''}
            disabled={!isPrivileged}
            onChange={(e) => setStatutory({ ...statutory, company_ifsc: e.target.value.toUpperCase() })}
          />
        </SettingRow>
      </div>

      {isPrivileged && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save payroll settings
          </button>
        </div>
      )}
    </form>
  )
}
