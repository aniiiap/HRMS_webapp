import { useCallback, useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { api, messageFromError } from '../../api/client'

const FIELD_LABELS = {
  pf_enabled: 'PF enabled',
  pf_employee_contribution_type: 'PF contribution type',
  pf_employee_percent: 'PF employee %',
  pf_employer_percent: 'PF employer %',
  pf_ceiling_enabled: 'PF ceiling',
  pf_monthly_wage_ceiling: 'PF wage ceiling',
  esi_enabled: 'ESI enabled',
  esi_employee_percent: 'ESI employee %',
  esi_employer_percent: 'ESI employer %',
  esi_gross_threshold: 'ESI gross threshold',
  pt_enabled: 'Professional tax',
  professional_tax_monthly: 'PT monthly',
  tds_regime: 'Default TDS regime',
}

export default function StatutoryConfigHistory({ statutoryId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!statutoryId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/payroll/statutory-config/${statutoryId}/revision-history/`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [statutoryId])

  useEffect(() => {
    void load()
  }, [load])

  if (!statutoryId) return null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
        <History className="h-4 w-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Settings change history</h3>
      </div>
      <div className="px-5 py-4">
        {loading && <p className="text-sm text-slate-500">Loading history…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="text-sm text-slate-500">No changes recorded yet. Edits are logged when you save payroll settings.</p>
        )}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {row.changed_by_name || 'System'}
                </span>
                <span className="text-xs text-slate-500">
                  {row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : ''}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(row.snapshot || {})
                  .filter(([k]) => FIELD_LABELS[k])
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {FIELD_LABELS[k]}: {String(v)}
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
