import { useState } from 'react'
import StatusBadge from '../ui/StatusBadge'
import { fmtInr, indiaFY } from '../../utils/payrollFormat'

const DECL_TABS = [
  { id: 'scheme', label: 'Tax scheme' },
  { id: 'deduction', label: 'Deductions (80C / 80D)' },
]

export default function DeclarationPanel({
  taxRows = [],
  isPrivileged,
  onApprove,
  onReject,
  myTax,
  setMyTax,
  onSubmitMyTax,
  isEmployeeView = false,
}) {
  const [declTab, setDeclTab] = useState('scheme')
  const fy = indiaFY()

  if (isEmployeeView) {
    return (
      <form onSubmit={onSubmitMyTax} className="card max-w-lg space-y-4 p-4">
        <h3 className="font-semibold">Investment &amp; tax declaration (FY {myTax.financial_year || fy})</h3>
        <label className="text-xs">
          Tax regime
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600"
            value={myTax.tax_regime || 'new'}
            onChange={(e) => setMyTax({ ...myTax, tax_regime: e.target.value })}
          >
            <option value="new">New regime (default FY26 — nil tax up to ₹12L taxable)</option>
            <option value="old">Old regime (claim 80C, 80D, HRA, etc.)</option>
          </select>
        </label>
        {myTax.tax_regime === 'old' && (
          <>
            <label className="text-xs">
              Section 80C
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600"
                value={myTax.section_80c}
                onChange={(e) => setMyTax({ ...myTax, section_80c: e.target.value })}
              />
            </label>
            <label className="text-xs">
              Section 80D
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600"
                value={myTax.section_80d}
                onChange={(e) => setMyTax({ ...myTax, section_80d: e.target.value })}
              />
            </label>
            <label className="text-xs">
              Other Chapter VI-A
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600"
                value={myTax.other_chapter_vi_a}
                onChange={(e) => setMyTax({ ...myTax, other_chapter_vi_a: e.target.value })}
              />
            </label>
          </>
        )}
        {myTax.status && (
          <p className="text-sm text-slate-500">
            Status: <StatusBadge status={myTax.status} />
          </p>
        )}
        <button type="submit" className="btn-primary">
          Submit for approval
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
        {DECL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDeclTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              declTab === t.id ? 'bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200' : 'text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Employees submit regime choice and investments under <strong>Payslip portal → My declaration</strong>. Approve here before
        payroll uses old-regime deductions.
      </p>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">FY</th>
              {declTab === 'scheme' && <th className="px-3 py-2">Tax regime</th>}
              {declTab === 'deduction' && (
                <>
                  <th className="px-3 py-2">80C</th>
                  <th className="px-3 py-2">80D</th>
                  <th className="px-3 py-2">Other VI-A</th>
                </>
              )}
              <th className="px-3 py-2">Status</th>
              {isPrivileged && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {taxRows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2">{t.employee_name}</td>
                <td className="px-3 py-2">{t.financial_year}</td>
                {declTab === 'scheme' && (
                  <td className="px-3 py-2 capitalize">{t.tax_regime === 'old' ? 'Old regime' : 'New regime'}</td>
                )}
                {declTab === 'deduction' && (
                  <>
                    <td className="px-3 py-2">{fmtInr(t.section_80c)}</td>
                    <td className="px-3 py-2">{fmtInr(t.section_80d)}</td>
                    <td className="px-3 py-2">{fmtInr(t.other_chapter_vi_a)}</td>
                  </>
                )}
                <td className="px-3 py-2">
                  <StatusBadge status={t.status} />
                </td>
                {isPrivileged && (
                  <td className="px-3 py-2">
                    {t.status === 'submitted' && (
                      <span className="flex gap-2">
                        <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => onApprove?.(t.id)}>
                          Approve
                        </button>
                        <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => onReject?.(t.id)}>
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {taxRows.length === 0 && (
              <tr>
                <td colSpan={isPrivileged ? 7 : 6} className="px-4 py-10 text-center text-sm text-slate-500">
                  No declarations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
