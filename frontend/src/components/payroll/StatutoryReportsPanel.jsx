import { Download } from 'lucide-react'

const REPORT_ROWS = [
  { kind: 'pf', label: 'PF ECR / contribution report', formats: ['CSV'] },
  { kind: 'esi', label: 'ESI contribution report', formats: ['CSV'] },
  { kind: 'pt', label: 'Professional tax report', formats: ['CSV'] },
  { kind: 'tds', label: 'TDS / income tax report', formats: ['CSV'] },
  { kind: 'register', label: 'Consolidated salary register', formats: ['CSV'] },
  { kind: 'bank', label: 'Bank transfer file', formats: ['CSV'] },
]

export default function StatutoryReportsPanel({ selectedRun, onExport }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Download statutory and reconciliation reports for the selected payroll run.
      </p>

      {!selectedRun && (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Create or select a payroll run for this period first.
        </div>
      )}

      {selectedRun && (
        <div className="space-y-6">
          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">PF</h4>
            <div className="space-y-2">
              {REPORT_ROWS.filter((r) => r.kind === 'pf').map((row) => (
                <ReportRow key={row.kind} row={row} onExport={() => onExport?.(row.kind)} />
              ))}
            </div>
          </section>
          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">ESI</h4>
            <div className="space-y-2">
              {REPORT_ROWS.filter((r) => r.kind === 'esi').map((row) => (
                <ReportRow key={row.kind} row={row} onExport={() => onExport?.(row.kind)} />
              ))}
            </div>
          </section>
          <section>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Reports</h4>
            <div className="space-y-2">
              {REPORT_ROWS.filter((r) => !['pf', 'esi'].includes(r.kind)).map((row) => (
                <ReportRow key={row.kind} row={row} onExport={() => onExport?.(row.kind)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function ReportRow({ row, onExport }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/30">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</span>
      <div className="flex gap-2">
        {row.formats.map((fmt) => (
          <button key={fmt} type="button" className="btn-secondary !py-1.5 text-xs" onClick={onExport}>
            <Download className="mr-1 inline h-3.5 w-3.5" />
            {fmt}
          </button>
        ))}
      </div>
    </div>
  )
}
