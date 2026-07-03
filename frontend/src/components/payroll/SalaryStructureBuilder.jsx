import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { Calculator, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'
import { fmtInr, fmtInrFull } from '../../utils/payrollFormat'
import CtcBreakupPreview from './CtcBreakupPreview'
import { defaultIncludeFlagsFromTemplate } from './ctcIncludeOptions'
import EmployeeBankDetailsSection from './EmployeeBankDetailsSection'
import SalaryInputExplainer from './SalaryInputExplainer'

export default function SalaryStructureBuilder({
  employees = [],
  components = [],
  employeeId: fixedEmployeeId,
  organizationId = '',
  canEdit = true,
}) {
  const [employeeId, setEmployeeId] = useState(fixedEmployeeId || '')
  const [ctcType, setCtcType] = useState('gross')
  const [monthlyGross, setMonthlyGross] = useState('')
  const [annualCtc, setAnnualCtc] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(dayjs().format('YYYY-MM-DD'))
  const [lines, setLines] = useState([])
  const [revisions, setRevisions] = useState([])
  const [compRecord, setCompRecord] = useState(null)
  const [compFlags, setCompFlags] = useState({})
  const [loading, setLoading] = useState(false)
  const [showAddLine, setShowAddLine] = useState(false)
  const [lineForm, setLineForm] = useState({
    component: '',
    calculation_mode: 'fixed',
    monthly_amount: '',
    percent_of_basic: '',
    sort_order: '10',
  })
  const [editingLineId, setEditingLineId] = useState(null)
  const [editDraft, setEditDraft] = useState({})

  const activeId = fixedEmployeeId || employeeId

  const confirm = useConfirm()
  const [ctcBreakup, setCtcBreakup] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [includeFlags, setIncludeFlags] = useState(() => defaultIncludeFlagsFromTemplate())
  const [salaryStructures, setSalaryStructures] = useState([])
  const [salaryStructureId, setSalaryStructureId] = useState('')

  const resolvedOrgId = useMemo(() => {
    if (organizationId) return organizationId
    const emp = employees.find((e) => String(e.id) === String(activeId))
    return emp?.organization || ''
  }, [organizationId, employees, activeId])

  const loadAll = useCallback(async () => {
    if (!activeId) {
      setLines([])
      setRevisions([])
      setMonthlyGross('')
      setAnnualCtc('')
      setCompRecord(null)
      return
    }
    try {
      const [linesRes, revRes, compRes] = await Promise.all([
        api.get('/api/payroll/salary-lines/', { params: { employee: activeId, is_active: 'true' } }),
        api.get('/api/payroll/compensation/revision-history/', { params: { employee: activeId } }),
        api.get('/api/payroll/compensation/', { params: { employee: activeId } }),
      ])
      setLines(Array.isArray(linesRes.data) ? linesRes.data : linesRes.data.results || [])
      setRevisions(Array.isArray(revRes.data) ? revRes.data : [])
      const compList = Array.isArray(compRes.data) ? compRes.data : compRes.data.results || []
      const comp = compList[0]
      if (comp) {
        setCompRecord(comp)
        setCompFlags({
          pf_applicable: comp.pf_applicable !== false,
          esi_applicable: comp.esi_applicable !== false,
          pt_applicable: comp.pt_applicable !== false,
          tds_applicable: comp.tds_applicable !== false,
        })
        if (comp.template_overrides && Object.keys(comp.template_overrides).length > 0) {
          setIncludeFlags(comp.template_overrides)
        }
        const type = comp.ctc_type === 'monthly' ? 'monthly_ctc' : comp.ctc_type || 'gross'
        setCtcType(type)
        if (type === 'monthly_ctc' && comp.annual_ctc) {
          setMonthlyGross(String(Math.round(Number(comp.annual_ctc) / 12)))
        } else {
          setMonthlyGross(String(comp.monthly_gross || ''))
        }
        setAnnualCtc(String(comp.annual_ctc || ''))
        if (comp.effective_from) setEffectiveFrom(comp.effective_from)
        setSalaryStructureId(comp.salary_structure ? String(comp.salary_structure) : '')
      }
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }, [activeId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  useEffect(() => {
    if (fixedEmployeeId) setEmployeeId(fixedEmployeeId)
  }, [fixedEmployeeId])

  useEffect(() => {
    if (!resolvedOrgId) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/api/payroll/ctc-template/for-organization/', {
          params: { organization: resolvedOrgId },
        })
        if (!cancelled && (!compRecord || !compRecord.template_overrides || Object.keys(compRecord.template_overrides).length === 0)) {
          setIncludeFlags(defaultIncludeFlagsFromTemplate(data))
        }
      } catch {
        if (!cancelled && (!compRecord || !compRecord.template_overrides || Object.keys(compRecord.template_overrides).length === 0)) {
          setIncludeFlags(defaultIncludeFlagsFromTemplate())
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedOrgId, compRecord])

  useEffect(() => {
    if (!resolvedOrgId) {
      setSalaryStructures([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/api/payroll/salary-structures/for-organization/', {
          params: { organization: resolvedOrgId },
        })
        if (!cancelled) setSalaryStructures(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setSalaryStructures([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [resolvedOrgId])

  useEffect(() => {
    if (!resolvedOrgId) {
      setCtcBreakup(null)
      return
    }
    const hasInput =
      (ctcType === 'annual' && Number(annualCtc) > 0) ||
      (ctcType === 'monthly_ctc' && Number(monthlyGross) > 0) ||
      (ctcType === 'gross' && Number(monthlyGross) > 0)
    if (!hasInput) {
      setCtcBreakup(null)
      return
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const body = {
          organization: Number(resolvedOrgId),
          employee: activeId ? Number(activeId) : undefined,
          input_mode: ctcType === 'gross' ? 'gross' : ctcType === 'monthly_ctc' ? 'monthly_ctc' : 'annual',
        }
        if (ctcType === 'annual') body.annual_ctc = annualCtc
        else if (ctcType === 'monthly_ctc') body.monthly_ctc = monthlyGross
        else body.target_monthly_gross = monthlyGross
        body.template_overrides = includeFlags
        body.pf_applicable = compFlags.pf_applicable !== false
        body.esi_applicable = compFlags.esi_applicable !== false
        body.pt_applicable = compFlags.pt_applicable !== false
        body.tds_applicable = compFlags.tds_applicable !== false
        const { data } = await api.post('/api/payroll/salary-lines/preview-from-ctc/', body)
        setCtcBreakup(data)
      } catch {
        setCtcBreakup(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [resolvedOrgId, activeId, ctcType, monthlyGross, annualCtc, includeFlags, compFlags])

  async function applyStructure() {
    const hasInput =
      (ctcType === 'annual' && Number(annualCtc) > 0) ||
      ((ctcType === 'gross' || ctcType === 'monthly_ctc') && Number(monthlyGross) > 0)
    if (!activeId || !hasInput) {
      toast.error('Enter the employee salary amount.')
      return
    }
    setLoading(true)
    try {
      const saveType = ctcType === 'monthly_ctc' ? 'monthly' : ctcType
      const payload = {
        employee: Number(activeId),
        ctc_type: saveType,
        effective_from: effectiveFrom,
        monthly_gross: ctcType === 'annual' ? null : monthlyGross,
        annual_ctc: ctcType === 'annual' ? annualCtc : null,
        pf_applicable: compFlags.pf_applicable !== false,
        esi_applicable: compFlags.esi_applicable !== false,
        pt_applicable: compFlags.pt_applicable !== false,
        tds_applicable: compFlags.tds_applicable !== false,
        template_overrides: includeFlags,
        salary_structure: salaryStructureId ? Number(salaryStructureId) : null,
      }
      if (compRecord?.id) {
        await api.patch(`/api/payroll/compensation/${compRecord.id}/`, payload)
      } else {
        await api.post('/api/payroll/compensation/', payload)
      }
      toast.success('Salary structure saved.')
      await loadAll()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  async function addLine(e) {
    e.preventDefault()
    if (!activeId) return
    try {
      await api.post('/api/payroll/salary-lines/', {
        employee: Number(activeId),
        component: Number(lineForm.component),
        calculation_mode: lineForm.calculation_mode,
        monthly_amount: lineForm.calculation_mode === 'fixed' ? lineForm.monthly_amount : '0',
        percent_of_basic: lineForm.calculation_mode !== 'fixed' ? lineForm.percent_of_basic : null,
        effective_from: effectiveFrom,
        sort_order: Number(lineForm.sort_order),
      })
      toast.success('Line added.')
      setShowAddLine(false)
      await loadAll()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function saveLineEdit(line) {
    try {
      await api.patch(`/api/payroll/salary-lines/${line.id}/`, {
        calculation_mode: editDraft.calculation_mode,
        monthly_amount: editDraft.calculation_mode === 'fixed' ? editDraft.monthly_amount : '0',
        percent_of_basic: editDraft.calculation_mode !== 'fixed' ? editDraft.percent_of_basic : null,
        effective_from: editDraft.effective_from,
        sort_order: Number(editDraft.sort_order),
      })
      toast.success('Line updated.')
      setEditingLineId(null)
      await loadAll()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function deleteLine(id) {
    const ok = await confirm({
      title: 'Remove salary line?',
      message: 'This line will be removed from the employee salary structure.',
      confirmLabel: 'Remove',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/payroll/salary-lines/${id}/`)
      await loadAll()
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
      await loadAll()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const activeLines = lines.filter((l) => !l.effective_to || l.effective_to >= effectiveFrom)
  const earningComponents = components.filter((c) => c.kind === 'earning')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <Calculator className="h-5 w-5 text-brand-600" />
          Salary structure
        </h3>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
            {!fixedEmployeeId && (
              <label className="mb-4 block text-xs font-medium text-slate-500">
                Employee
                <select className="input-field mt-1" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">Select employee…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employee_code} — {e.first_name} {e.last_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                Input type
                <select
                  className="input-field mt-1"
                  value={ctcType}
                  onChange={(e) => setCtcType(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="gross">Monthly gross salary (recommended)</option>
                  <option value="annual">Annual CTC (company cost)</option>
                  <option value="monthly_ctc">Monthly CTC (company cost)</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Effective from
                <input
                  type="date"
                  className="input-field mt-1"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  disabled={!canEdit}
                />
              </label>
              <label className="block text-xs font-medium text-slate-500 sm:col-span-2">
                Salary structure template
                <select
                  className="input-field mt-1"
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">Company default</option>
                  {salaryStructures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.is_company_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {ctcType === 'gross' || ctcType === 'monthly_ctc' ? (
                <label className="block text-xs font-medium text-slate-500 sm:col-span-2">
                  {ctcType === 'gross'
                    ? 'Monthly gross salary (payslip earnings before PF / PT / TDS)'
                    : 'Monthly CTC (total company cost per month)'}
                  <input
                    type="number"
                    min="0"
                    className="input-field mt-1 text-xl font-bold tabular-nums"
                    placeholder={ctcType === 'gross' ? '20000' : '23000'}
                    value={monthlyGross}
                    onChange={(e) => setMonthlyGross(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>
              ) : (
                <label className="block text-xs font-medium text-slate-500 sm:col-span-2">
                  Annual CTC (cost to company per year)
                  <input
                    type="number"
                    min="0"
                    className="input-field mt-1 text-xl font-bold tabular-nums"
                    placeholder="600000"
                    value={annualCtc}
                    onChange={(e) => setAnnualCtc(e.target.value)}
                    disabled={!canEdit}
                  />
                  {Number(annualCtc) > 0 && (
                    <span className="mt-1 block text-xs text-slate-500">
                      ≈ {fmtInr(Math.round(Number(annualCtc) / 12))} per month (CTC ÷ 12)
                    </span>
                  )}
                </label>
              )}
            </div>

            {ctcBreakup && (
              <div className="mt-4 text-xs text-slate-500">
                In-hand gross: <strong>{fmtInrFull(ctcBreakup.gross_salary_monthly)}</strong> · Net est.{' '}
                <strong>{fmtInrFull(ctcBreakup.net_take_home_monthly)}</strong>
              </div>
            )}

            {canEdit && activeId && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    loading ||
                    !((ctcType === 'annual' && Number(annualCtc) > 0) ||
                      ((ctcType === 'gross' || ctcType === 'monthly_ctc') && Number(monthlyGross) > 0))
                  }
                  onClick={() => void applyStructure()}
                >
                  {loading ? 'Saving…' : 'Generate & save salary structure'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowAddLine(!showAddLine)}>
                  <Plus className="mr-1 inline h-4 w-4" />
                  Add line
                </button>
              </div>
            )}
          </div>

          {showAddLine && canEdit && (
            <form onSubmit={addLine} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h4 className="text-sm font-semibold">Add salary line</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select required className="input-field" value={lineForm.component} onChange={(e) => setLineForm({ ...lineForm, component: e.target.value })}>
                  <option value="">Component</option>
                  {earningComponents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <select className="input-field" value={lineForm.calculation_mode} onChange={(e) => setLineForm({ ...lineForm, calculation_mode: e.target.value })}>
                  <option value="fixed">Fixed amount</option>
                  <option value="percent_basic">% of basic</option>
                  <option value="percent_gross">% of gross</option>
                </select>
                {lineForm.calculation_mode === 'fixed' ? (
                  <input required placeholder="Monthly amount" className="input-field" value={lineForm.monthly_amount} onChange={(e) => setLineForm({ ...lineForm, monthly_amount: e.target.value })} />
                ) : (
                  <input required placeholder="Percent" className="input-field" value={lineForm.percent_of_basic} onChange={(e) => setLineForm({ ...lineForm, percent_of_basic: e.target.value })} />
                )}
              </div>
              <button type="submit" className="btn-primary mt-3 text-sm">
                Add
              </button>
            </form>
          )}

          {activeId && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Configured structure lines</h4>
                <button type="button" className="flex items-center gap-1 text-xs text-brand-600" onClick={() => void loadAll()}>
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3">Component</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">From</th>
                      {canEdit && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {activeLines.map((s) => (
                      <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                        {editingLineId === s.id ? (
                          <>
                            <td className="px-4 py-2 font-medium">{s.component_code}</td>
                            <td className="px-4 py-2">
                              <select className="input-field !py-1 min-w-[110px]" value={editDraft.calculation_mode} onChange={(e) => setEditDraft({ ...editDraft, calculation_mode: e.target.value })}>
                                <option value="fixed">Fixed</option>
                                <option value="percent_basic">% basic</option>
                                <option value="percent_gross">% gross</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              {editDraft.calculation_mode === 'fixed' ? (
                                <input className="input-field !py-1 min-w-[100px]" value={editDraft.monthly_amount} onChange={(e) => setEditDraft({ ...editDraft, monthly_amount: e.target.value })} />
                              ) : (
                                <input className="input-field !py-1 min-w-[100px]" value={editDraft.percent_of_basic} onChange={(e) => setEditDraft({ ...editDraft, percent_of_basic: e.target.value })} />
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <input type="date" className="input-field !py-1 min-w-[130px]" value={editDraft.effective_from} onChange={(e) => setEditDraft({ ...editDraft, effective_from: e.target.value })} />
                            </td>
                            <td className="px-4 py-2">
                              <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => void saveLineEdit(s)}>
                                Save
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-medium">{s.component_name}</td>
                            <td className="px-4 py-3 capitalize text-slate-500">{s.calculation_mode?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 tabular-nums">
                              {s.calculation_mode === 'fixed' ? fmtInrFull(s.monthly_amount) : `${s.percent_of_basic}%`}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{s.effective_from}</td>
                            {canEdit && (
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="text-slate-500 hover:text-brand-600"
                                    onClick={() => {
                                      setEditingLineId(s.id)
                                      setEditDraft({
                                        calculation_mode: s.calculation_mode,
                                        monthly_amount: s.monthly_amount,
                                        percent_of_basic: s.percent_of_basic,
                                        effective_from: s.effective_from,
                                        sort_order: s.sort_order,
                                      })
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button type="button" className="text-slate-500 hover:text-rose-600" onClick={() => void deleteLine(s.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                    {activeLines.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No lines — enter gross above or add components manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {revisions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold">Salary revision history</h4>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-2 text-left">Effective</th>
                          <th className="px-4 py-2 text-left">Gross at revision</th>
                          {canEdit && <th className="px-4 py-2 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {revisions.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-2">{dayjs(r.effective_from).format('MMM YYYY')}</td>
                            <td className="px-4 py-2 font-medium">{fmtInrFull(r.monthly_gross)}</td>
                            {canEdit && (
                              <td className="px-4 py-2 text-right">
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
                </div>
              )}
            </>
          )}
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">CTC breakup (live)</p>
          <CtcBreakupPreview
            breakup={ctcBreakup}
            loading={previewLoading}
            includeFlags={includeFlags}
            onIncludeChange={setIncludeFlags}
            statutoryFlags={compFlags}
            onStatutoryChange={setCompFlags}
            canEditIncludes={canEdit}
          />
        </div>
      </div>

      {activeId && <EmployeeBankDetailsSection employeeId={activeId} readOnly={!canEdit} />}
    </div>
  )
}
