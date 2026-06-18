import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Search, Star, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'
import { lockBodyScroll, unlockBodyScroll } from '../../utils/bodyScrollLock'
import RuleAssignmentChips from '../leaves/RuleAssignmentChips'
import AttendanceRuleDetailView from './AttendanceRuleDetailView'
import AttendanceRuleEditForm from './AttendanceRuleEditForm'
import {
  EMPTY_ATTENDANCE_RULE_FORM,
  formToPayload,
  ruleToForm,
  weekPatternLabel,
} from './attendanceRuleForm'

function employeeInitials(row) {
  return `${row.first_name || ''} ${row.last_name || ''}`
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function AttendanceRulesPanel() {
  const confirm = useConfirm()
  const [rulesTab, setRulesTab] = useState('rules')
  const [templates, setTemplates] = useState([])
  const [ruleAssignments, setRuleAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedRuleId, setSelectedRuleId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [detailTab, setDetailTab] = useState('general')
  const [form, setForm] = useState(EMPTY_ATTENDANCE_RULE_FORM)
  const [saving, setSaving] = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [loading, setLoading] = useState(true)

  const [assignSearch, setAssignSearch] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [pickRuleIds, setPickRuleIds] = useState([])
  const [pickPrimaryId, setPickPrimaryId] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)
  const [removingAssignmentKey, setRemovingAssignmentKey] = useState(null)
  const [settingPrimaryKey, setSettingPrimaryKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tplRes, assignRes, empRes] = await Promise.all([
        api.get('/api/employees/shift-templates/'),
        api.get('/api/employees/shift-template-assignments/'),
        api.get('/api/employees/'),
      ])
      const tplList = Array.isArray(tplRes.data) ? tplRes.data : tplRes.data.results || []
      const assignList = Array.isArray(assignRes.data) ? assignRes.data : assignRes.data.results || []
      const empList = Array.isArray(empRes.data) ? empRes.data : empRes.data.results || []
      setTemplates(tplList)
      setRuleAssignments(assignList)
      setEmployees(empList)
      setSelectedRuleId((prev) => {
        if (prev && tplList.some((t) => t.id === prev)) return prev
        return tplList[0]?.id ?? null
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

  const employeeRuleMap = useMemo(() => {
    const map = {}
    for (const a of ruleAssignments) {
      const eid = Number(a.employee)
      if (!map[eid]) map[eid] = { rules: [] }
      map[eid].rules.push({
        assignmentId: a.id,
        ruleId: a.shift_template,
        name: a.template_name,
        isPrimary: !!a.is_primary,
      })
    }
    return map
  }, [ruleAssignments])

  const countByTemplate = useMemo(() => {
    const map = {}
    for (const a of ruleAssignments) {
      map[a.shift_template] = (map[a.shift_template] || 0) + 1
    }
    return map
  }, [ruleAssignments])

  const selectedRule = useMemo(
    () => templates.find((t) => t.id === selectedRuleId) || null,
    [templates, selectedRuleId],
  )

  const filteredEmployees = useMemo(() => {
    const q = assignSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const info = employeeRuleMap[Number(e.id)]
      const hay = [
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.designation,
        ...(info?.rules?.map((r) => r.name) || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [employees, assignSearch, employeeRuleMap])

  const allVisibleSelected =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id))

  function selectRule(t) {
    setSelectedRuleId(t.id)
    setEditing(false)
    setCreating(false)
    setForm(ruleToForm(t))
    setDetailTab('general')
  }

  function startEdit() {
    if (!selectedRule) return
    setForm(ruleToForm(selectedRule))
    setEditing(true)
    setCreating(false)
    setDetailTab('general')
  }

  function startCreateRule() {
    setCreating(true)
    setEditing(true)
    setSelectedRuleId(null)
    setForm({ ...EMPTY_ATTENDANCE_RULE_FORM })
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
        const { data } = await api.post('/api/employees/shift-templates/', payload)
        toast.success('Attendance rule created.')
        setSelectedRuleId(data.id)
        setCreating(false)
        setEditing(false)
      } else if (selectedRule) {
        await api.patch(`/api/employees/shift-templates/${selectedRule.id}/`, payload)
        toast.success('Attendance rule updated.')
        setEditing(false)
      }
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function setCompanyDefault() {
    if (!selectedRule) return
    setSettingDefault(true)
    try {
      await api.post(`/api/employees/shift-templates/${selectedRule.id}/set-default/`)
      toast.success('Set as company default.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSettingDefault(false)
    }
  }

  async function deleteRule(id) {
    const ok = await confirm({
      title: 'Delete attendance rule?',
      message: 'Employees using this rule will keep their times until reassigned.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/employees/shift-templates/${id}/`)
      toast.success('Rule deleted.')
      if (selectedRuleId === id) setSelectedRuleId(null)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function openAssignForEmployees(employeeIds, preselectedRuleIds = []) {
    setSelectedEmployeeIds(employeeIds)
    const ids = preselectedRuleIds.length ? preselectedRuleIds : selectedRuleId ? [selectedRuleId] : []
    setPickRuleIds(ids.map(String))
    setPickPrimaryId(ids[0] ? String(ids[0]) : '')
    setAssignModalOpen(true)
  }

  function togglePickRule(id) {
    const sid = String(id)
    setPickRuleIds((prev) => {
      const next = prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
      if (!next.includes(pickPrimaryId)) {
        setPickPrimaryId(next[0] || '')
      }
      return next
    })
  }

  async function confirmAssign() {
    if (pickRuleIds.length === 0 || selectedEmployeeIds.length === 0) {
      toast.error('Select employees and at least one attendance rule.')
      return
    }
    setAssignBusy(true)
    try {
      const payload = {
        template_ids: pickRuleIds.map(Number),
        employee_ids: selectedEmployeeIds,
      }
      if (pickPrimaryId && pickRuleIds.includes(pickPrimaryId)) {
        payload.primary_template_id = Number(pickPrimaryId)
      }
      const { data } = await api.post('/api/employees/apply-shift-template/', payload)
      toast.success(data?.message || 'Rules assigned.')
      setAssignModalOpen(false)
      setSelectedEmployeeIds([])
      setPickRuleIds([])
      setPickPrimaryId('')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setAssignBusy(false)
    }
  }

  async function removeSingleAssignment(employeeId, rule) {
    const key = `${employeeId}-${rule.ruleId}`
    setRemovingAssignmentKey(key)
    try {
      await api.post('/api/employees/unassign-shift-template/', {
        employee_id: Number(employeeId),
        template_id: Number(rule.ruleId),
      })
      toast.success(`Removed ${rule.name}.`)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setRemovingAssignmentKey(null)
    }
  }

  async function setPrimaryRule(employeeId, rule) {
    const key = `${employeeId}-${rule.ruleId}`
    setSettingPrimaryKey(key)
    try {
      await api.post('/api/employees/set-primary-shift-template/', {
        employee_id: Number(employeeId),
        template_id: Number(rule.ruleId),
      })
      toast.success(`${rule.name} is now the active rule.`)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSettingPrimaryKey(null)
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
    return <p className="p-6 text-sm text-stone-500">Loading attendance rules…</p>
  }

  return (
    <div className="space-y-4 p-4">
      <div className="inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
        Shift &amp; attendance rules
      </div>

      <div className="flex flex-wrap gap-2 border-b border-warm-200 pb-2 dark:border-stone-700">
        {[
          { id: 'rules', label: 'Attendance rules' },
          { id: 'assign', label: 'Assign attendance rules' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setRulesTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              rulesTab === t.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-stone-600 hover:bg-warm-100 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rulesTab === 'rules' && (
        <div className="grid min-h-[520px] gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40 lg:grid-cols-[200px_1fr]">
          <aside className="flex flex-col border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/60 lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
              {templates.map((t) => {
                const active = selectedRuleId === t.id && !creating
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectRule(t)}
                    className={`mb-1 w-full rounded border-l-[3px] px-2.5 py-2 text-left transition ${
                      active
                        ? 'border-brand-600 bg-white shadow-sm dark:bg-slate-800'
                        : 'border-transparent hover:bg-white/80 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p className={`flex items-center gap-1 text-sm font-semibold ${active ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {t.name}
                      {t.is_company_default && <Star className="h-3 w-3 fill-amber-400 text-amber-500" />}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {countByTemplate[t.id] || t.employee_count || 0} employee{(countByTemplate[t.id] || t.employee_count || 0) === 1 ? '' : 's'}
                    </p>
                  </button>
                )
              })}
            </div>
            <div className="border-t border-slate-200 p-2 dark:border-slate-700">
              <button type="button" className="btn-secondary w-full !py-2 !text-sm" onClick={startCreateRule}>
                <Plus className="mr-1 inline h-3 w-3" />
                Create attendance rule
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            {editing ? (
              <AttendanceRuleEditForm
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
              <AttendanceRuleDetailView
                rule={{
                  ...selectedRule,
                  employee_count: countByTemplate[selectedRule.id] ?? selectedRule.employee_count ?? 0,
                }}
                detailTab={detailTab}
                setDetailTab={setDetailTab}
                onEdit={startEdit}
                onSetDefault={() => void setCompanyDefault()}
                settingDefault={settingDefault}
                onAssign={() => {
                  setRulesTab('assign')
                  openAssignForEmployees([], [selectedRule.id])
                }}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-slate-500">Select a rule or create a new one.</p>
                <button type="button" className="btn-primary mt-3 !text-sm" onClick={startCreateRule}>
                  Create attendance rule
                </button>
              </div>
            )}
            {selectedRule && !editing && (
              <div className="shrink-0 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  onClick={() => void deleteRule(selectedRule.id)}
                >
                  Delete this rule
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {rulesTab === 'assign' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="search-input min-w-[200px] flex-1 max-w-md">
              <Search aria-hidden />
              <input
                type="search"
                placeholder="Search employees..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={selectedEmployeeIds.length === 0}
              onClick={() => openAssignForEmployees(selectedEmployeeIds)}
            >
              <Check className="h-4 w-4" />
              Assign rules ({selectedEmployeeIds.length})
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
                  <th className="px-3 py-3">ID</th>
                  <th className="px-3 py-3">Employee</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Designation</th>
                  <th className="px-3 py-3">Rules applied</th>
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
                      <td className="px-3 py-3 font-mono text-xs text-stone-500">{e.employee_code}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                            {employeeInitials(e)}
                          </div>
                          <span className="font-medium text-stone-900 dark:text-white">
                            {e.first_name} {e.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-stone-600">{e.department || '—'}</td>
                      <td className="px-3 py-3 text-stone-600">{e.designation || '—'}</td>
                      <td className="px-3 py-3">
                        <RuleAssignmentChips
                          employeeId={e.id}
                          rules={info?.rules || []}
                          removingKey={removingAssignmentKey}
                          settingPrimaryKey={settingPrimaryKey}
                          onRemove={(rule) => void removeSingleAssignment(e.id, rule)}
                          onSetPrimary={(rule) => void setPrimaryRule(e.id, rule)}
                          onAdd={() => openAssignForEmployees([e.id], info?.rules?.map((r) => r.ruleId) || [])}
                          emptyLabel="No rules assigned"
                          addTitle="Assign attendance rules"
                        />
                      </td>
                    </tr>
                  )
                })}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                      No employees match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-500">
            <Users className="mr-1 inline h-3.5 w-3.5" />
            Select employees and assign multiple rules. The <strong>active</strong> rule drives punch times; click <strong>Set active</strong> on another chip to switch.
            Use <strong>×</strong> to remove a rule, or <strong>+</strong> to add more.
          </p>
        </div>
      )}

      {assignModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-stone-900/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:pt-4">
          <div
            className="my-auto w-full max-w-md rounded-2xl border border-warm-200 bg-surface-card p-6 shadow-glow dark:border-stone-700 dark:bg-stone-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-attendance-rules-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="assign-attendance-rules-title" className="text-lg font-semibold text-stone-900 dark:text-white">
                Assign attendance rules
              </h3>
              <button type="button" className="rounded-lg p-1 text-stone-500 hover:bg-warm-100" onClick={() => setAssignModalOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-stone-500">
              Applying to <strong>{selectedEmployeeIds.length}</strong> selected employee(s). Pick one or more rules:
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {templates.map((t) => {
                const sid = String(t.id)
                const checked = pickRuleIds.includes(sid)
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => togglePickRule(t.id)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                        checked
                          ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40'
                          : 'border-warm-200 hover:border-brand-200 dark:border-stone-700'
                      }`}
                    >
                      <span>
                        <span className="font-semibold text-stone-900 dark:text-white">{t.name}</span>
                        <span className="mt-0.5 block text-xs text-stone-500">
                          {t.start_time?.slice(0, 5)} – {t.end_time?.slice(0, 5)} · {weekPatternLabel(t)}
                        </span>
                      </span>
                      {checked && <Check className="h-5 w-5 shrink-0 text-brand-600" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            {pickRuleIds.length > 1 && (
              <div className="mt-4 rounded-xl border border-warm-200 bg-warm-50/60 p-3 dark:border-stone-700 dark:bg-stone-900/40">
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Active rule (for punch times)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pickRuleIds.map((rid) => {
                    const t = templates.find((x) => String(x.id) === rid)
                    if (!t) return null
                    return (
                      <button
                        key={rid}
                        type="button"
                        onClick={() => setPickPrimaryId(rid)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          pickPrimaryId === rid
                            ? 'border-brand-500 bg-brand-100 text-brand-800 dark:bg-brand-950/50'
                            : 'border-warm-200 bg-white text-stone-600 dark:border-stone-600 dark:bg-stone-800'
                        }`}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {templates.length === 0 && (
              <p className="text-sm text-stone-500">Create a rule under Attendance rules first.</p>
            )}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-primary flex-1" disabled={assignBusy || pickRuleIds.length === 0} onClick={() => void confirmAssign()}>
                {assignBusy ? 'Assigning…' : 'Confirm assign'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
