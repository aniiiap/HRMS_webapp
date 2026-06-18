import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Download, FileText, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import StatusBadge from '../ui/StatusBadge'
import EmptyState from '../ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { fmtInr, fmtInrFull } from '../../utils/payrollFormat'

export default function EmployeePayslipPortal({ employeeId: filterEmployeeId }) {
  const { isManagerPlus, isPrivileged } = useAuth()
  const [rows, setRows] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterEmployeeId ? { employee: filterEmployeeId } : {}
      const { data } = await api.get('/api/payroll/results/', { params })
      const list = (Array.isArray(data) ? data : data.results || []).sort((a, b) => (b.run || 0) - (a.run || 0))
      setRows(list)
      const runIds = [...new Set(list.map((r) => r.run))]
      if (runIds.length && (isManagerPlus || isPrivileged)) {
        const runRes = await api.get('/api/payroll/runs/')
        const allRuns = Array.isArray(runRes.data) ? runRes.data : runRes.data.results || []
        setRuns(allRuns.filter((r) => runIds.includes(r.id)))
      } else {
        setRuns([])
      }
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [filterEmployeeId, isManagerPlus, isPrivileged])

  useEffect(() => {
    void load()
  }, [load])

  const runMap = useMemo(() => Object.fromEntries(runs.map((r) => [r.id, r])), [runs])

  const filtered = useMemo(() => {
    if (yearFilter === 'all') return rows
    return rows.filter((r) => {
      const run = runMap[r.run]
      return run && String(run.period_year) === yearFilter
    })
  }, [rows, runMap, yearFilter])

  const years = useMemo(() => {
    const ys = new Set(runs.map((r) => r.period_year))
    return [...ys].sort((a, b) => b - a)
  }, [runs])

  const ytdNet = useMemo(() => {
    if (yearFilter === 'all') return rows.reduce((s, r) => s + Number(r.net_pay || 0), 0)
    return filtered.reduce((s, r) => s + Number(r.net_pay || 0), 0)
  }, [filtered, rows, yearFilter])

  async function downloadPdf(resultId, run) {
    try {
      const res = await api.get(`/api/payroll/results/${resultId}/payslip-pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `payslip_${run?.period_year || ''}_${String(run?.period_month || '').padStart(2, '0')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Payslip downloaded.')
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function previewPdf(resultId) {
    try {
      const res = await api.get(`/api/payroll/results/${resultId}/payslip-pdf/`, { responseType: 'blob' })
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(res.data))
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading payslips…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Payslip portal</h3>
          <p className="mt-1 text-sm text-slate-500">View and download finalized monthly payslips.</p>
        </div>
        <label className="text-xs font-medium text-slate-500">
          Filter by year
          <select
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile icon={FileText} label="Payslips" value={String(filtered.length)} />
        <SummaryTile icon={TrendingUp} label={yearFilter === 'all' ? 'Total net (all)' : `Net ${yearFilter}`} value={fmtInr(ytdNet)} />
        <SummaryTile
          icon={Download}
          label="Available downloads"
          value={String(filtered.filter((r) => ['finalized', 'paid'].includes(runMap[r.run]?.status)).length)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No payslips yet"
          description="Payslips appear here after HR finalizes payroll for a month."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/30">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Pay period</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net pay</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const run = runMap[p.run]
                const period = run ? `${dayjs(`${run.period_year}-${run.period_month}-01`).format('MMMM YYYY')}` : `#${p.run}`
                const canPdf = run && ['finalized', 'paid'].includes(run.status)
                return (
                  <Fragment key={p.id}>
                    <tr className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 font-medium">{period}</td>
                      <td className="px-4 py-3 tabular-nums">{fmtInrFull(p.gross_prorated)}</td>
                      <td className="px-4 py-3 tabular-nums text-rose-600">{fmtInrFull(p.total_deductions)}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{fmtInrFull(p.net_pay)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run?.status || 'draft'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="text-xs font-medium text-brand-600" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                            {expandedId === p.id ? 'Hide' : 'Breakdown'}
                          </button>
                          {canPdf && (
                            <>
                              <button type="button" className="text-xs font-medium text-slate-600" onClick={() => void previewPdf(p.id)}>
                                Preview
                              </button>
                              <button type="button" className="text-xs font-medium text-brand-600" onClick={() => void downloadPdf(p.id, run)}>
                                PDF
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === p.id && (
                      <tr className="bg-slate-50/80 dark:bg-slate-900/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <MiniStat label="Paid days" value={p.paid_days} />
                            <MiniStat label="LOP days" value={p.lop_days} />
                            <MiniStat label="PF" value={fmtInrFull(p.pf_employee)} />
                            <MiniStat label="TDS" value={fmtInrFull(p.tds)} />
                          </div>
                          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                            {(p.lines || []).map((ln) => (
                              <li key={ln.id} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span>{ln.component_name}</span>
                                <span className="tabular-nums">{fmtInrFull(ln.amount_prorated)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 p-4">
          <div className="mb-2 flex justify-end">
            <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm font-medium" onClick={closePreview}>
              Close preview
            </button>
          </div>
          <iframe title="Payslip preview" src={previewUrl} className="min-h-0 flex-1 rounded-xl bg-white" />
        </div>
      )}
    </div>
  )
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <Icon className="h-5 w-5 text-brand-600" />
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
