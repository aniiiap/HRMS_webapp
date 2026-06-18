import { Fragment, useState } from 'react'
import { Eye, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import StatusBadge from '../ui/StatusBadge'
import PayslipPreviewModal from './PayslipPreviewModal'
import { fmtInr, fmtInrFull, groupResultLines } from '../../utils/payrollFormat'

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

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Paid</th>
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
                      <td colSpan={9} className="px-6 py-5">
                        <RegisterBreakdown g={g} row={row} canEdit={canEdit} onUpdateResult={onUpdateResult} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {results.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
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
    </>
  )
}

function RegisterBreakdown({ g, row, canEdit, onUpdateResult }) {
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
        <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Earnings (prorated)</h4>
        <dl className="mt-3 space-y-2 text-sm">
          <BreakdownRow label="Basic" value={fmtInrFull(g.basic)} />
          <BreakdownRow label="HRA" value={fmtInrFull(g.hra)} />
          <BreakdownRow label="Allowances & other" value={fmtInrFull(g.allowances)} />
          {g.earnings
            .filter((ln) => !['BASIC', 'HRA'].includes((ln.component_code || '').toUpperCase()))
            .map((ln) => (
              <BreakdownRow key={ln.id} label={ln.component_name} value={fmtInrFull(ln.amount_prorated)} sub />
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

function BreakdownRow({ label, value, bold, accent, sub }) {
  return (
    <div
      className={`flex justify-between gap-2 ${sub ? 'pl-3 text-xs text-slate-500' : ''} ${
        bold ? 'font-semibold text-slate-900 dark:text-white' : accent ? 'font-bold text-brand-700 dark:text-brand-300' : ''
      }`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
