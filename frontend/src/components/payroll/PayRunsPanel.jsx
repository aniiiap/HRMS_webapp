import StatusBadge from '../ui/StatusBadge'

export default function PayRunsPanel({
  runs = [],
  orgId,
  isPrivileged,
  newRun,
  setNewRun,
  periodYear,
  periodMonth,
  onCreateRun,
  onSelectRun,
  onRecalculate,
  onSyncEmployees,
  onMarkReady,
  onFinalize,
  onReopen,
  onDeleteRun,
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Create and manage payroll runs for any month. Selecting a run switches the period in the header to that month.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          onCreateRun?.(e)
        }}
        className="card flex flex-wrap items-end gap-3 p-4"
      >
        <div>
          <label className="text-xs text-slate-500">Year</label>
          <input
            className="block rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600"
            value={periodYear}
            readOnly
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Month</label>
          <input
            className="block rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600"
            value={periodMonth}
            readOnly
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Working days</label>
          <input
            className="block rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600"
            value={newRun.working_days}
            onChange={(e) => setNewRun({ ...newRun, working_days: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary !py-2" disabled={!orgId || !isPrivileged}>
          Create run for selected period
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Working days</th>
              <th className="px-4 py-3">Employees</th>
              {isPrivileged && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="font-medium text-brand-600 hover:underline"
                    onClick={() => onSelectRun?.(r)}
                  >
                    {r.period_year}-{String(r.period_month).padStart(2, '0')}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">{r.working_days}</td>
                <td className="px-4 py-3">{r.result_count}</td>
                {isPrivileged && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {r.status === 'draft' && (
                        <>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => onRecalculate?.(r.id)}>
                            Recalc
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => onSyncEmployees?.(r.id)}>
                            Sync staff
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => onMarkReady?.(r.id)}>
                            Mark ready
                          </button>
                          <button type="button" className="btn-primary !px-2 !py-1 text-xs" onClick={() => onFinalize?.(r.id)}>
                            Finalize
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => onDeleteRun?.(r.id)}>
                            Delete
                          </button>
                        </>
                      )}
                      {r.status === 'ready' && (
                        <>
                          <button type="button" className="btn-primary !px-2 !py-1 text-xs" onClick={() => onFinalize?.(r.id)}>
                            Finalize
                          </button>
                          <button type="button" className="btn-secondary !px-2 !py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => onDeleteRun?.(r.id)}>
                            Delete
                          </button>
                        </>
                      )}
                      {(r.status === 'finalized' || r.status === 'paid') && (
                        <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => onReopen?.(r.id)}>
                          Revert to draft
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No payroll runs yet. Create one for the selected period above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
