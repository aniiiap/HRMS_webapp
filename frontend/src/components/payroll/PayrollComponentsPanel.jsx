import { STANDARD_DEDUCTION_COMPONENTS, STANDARD_EARNING_COMPONENTS } from '../../utils/payrollFormat'

const DEFAULT_COMP_FORM = {
  code: '',
  name: '',
  category: 'recurring',
  kind: 'earning',
  taxable: true,
  pf_wage_part: false,
  esi_wage_part: true,
  prorate_with_attendance: true,
}

export default function PayrollComponentsPanel({
  components = [],
  compForm,
  setCompForm,
  onSubmit,
  onDelete,
  isPrivileged,
}) {
  const earnings = components.filter((c) => c.kind === 'earning')
  const deductions = components.filter((c) => c.kind === 'deduction')

  const existingCodes = new Set(components.map((c) => c.code?.toUpperCase()))

  function prefillStandard(item, kind) {
    setCompForm({
      ...DEFAULT_COMP_FORM,
      code: item.code,
      name: item.name,
      kind,
      category: item.category || (kind === 'deduction' ? 'statutory' : 'recurring'),
      taxable: item.taxable !== undefined ? item.taxable : true,
      pf_wage_part: item.pf_wage_part !== undefined ? item.pf_wage_part : item.code === 'BASIC',
      esi_wage_part: item.esi_wage_part !== undefined ? item.esi_wage_part : kind === 'earning',
      prorate_with_attendance:
        item.prorate_with_attendance !== undefined ? item.prorate_with_attendance : kind === 'earning',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Salary components</h3>
        <p className="mt-1 text-sm text-slate-500">
          Define earnings (Basic, HRA, Conveyance, Bonus…) and deductions (PF, ESI, loan recovery…). Then assign amounts per
          employee under <strong>Salary structure</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-4 text-sm dark:border-brand-900/50 dark:bg-brand-950/20">
        <h4 className="font-semibold text-brand-900 dark:text-brand-200">India salary structure — pre-loaded components</h4>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          All standard earnings are <strong>already added</strong>. Enter <strong>annual CTC</strong> on Salary structure — the system
          auto-calculates Basic, HRA, fixed allowances, variable pay, employer costs, and Special allowance. Edit formulas under
          Payroll → Statutory → CTC formulas.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
          <li>
            <strong>PF</strong> (12% of Basic), <strong>ESI</strong>, <strong>PT</strong>, <strong>TDS</strong> — computed
            automatically on pay run from <strong>Statutory</strong> settings
          </li>
          <li>
            <strong>Employer EPF, gratuity, group health</strong> — part of CTC but not in-hand; tracked in statutory / CTC
            reports, not as payslip earnings
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Example: annual CTC ₹3,60,000 → monthly CTC ₹30,000 → in-hand gross ₹27,500 (after employer PF, gratuity, health). Edit
          % and fixed amounts under Payroll → Statutory → CTC formulas.
          on individual structures as needed.
        </p>
      </div>

      {!isPrivileged && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Only <strong>Admin</strong> or <strong>HR</strong> can add or delete components. You can view the list below.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <StandardList
          title="Standard earnings"
          items={STANDARD_EARNING_COMPONENTS}
          existingCodes={existingCodes}
          tone="emerald"
          isPrivileged={isPrivileged}
          kind="earning"
          onPick={prefillStandard}
        />
        <StandardList
          title="Standard deductions"
          items={STANDARD_DEDUCTION_COMPONENTS}
          existingCodes={existingCodes}
          tone="rose"
          isPrivileged={isPrivileged}
          kind="deduction"
          onPick={prefillStandard}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {isPrivileged && (
          <form onSubmit={onSubmit} className="card space-y-3 p-5">
            <h4 className="font-semibold">Add custom component</h4>
            <p className="text-xs text-slate-500">Click a standard tag above to pre-fill, or enter your own code and name.</p>
            <input
              required
              placeholder="Code (e.g. MEDICAL_ALLOWANCE)"
              className="input-field"
              value={compForm.code}
              onChange={(e) => setCompForm({ ...compForm, code: e.target.value })}
            />
            <input
              required
              placeholder="Display name"
              className="input-field"
              value={compForm.name}
              onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
            />
            <select className="input-field" value={compForm.kind} onChange={(e) => setCompForm({ ...compForm, kind: e.target.value })}>
              <option value="earning">Earning</option>
              <option value="deduction">Deduction</option>
            </select>
            <select className="input-field" value={compForm.category} onChange={(e) => setCompForm({ ...compForm, category: e.target.value })}>
              <option value="basic_structure">Basic structure</option>
              <option value="recurring">Recurring</option>
              <option value="variable">Variable</option>
              <option value="adhoc">Adhoc</option>
              <option value="statutory">Statutory</option>
            </select>
            <div className="space-y-2 text-sm">
              {[
                ['taxable', 'Taxable'],
                ['pf_wage_part', 'Count in PF wage (usually Basic only)'],
                ['esi_wage_part', 'Count in ESI wage'],
                ['prorate_with_attendance', 'Prorate when paid days are less than working days'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={compForm[key]} onChange={(e) => setCompForm({ ...compForm, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <button type="submit" className="btn-primary w-full">
              Add component
            </button>
          </form>
        )}

        <div className="space-y-4">
          <ComponentTable title="Earnings" tone="emerald" rows={earnings} onDelete={onDelete} isPrivileged={isPrivileged} />
          <ComponentTable title="Deductions" tone="rose" rows={deductions} onDelete={onDelete} isPrivileged={isPrivileged} />
        </div>
      </div>
    </div>
  )
}

function StandardList({ title, items, existingCodes, tone, isPrivileged, kind, onPick }) {
  const border = tone === 'emerald' ? 'border-emerald-200 dark:border-emerald-900' : 'border-rose-200 dark:border-rose-900'
  const bg = tone === 'emerald' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-rose-50/50 dark:bg-rose-950/20'
  return (
    <div className={`rounded-xl border p-4 ${border} ${bg}`}>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="mt-1 text-xs text-slate-500">
        {isPrivileged ? 'Click an unconfigured tag to pre-fill the add form.' : 'Green check = already in your org.'}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const configured = existingCodes.has(item.code)
          const Tag = isPrivileged && !configured ? 'button' : 'span'
          return (
            <li key={item.code}>
              <Tag
                type={Tag === 'button' ? 'button' : undefined}
                onClick={Tag === 'button' ? () => onPick(item, kind) : undefined}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  configured
                    ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                    : isPrivileged
                      ? 'cursor-pointer border border-dashed border-slate-300 text-slate-600 hover:border-brand-400 hover:bg-white dark:border-slate-600 dark:hover:border-brand-600'
                      : 'border border-dashed border-slate-300 text-slate-500 dark:border-slate-600'
                }`}
                title={item.hint || (configured ? 'Already configured' : isPrivileged ? 'Click to add' : 'Not configured yet')}
              >
                {item.name}
                {configured && <span className="ml-1 text-emerald-600">✓</span>}
              </Tag>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ComponentTable({ title, tone, rows, onDelete, isPrivileged }) {
  const headBg = tone === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className={`px-4 py-2.5 text-sm font-semibold ${headBg}`}>{title} ({rows.length})</div>
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Category</th>
            {isPrivileged && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2.5 font-mono text-xs">{c.code}</td>
              <td className="px-4 py-2.5">{c.name}</td>
              <td className="px-4 py-2.5 capitalize text-slate-500">{c.category?.replace(/_/g, ' ')}</td>
              {isPrivileged && (
                <td className="px-4 py-2.5 text-right">
                  {!c.is_system && (
                    <button type="button" className="text-xs font-medium text-rose-600" onClick={() => onDelete(c.id)}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                No {title.toLowerCase()} components.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
