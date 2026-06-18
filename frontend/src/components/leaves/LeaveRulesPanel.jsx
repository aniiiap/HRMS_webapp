import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Search, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock'
import LeaveRuleDetailView from './LeaveRuleDetailView'
import LeaveRuleEditForm from './LeaveRuleEditForm'
import RuleAssignmentChips from './RuleAssignmentChips'
import { EMPTY_LEAVE_RULE_FORM, formToPayload, ruleToForm } from './leaveRuleForm'

function employeeInitials(row) {
  return `${row.first_name || ''} ${row.last_name || ''}`
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function LeaveRulesPanel({ onChanged }) {
  const confirm = useConfirm()
  const [rulesTab, setRulesTab] = useState('rules')
  const [rules, setRules] = useState([])
  const [ruleAssignments, setRuleAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedRuleId, setSelectedRuleId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_LEAVE_RULE_FORM)
  const [detailTab, setDetailTab] = useState('general')
  const [saving, setSaving] = useState(false)

  const [assignSearch, setAssignSearch] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [pickRuleIds, setPickRuleIds] = useState([])
  const [assignProbation, setAssignProbation] = useState(false)
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [removingAssignmentKey, setRemovingAssignmentKey] = useState(null)
  const [probationFilter, setProbationFilter] = useState('all')
  const [probationBusyId, setProbationBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rulesRes, assignRes, empRes] = await Promise.all([
        api.get('/api/leave-rules/'),
        api.get('/api/leave-rules/assignments/'),
        api.get('/api/employees/'),
      ])
      const ruleList = Array.isArray(rulesRes.data) ? rulesRes.data : rulesRes.data.results || []
      const assignList = Array.isArray(assignRes.data) ? assignRes.data : assignRes.data.results || []
      const empList = Array.isArray(empRes.data) ? empRes.data : empRes.data.results || []
      setRules(ruleList)
      setRuleAssignments(assignList)
      setEmployees(empList)
      setSelectedRuleId((prev) => {
        if (prev && ruleList.some((r) => r.id === prev)) return prev
        return ruleList[0]?.id ?? null
      })
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId) || null,
    [rules, selectedRuleId],
  )

  const employeeRuleMap = useMemo(() => {
    const map = {}
    for (const a of ruleAssignments) {
      const eid = Number(a.employee)
      if (!map[eid]) {
        map[eid] = { rules: [], is_on_probation: !!a.is_on_probation }
      }
      map[eid].rules.push({
        assignmentId: a.id,
        ruleId: a.rule,
        name: a.rule_name,
        shortName: a.rule_short_name,
        code: a.rule_code,
      })
      map[eid].is_on_probation = map[eid].is_on_probation || !!a.is_on_probation
    }
    return map
  }, [ruleAssignments])

  const probationRows = useMemo(() => {
    const seen = new Set()
    const rows = []
    for (const a of ruleAssignments) {
      if (seen.has(a.employee)) continue
      seen.add(a.employee)
      rows.push(a)
    }
    let filtered = rows
    if (probationFilter !== 'all') {
      filtered = rows.filter((a) => Number(a.rule) === Number(probationFilter))
    }
    const q = assignSearch.trim().toLowerCase()
    if (!q) return filtered
    return filtered.filter((a) =>
      [a.employee_code, a.employee_name, a.rule_name].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }, [ruleAssignments, probationFilter, assignSearch])

  const filteredEmployees = useMemo(() => {
    const q = assignSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const info = employeeRuleMap[Number(e.id)]
      const hay = [e.employee_code, e.first_name, e.last_name, e.email, e.department, e.designation, ...(info?.rules?.map((r) => r.name) || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, assignSearch, employeeRuleMap])

  const allVisibleSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id))

  function selectRule(r) {
    setSelectedRuleId(r.id)
    setEditing(false)
    setCreating(false)
    setForm(ruleToForm(r))
    setDetailTab('general')
  }

  function startEdit() {
    if (!selectedRule) return
    setForm(ruleToForm(selectedRule))
    setEditing(true)
    setCreating(false)
    setDetailTab('general')
  }

  function startCreate() {
    setCreating(true)
    setEditing(true)
    setSelectedRuleId(null)
    setForm({ ...EMPTY_LEAVE_RULE_FORM })
    setDetailTab('general')
  }

  function cancelEdit() {
    setEditing(false)
    setCreating(false)
    if (selectedRule) setForm(ruleToForm(selectedRule))
  }

  async function saveRule() {
    setSaving(true)
    try {
      const payload = formToPayload(form)
      if (creating) {
        const { data } = await api.post('/api/leave-rules/', payload)
        toast.success('Leave rule created.')
        setSelectedRuleId(data.id)
        setCreating(false)
        setEditing(false)
      } else if (selectedRule) {
        await api.patch(`/api/leave-rules/${selectedRule.id}/`, payload)
        toast.success('Leave rule updated.')
        setEditing(false)
      }
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRule(rule) {
    if (rule.is_system) return
    const ok = await confirm({
      title: 'Delete leave rule?',
      message: 'Employee assignments to this rule will be removed.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/leave-rules/${rule.id}/`)
      toast.success('Leave rule deleted.')
      if (selectedRuleId === rule.id) setSelectedRuleId(null)
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function confirmAssign() {
    if (pickRuleIds.length === 0 || selectedEmployeeIds.length === 0) {
      toast.error('Select employees and at least one leave rule.')
      return
    }
    setAssignBusy(true)
    try {
      const { data } = await api.post('/api/leave-rules/assign/', {
        rule_ids: pickRuleIds.map(Number),
        employee_ids: selectedEmployeeIds,
        is_on_probation: assignProbation,
        effective_from: assignEffectiveFrom || null,
      })
      toast.success(data?.message || 'Leave rules assigned.')
      setAssignModalOpen(false)
      setSelectedEmployeeIds([])
      setPickRuleIds([])
      setAssignProbation(false)
      setAssignEffectiveFrom('')
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setAssignBusy(false)
    }
  }

  async function setEmployeeProbation(employeeId, onProbation) {
    setProbationBusyId(employeeId)
    try {
      await api.post('/api/leave-rules/set_probation/', {
        employee_id: Number(employeeId),
        is_on_probation: onProbation,
      })
      toast.success(onProbation ? 'Employee marked on probation.' : 'Probation ended.')
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setProbationBusyId(null)
    }
  }

  function openAssignForEmployees(employeeIds, preselectedRuleIds = []) {
    setSelectedEmployeeIds(employeeIds)
    setPickRuleIds(preselectedRuleIds.length ? preselectedRuleIds : selectedRuleId ? [selectedRuleId] : [])
    setAssignModalOpen(true)
  }

  async function removeSingleAssignment(employeeId, rule) {
    const key = `${employeeId}-${rule.ruleId}`
    setRemovingAssignmentKey(key)
    try {
      await api.post('/api/leave-rules/unassign/', {
        employee_id: Number(employeeId),
        rule_id: Number(rule.ruleId),
      })
      toast.success(`Removed ${rule.name}.`)
      await load()
      onChanged?.()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setRemovingAssignmentKey(null)
    }
  }

  useEffect(() => {
    if (!assignModalOpen) return undefined
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [assignModalOpen])

  if (loading) {
    return <p className="p-6 text-sm text-stone-500">Loading leave rules…</p>
  }

  return (
    <div className="space-y-3 p-3 text-sm">
      <div className="inline-flex overflow-hidden rounded border border-slate-200 text-sm dark:border-slate-700">
        {[
          { id: 'rules', label: 'Leave rules' },
          { id: 'assign', label: 'Assign leave rules' },
          { id: 'probation', label: 'Probation' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRulesTab(t.id)}
            className={`px-4 py-1.5 font-semibold transition ${
              rulesTab === t.id
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rulesTab === 'rules' && (
        <div className="grid min-h-[480px] gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40 lg:grid-cols-[200px_1fr]">
          <aside className="flex flex-col border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60 lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
              {rules.map((r) => {
                const active = selectedRuleId === r.id && !creating
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRule(r)}
                    className={`mb-1 w-full rounded border-l-[3px] px-2.5 py-2 text-left transition ${
                      active
                        ? 'border-brand-600 bg-white shadow-sm dark:bg-slate-800'
                        : 'border-transparent hover:bg-white/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {r.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {r.employee_count > 0
                        ? `${r.employee_count} employee${r.employee_count === 1 ? '' : 's'}`
                        : 'No employees'}
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-slate-200 p-2 dark:border-slate-700">
              <button type="button" className="btn-secondary w-full !py-2 !text-sm" onClick={startCreate}>
                <Plus className="mr-1 inline h-3 w-3" />
                Create leave rule
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            {editing ? (
              <LeaveRuleEditForm
                rule={creating ? null : selectedRule}
                form={form}
                setForm={setForm}
                detailTab={detailTab}
                setDetailTab={setDetailTab}
                saving={saving}
                isNew={creating}
                onSave={() => void saveRule()}
                onCancel={cancelEdit}
              />
            ) : selectedRule ? (
              <LeaveRuleDetailView
                rule={selectedRule}
                detailTab={detailTab}
                setDetailTab={setDetailTab}
                onEdit={startEdit}
                onAssign={() => {
                  setRulesTab('assign')
                  setPickRuleIds([selectedRule.id])
                  setSelectedEmployeeIds([])
                }}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                Select a leave rule or create a new one.
              </div>
            )}
            {selectedRule && !selectedRule.is_system && !editing && (
              <div className="border-t border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                <button
                  type="button"
                  className="text-xs font-medium text-rose-600 hover:underline"
                  onClick={() => void deleteRule(selectedRule)}
                >
                  Delete custom rule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {rulesTab === 'probation' && (
        <div className="space-y-3">
          {probationRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-600">
              <p className="text-sm text-slate-600">Assign leave rules to employees first.</p>
              <button type="button" className="btn-primary mt-3" onClick={() => setRulesTab('assign')}>
                Go to Assign leave rules
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="search-input min-w-[200px] flex-1 max-w-md">
                  <Search aria-hidden />
                  <input type="search" placeholder="Search…" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
                </div>
                <select className="input-field w-auto min-w-[180px]" value={probationFilter} onChange={(e) => setProbationFilter(e.target.value)}>
                  <option value="all">All leave rules</option>
                  {rules.map((r) => (
                    <option key={r.id} value={String(r.id)}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="table-shell overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-3">Employee</th>
                      <th className="px-3 py-3">Leave rules</th>
                      <th className="px-3 py-3">On probation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {probationRows.map((a) => {
                      const info = employeeRuleMap[Number(a.employee)]
                      const onProbation = !!info?.is_on_probation
                      return (
                        <tr key={a.employee}>
                          <td className="px-3 py-3">
                            <span className="font-medium">{a.employee_code}</span>
                            <span className="block text-xs text-stone-500">{a.employee_name}</span>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <RuleAssignmentChips
                              employeeId={Number(a.employee)}
                              rules={info?.rules || []}
                              removingKey={removingAssignmentKey}
                              onRemove={(rule) => void removeSingleAssignment(a.employee, rule)}
                              onAdd={() => openAssignForEmployees([Number(a.employee)])}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={onProbation}
                                disabled={probationBusyId === Number(a.employee)}
                                onChange={(e) => void setEmployeeProbation(a.employee, e.target.checked)}
                              />
                              <span className="text-xs">{onProbation ? 'Yes' : 'No'}</span>
                            </label>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {rulesTab === 'assign' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="search-input min-w-[200px] flex-1 max-w-md">
              <Search aria-hidden />
              <input type="search" placeholder="Search employees…" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={selectedEmployeeIds.length === 0}
              onClick={() => openAssignForEmployees(selectedEmployeeIds)}
            >
              <Check className="h-4 w-4" />
              Assign leave rules ({selectedEmployeeIds.length})
            </button>
          </div>
          <div className="table-shell overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...filteredEmployees.map((r) => r.id)])))
                        } else {
                          const visible = new Set(filteredEmployees.map((r) => r.id))
                          setSelectedEmployeeIds((prev) => prev.filter((id) => !visible.has(id)))
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3 min-w-[220px]">Rules applied</th>
                  <th className="px-3 py-3">Probation</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((e) => {
                  const info = employeeRuleMap[Number(e.id)]
                  return (
                    <tr key={e.id}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(e.id)}
                          onChange={(ev) => {
                            setSelectedEmployeeIds(
                              ev.target.checked ? [...selectedEmployeeIds, e.id] : selectedEmployeeIds.filter((id) => id !== e.id),
                            )
                          }}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                            {employeeInitials(e)}
                          </div>
                          <span className="font-medium">{e.first_name} {e.last_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-stone-600">{e.department || '—'}</td>
                      <td className="px-3 py-3">
                        <RuleAssignmentChips
                          employeeId={e.id}
                          rules={info?.rules || []}
                          removingKey={removingAssignmentKey}
                          emptyLabel="Default org rules"
                          onRemove={info?.rules?.length ? (rule) => void removeSingleAssignment(e.id, rule) : undefined}
                          onAdd={() => openAssignForEmployees([e.id])}
                        />
                      </td>
                      <td className="px-3 py-3 text-xs">{info?.is_on_probation ? 'On probation' : 'Regular'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-500">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            Click <strong>×</strong> on a rule tag to remove it, or <strong>+</strong> to assign more rules.
          </p>
        </div>
      )}

      {assignModalOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setAssignModalOpen(false)}
          />
          <div
            className="relative flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-leave-rules-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-stone-700">
              <h3 id="assign-leave-rules-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                Assign leave rules
              </h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-stone-500 hover:bg-slate-100 dark:hover:bg-stone-800"
                onClick={() => setAssignModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
                Applying to <strong className="text-slate-800 dark:text-slate-200">{selectedEmployeeIds.length}</strong> employee(s). Select rules:
              </p>
              <ul className="max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                {rules.filter((r) => r.is_active !== false).map((r) => (
                  <li key={r.id}>
                    <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                      pickRuleIds.includes(r.id) ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/30' : 'border-warm-200 dark:border-stone-700'
                    }`}>
                      <span>
                        <span className="font-semibold text-slate-900 dark:text-white">{r.name}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">{r.short_name || r.code}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={pickRuleIds.includes(r.id)}
                        onChange={(e) => {
                          setPickRuleIds(
                            e.target.checked ? [...pickRuleIds, r.id] : pickRuleIds.filter((id) => id !== r.id),
                          )
                        }}
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <label className="mb-3 mt-4 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                <input type="checkbox" className="mt-0.5" checked={assignProbation} onChange={(e) => setAssignProbation(e.target.checked)} />
                <span>Assign as probation (uses probation quota where configured)</span>
              </label>
              <label className="block text-xs font-medium text-stone-500 dark:text-stone-400">
                Effective from (optional)
                <input type="date" className="input-field mt-1" value={assignEffectiveFrom} onChange={(e) => setAssignEffectiveFrom(e.target.value)} />
              </label>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-slate-200 px-5 py-4 dark:border-stone-700">
              <button type="button" className="btn-primary flex-1" disabled={assignBusy || pickRuleIds.length === 0} onClick={() => void confirmAssign()}>
                {assignBusy ? 'Assigning…' : 'Confirm assign'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setAssignModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
