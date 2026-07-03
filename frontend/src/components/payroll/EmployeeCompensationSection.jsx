import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { IndianRupee, TrendingUp, Trash2 } from 'lucide-react'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'
import { fmtInr, fmtInrFull } from '../../utils/payrollFormat'
import SalaryInputExplainer from './SalaryInputExplainer'

export default function EmployeeCompensationSection({ employeeId, readOnly = false }) {
  const [loading, setLoading] = useState(true)
  const [comp, setComp] = useState(null)
  const [revisions, setRevisions] = useState([])
  const [form, setForm] = useState({
    ctc_type: 'gross',
    monthly_gross: '',
    annual_ctc: '',
    effective_from: dayjs().format('YYYY-MM-DD'),
    payroll_group: 'default',
    pf_applicable: true,
    esi_applicable: true,
    pt_applicable: true,
    tds_applicable: true,
  })

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    try {
      const [compRes, revRes] = await Promise.all([
        api.get('/api/payroll/compensation/', { params: { employee: employeeId } }),
        api.get('/api/payroll/compensation/revision-history/', { params: { employee: employeeId } }),
      ])
      const list = Array.isArray(compRes.data) ? compRes.data : compRes.data.results || []
      const row = list[0]
      setComp(row || null)
      setRevisions(Array.isArray(revRes.data) ? revRes.data : [])
      if (row) {
        setForm({
          ctc_type: row.ctc_type === 'monthly' ? 'monthly_ctc' : row.ctc_type || 'gross',
          monthly_gross:
            row.ctc_type === 'monthly' && row.annual_ctc
              ? String(Math.round(Number(row.annual_ctc) / 12))
              : row.monthly_gross || '',
          annual_ctc: row.annual_ctc || '',
          effective_from: row.effective_from || dayjs().format('YYYY-MM-DD'),
          payroll_group: row.payroll_group || 'default',
          pf_applicable: row.pf_applicable !== false,
          esi_applicable: row.esi_applicable !== false,
          pt_applicable: row.pt_applicable !== false,
          tds_applicable: row.tds_applicable !== false,
        })
      }
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(e) {
    e.preventDefault()
    try {
      const saveType = form.ctc_type === 'monthly_ctc' ? 'monthly' : form.ctc_type
      const payload = {
        employee: employeeId,
        ...form,
        ctc_type: saveType,
        monthly_gross: form.ctc_type === 'annual' ? null : form.monthly_gross,
        annual_ctc: form.ctc_type === 'annual' ? form.annual_ctc : null,
      }
      if (comp?.id) {
        await api.patch(`/api/payroll/compensation/${comp.id}/`, payload)
        toast.success('Compensation updated.')
      } else {
        await api.post('/api/payroll/compensation/', payload)
        toast.success('Compensation saved.')
      }
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function deleteRevision(id) {
    const ok = await confirm({
      title: 'Delete salary revision?',
      message: 'This will delete the revision history and the associated salary structure lines that started on this date. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/payroll/compensation/delete-revision/${id}/`)
      toast.success('Revision deleted.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading compensation…</p>
  }

  const displayGross = comp?.monthly_gross
  const displayAnnual = comp?.annual_ctc || (displayGross ? Number(displayGross) * 12 : null)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Compensation</h3>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <KpiCard icon={IndianRupee} label="Monthly gross" value={displayGross ? fmtInrFull(displayGross) : '—'} />
            <KpiCard icon={TrendingUp} label="Annual CTC" value={displayAnnual ? fmtInrFull(displayAnnual) : '—'} />
          </div>

          {canEdit && (
            <form onSubmit={saveComp} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
              <h4 className="text-sm font-semibold">{comp ? 'Revise compensation' : 'Add compensation details'}</h4>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-500">
                  Input format
                  <select className="input-field mt-1" value={form.ctc_type} onChange={(e) => setForm({ ...form, ctc_type: e.target.value })}>
                    <option value="monthly">Monthly gross salary</option>
                    <option value="annual">Annual CTC</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-500">
                  Effective from
                  <input type="date" className="input-field mt-1" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
                </label>
                {form.ctc_type === 'monthly' ? (
                  <label className="text-xs font-medium text-slate-500 sm:col-span-2">
                    Monthly gross salary
                    <input type="number" min="0" className="input-field mt-1 font-semibold" value={form.monthly_gross} onChange={(e) => setForm({ ...form, monthly_gross: e.target.value })} />
                  </label>
                ) : (
                  <label className="text-xs font-medium text-slate-500 sm:col-span-2">
                    Annual CTC
                    <input type="number" min="0" className="input-field mt-1 font-semibold" value={form.annual_ctc} onChange={(e) => setForm({ ...form, annual_ctc: e.target.value })} />
                  </label>
                )}
                <label className="text-xs font-medium text-slate-500 sm:col-span-2">
                  Payroll group
                  <input className="input-field mt-1" value={form.payroll_group} onChange={(e) => setForm({ ...form, payroll_group: e.target.value })} />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {[
                  ['pf_applicable', 'Deduct PF for this employee'],
                  ['esi_applicable', 'Deduct ESI'],
                  ['pt_applicable', 'Professional tax'],
                  ['tds_applicable', 'TDS estimate'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-primary mt-5">
                {comp ? 'Save compensation revision' : 'Set compensation'}
              </button>
            </form>
          )}

        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Salary revision history</h4>
          {revisions.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No revisions yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3">Effective</th>
                    <th className="px-4 py-3">Monthly gross</th>
                    <th className="px-4 py-3">Annual CTC</th>
                    {canEdit && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3">{dayjs(r.effective_from).format('MMM YYYY')}</td>
                      <td className="px-4 py-3 font-semibold">{fmtInrFull(r.monthly_gross)}</td>
                      <td className="px-4 py-3">{fmtInrFull(r.annual_ctc)}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600"
                            onClick={() => void deleteRevision(r.id)}
                            title="Delete revision"
                          >
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      {Icon && <Icon className="h-5 w-5 text-brand-600" />}
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{value || '—'}</p>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
