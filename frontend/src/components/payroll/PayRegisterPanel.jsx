import { Fragment, useState, useEffect } from 'react'
import { Eye, FileDown, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import StatusBadge from '../ui/StatusBadge'
import PayslipPreviewModal from './PayslipPreviewModal'
import { fmtInr, fmtInrFull, groupResultLines } from '../../utils/payrollFormat'

function ManageExpensesModal({ employeeId, employeeName, runId, onClose, onRecalculate }) {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClaims() {
      try {
        const { data } = await api.get('/api/expenses/claims/', { params: { employee: employeeId, status: 'approved', is_reimbursed: false } })
        setClaims(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        toast.error('Failed to load expenses')
      } finally {
        setLoading(false)
      }
    }
    void fetchClaims()
  }, [employeeId])

  async function togglePayroll(claimId, currentSkip) {
    try {
      await api.post(`/api/expenses/claims/${claimId}/toggle_payroll/`)
      setClaims(claims.map(c => c.id === claimId ? { ...c, skip_payroll: !currentSkip } : c))
    } catch (err) {
      toast.error('Failed to toggle expense')
    }
  }

  async function handleSave() {
    onClose()
    if (onRecalculate) onRecalculate(runId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Expenses for {employeeName}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="my-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading expenses...</div>
          ) : claims.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No pending approved expenses found for this employee.</div>
          ) : (
            <div className="space-y-2">
              {claims.map(claim => (
                <label key={claim.id} className="flex cursor-pointer items-start justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{claim.title}</div>
                    <div className="text-xs text-slate-500">₹{claim.amount}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!claim.skip_payroll}
                    onChange={() => void togglePayroll(claim.id, claim.skip_payroll)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" className="btn-primary w-full" onClick={handleSave}>
            Done & Recalculate Payroll
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PayRegisterPanel({
  results = [],
  selectedRun,
  isPrivileged,
  onUpdateResult,
  onRefreshReadiness,
  onRecalculate,
  onRefreshPaidDays,
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [preview, setPreview] = useState({ url: null, name: '', period: '', resultId: null })
  const [manageExpensesFor, setManageExpensesFor] = useState(null)

  const canEdit = selectedRun && (selectedRun.status === 'draft' || selectedRun.status === 'ready') && isPrivileged
  const canPayslip = selectedRun && ['finalized', 'paid'].includes(selectedRun.status)

  async function openPayslipPreview(row) {
    try {
      const res = await api.get(`/api/payroll/results/${row.id}/payslip-pdf/`, { responseType: 'blob' })
      if (preview.url) URL.revokeObjectURL(preview.url)
      const period = selectedRun
        ? `${selectedRun.period_year}-${String(selectedRun.period_month).padStart(2, '0')}`
        : ''
      setPreview({
        url: URL.createObjectURL(res.data),
        name: row.employee_name,
        period,
        resultId: row.id,
      })
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function closePreview() {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ url: null, name: '', period: '', resultId: null })
  }

  async function downloadPayslip(resultId) {
    try {
      const res = await api.get(`/api/payroll/results/${resultId}/payslip-pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip_${resultId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Payslip downloaded.')
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function handleExportRegister() {
    import('../../utils/csvExport').then(({ downloadCSV }) => {
      const exportData = results.map(row => ({
        'Employee Name': row.employee_name,
        'Employee Code': row.employee_code,
        'Department': row.department || '',
        'Designation': row.designation || '',
        'Paid Days': row.paid_days,
        'Weekend Days': getWeekendDaysCount(row),
        'LOP Days': row.lop_days,
        'Basic': row.basic,
        'HRA': row.hra,
        'Allowances': row.other_allowances,
        'Reimbursements': row.total_reimbursements,
        'Gross Pay': row.gross_prorated,
        'Deductions': row.total_deductions,
        'Net Pay': row.net_pay,
        'Status': row.status || selectedRun?.status || 'draft'
      }))
      const period = selectedRun ? `${selectedRun.period_year}-${String(selectedRun.period_month).padStart(2, '0')}` : 'Payroll'
      downloadCSV(exportData, `Pay_Register_${period}.csv`)
    })
  }

  function getWeekendDaysCount(row) {
    if (!selectedRun || !selectedRun.period_year || !selectedRun.period_month || !selectedRun.working_days) return 0;
    const year = Number(selectedRun.period_year);
    const month = Number(selectedRun.period_month);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Math.max(0, daysInMonth - Number(selectedRun.working_days));
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleExportRegister}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
        >
          <FileDown className="h-4 w-4" />
          Export Register
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Paid</th>
              <th className="px-3 py-3">Weekends</th>
              <th className="px-3 py-3">LOP</th>
              <th className="px-3 py-3">Gross</th>
              <th className="px-3 py-3">Net</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const open = expandedId === row.id
              const g = groupResultLines(row)
              return (
                <Fragment key={row.id}>
                  <tr className={`border-t border-slate-100 transition dark:border-slate-800 ${open ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''}`}>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-bold text-brand-600 dark:border-slate-600"
                        onClick={() => setExpandedId(open ? null : row.id)}
                      >
                        {open ? '−' : '+'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{row.employee_name}</div>
                      <div className="text-xs text-slate-500">{row.employee_code}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{row.department || '—'}</td>
                    <td className="px-3 py-3">
                      {canEdit ? (
                        <input
                          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center dark:border-slate-600"
                          defaultValue={row.paid_days}
                          onBlur={(e) => {
                            const v = e.target.value
                            if (v !== String(row.paid_days)) void onUpdateResult(row, { paid_days: v })
                          }}
                        />
                      ) : (
                        <span>
                          {row.paid_days}
                          {row.paid_days_overridden && <span className="ml-1 text-amber-600">*</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">{getWeekendDaysCount(row)}</td>
                    <td className="px-3 py-3">{row.lop_days}</td>
                    <td className="px-3 py-3 tabular-nums font-medium">{fmtInr(row.gross_prorated)}</td>
                    <td className="px-3 py-3 tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{fmtInr(row.net_pay)}</td>
                    <td className="px-3 py-3">
                      {row.is_on_hold ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">On hold</span>
                      ) : (
                        <StatusBadge status={selectedRun?.status || 'draft'} />
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canPayslip && (
                          <>
                            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Preview payslip" onClick={() => void openPayslipPreview(row)}>
                              <Eye className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" title="Download" onClick={() => void downloadPayslip(row.id)}>
                              <FileDown className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/90 dark:bg-slate-900/60">
                      <td colSpan={10} className="px-6 py-5">
                        <RegisterBreakdown 
                          g={g} 
                          row={row} 
                          canEdit={canEdit} 
                          onUpdateResult={onUpdateResult} 
                          onOpenManageExpenses={setManageExpensesFor}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  No employees in this run. Sync staff or create a new pay run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PayslipPreviewModal
        url={preview.url}
        employeeName={preview.name}
        period={preview.period}
        onClose={closePreview}
        onDownload={preview.resultId ? () => void downloadPayslip(preview.resultId) : undefined}
      />
      {manageExpensesFor && (
        <ManageExpensesModal
          employeeId={manageExpensesFor.employee}
          employeeName={manageExpensesFor.employee_name}
          runId={selectedRun?.id}
          onClose={() => setManageExpensesFor(null)}
          onRecalculate={onRecalculate}
        />
      )}
    </>
  )
}

function RegisterBreakdown({ g, row, canEdit, onUpdateResult, onOpenManageExpenses }) {
  const att = row.attendance_summary
  return (
    <div className="space-y-4">
      {att && (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">From attendance &amp; leave</p>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-slate-700 dark:text-slate-300">
            <div>
              <dt className="inline text-slate-500">Present </dt>
              <dd className="inline font-medium tabular-nums">{att.present_days}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Paid leave </dt>
              <dd className="inline font-medium tabular-nums">{att.paid_leave_days}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Absent </dt>
              <dd className="inline font-medium tabular-nums">{att.absent_days}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Unpaid leave </dt>
              <dd className="inline font-medium tabular-nums">{att.unpaid_leave_days}</dd>
            </div>
            {att.half_day_penalties > 0 && (
              <div>
                <dt className="inline text-slate-500">Half-day (LOP) </dt>
                <dd className="inline font-medium tabular-nums">{att.half_day_penalties}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-slate-500">→ Paid days </dt>
              <dd className="inline font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                {row.paid_days}
                {row.paid_days_overridden && ' (manual)'}
              </dd>
            </div>
            <div>
              <dt className="inline text-slate-500">LOP </dt>
              <dd className="inline font-semibold tabular-nums">{row.lop_days}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">
            Net pay = salary structure × (paid days ÷ {row.working_days} working days) minus PF/ESI/PT/TDS where applicable.
          </p>
        </div>
      )}
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-emerald-200/70 bg-white p-4 dark:border-emerald-900/40 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Earnings (prorated)</h4>
          {canEdit && (
            <button type="button" onClick={() => onOpenManageExpenses(row)} className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 uppercase tracking-wide bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded">
              Manage Expenses
            </button>
          )}
        </div>
        <dl className="mt-3 space-y-2 text-sm">
          <BreakdownRow label="Basic" value={fmtInrFull(g.basic)} />
          <BreakdownRow label="HRA" value={fmtInrFull(g.hra)} />
          <BreakdownRow label="Allowances & other" value={fmtInrFull(g.allowances)} />
          {g.earnings
            .filter((ln) => !['BASIC', 'HRA'].includes((ln.component_code || '').toUpperCase()))
            .map((ln) => (
              <BreakdownRow 
                key={ln.id} 
                label={ln.component_name} 
                value={fmtInrFull(ln.amount_prorated)} 
                sub 
              />
            ))}
          <BreakdownRow label="Gross salary" value={fmtInrFull(g.gross)} bold />
        </dl>
      </div>
      <div className="rounded-xl border border-rose-200/70 bg-white p-4 dark:border-rose-900/40 dark:bg-slate-900">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">Deductions</h4>
        <dl className="mt-3 space-y-2 text-sm">
          <BreakdownRow label="Provident Fund (PF)" value={`− ${fmtInrFull(g.pf)}`} />
          <BreakdownRow label="ESI" value={`− ${fmtInrFull(g.esi)}`} />
          <BreakdownRow label="Professional Tax (PT)" value={`− ${fmtInrFull(g.pt)}`} />
          <BreakdownRow label="TDS" value={`− ${fmtInrFull(g.tds)}`} />
          <BreakdownRow
            label="Total deductions"
            value={`− ${fmtInrFull(Number(row.total_deductions || 0))}`}
            bold
          />
          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
            <BreakdownRow label="Net pay" value={fmtInrFull(g.net)} accent />
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-slate-400">
          Employer PF {fmtInrFull(row.pf_employer)} · Employer ESI {fmtInrFull(row.esi_employer)}
        </p>
        {canEdit && (
          <label className="mt-4 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              defaultChecked={row.is_on_hold}
              onChange={(e) => void onUpdateResult(row, { is_on_hold: e.target.checked })}
            />
            Hold payroll for this employee
          </label>
        )}
      </div>
    </div>
    </div>
  )
}

function BreakdownRow({ label, value, bold, accent, sub, action }) {
  return (
    <div
      className={`flex justify-between gap-2 items-center ${sub ? 'pl-3 text-xs text-slate-500' : ''} ${
        bold ? 'font-semibold text-slate-900 dark:text-white' : accent ? 'font-bold text-brand-700 dark:text-brand-300' : ''
      }`}
    >
      <dt className="flex items-center">
        {label}
        {action && action}
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
