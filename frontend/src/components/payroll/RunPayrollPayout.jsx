import { CheckCircle, Download } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { fmtInrFull } from '../../utils/payrollFormat'

export default function RunPayrollPayout({
  results = [],
  selectedRun,
  onExportBank,
  onMarkPaid,
  markPaidBusy = false,
  isPrivileged,
}) {
  const canPayout = selectedRun && ['finalized', 'paid'].includes(selectedRun.status)
  const canMarkPaid = selectedRun?.status === 'finalized'

  const missingBank = results.filter(
    (r) => !r.is_on_hold && Number(r.net_pay) > 0 && (!r.bank_account_number || !r.bank_ifsc)
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Download the NEFT file for your bank, upload it in net banking, then mark payroll as paid when transfers
        complete. Configure company debit account under Setup → Payroll settings.
      </p>

      {missingBank.length > 0 && canPayout && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {missingBank.length} employee(s) missing bank account or IFSC — add details under Assign structure → Edit.
        </div>
      )}

      {canPayout && isPrivileged && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary !py-2 text-sm" onClick={() => onExportBank?.()}>
            <Download className="mr-1 inline h-4 w-4" />
            Download NEFT CSV
          </button>
          {canMarkPaid && (
            <button
              type="button"
              className="btn-primary !py-2 text-sm"
              disabled={markPaidBusy}
              onClick={() => onMarkPaid?.()}
            >
              <CheckCircle className="mr-1 inline h-4 w-4" />
              {markPaidBusy ? 'Updating…' : 'Mark payroll as paid'}
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="px-4 py-3">Bank account</th>
              <th className="px-4 py-3">Net pay</th>
              <th className="px-4 py-3">Payout</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <div className="font-medium">{r.employee_name}</div>
                  <div className="text-xs text-slate-500">{r.employee_code}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.department || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.designation || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {r.bank_account_number ? (
                    <>
                      <div>{r.bank_ifsc}</div>
                      <div className="text-slate-400">••••{String(r.bank_account_number).slice(-4)}</div>
                    </>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold">{fmtInrFull(r.net_pay)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={
                      r.is_on_hold ? 'on_hold' : r.payout_status === 'paid' || selectedRun?.status === 'paid' ? 'paid' : 'pending'
                    }
                  />
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {selectedRun ? 'No employee rows in this run.' : 'Select a payroll period with an active run.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
