import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'

const STRUCTURE_EMPLOYER_EXTRAS = [
  { id: 'struct-pf-employer', code: 'PF_EMPLOYER', name: 'PF Employer', kind: 'deduction', category: 'statutory' },
  { id: 'struct-esi-employer', code: 'ESI_EMPLOYER', name: 'ESI Employer', kind: 'deduction', category: 'statutory' },
]

const DEFAULT_FORMULA_BY_CODE = {
  BASIC: 'CTC * 0.4',
  HRA: 'BASIC * 0.4',
  DEARNESS_ALLOWANCE: 'CTC * 0.1',
  SPECIAL_ALLOWANCE: 'Balancing Amount of CTC',
  OVERTIME: '0',
  VARIABLE_PAY: 'CTC * 0.1',
  BONUS: '0',
  INCENTIVE: '0',
  PF_EMPLOYER: 'System Calculated',
  ESI_EMPLOYER: 'System Calculated',
}

function isLineNameUsed(lines, name) {
  const n = name.trim().toLowerCase()
  return lines.some((l) => l.component_name.trim().toLowerCase() === n)
}

const SYSTEM_CALCULATED_CODES = new Set(['PF', 'ESI', 'PT', 'TDS', 'PF_EMPLOYER', 'ESI_EMPLOYER'])

function isSystemCalculatedComponent(component) {
  return SYSTEM_CALCULATED_CODES.has(component.code)
}

function defaultFormulaForComponent(component) {
  if (isSystemCalculatedComponent(component)) return 'System Calculated'
  return DEFAULT_FORMULA_BY_CODE[component.code] || '0'
}

function lineFromComponent(component, section) {
  const system = isSystemCalculatedComponent(component)
  return {
    component_name: component.name,
    section,
    formula: system ? 'System Calculated' : defaultFormulaForComponent(component),
    system_calculated: system,
    sort_order: 0,
  }
}

function availableComponentsForSection(components, section, lines) {
  const kind = section === 'earning' ? 'earning' : 'deduction'
  let pool = components.filter((c) => c.kind === kind)
  if (section === 'deduction') {
    pool = [...pool, ...STRUCTURE_EMPLOYER_EXTRAS]
  }
  return pool.filter((c) => !isLineNameUsed(lines, c.name))
}

const FORMULA_HELP = {
  title: 'Formula help',
  examples: ['12000', '12000 * 2', 'CTC * 0.12', 'BASIC * 0.4'],
  variables: [
    { key: 'CTC', desc: 'Annual cost to company (fixed + variable + benefits)' },
    { key: 'BASIC', desc: 'Basic salary (annual)' },
    { key: 'HRA', desc: 'House rent allowance (annual)' },
  ],
}

const DEFAULT_NEW_LINES = [
  { component_name: 'Basic', section: 'earning', formula: 'CTC * 0.4', system_calculated: false, sort_order: 10 },
  { component_name: 'HRA', section: 'earning', formula: 'BASIC * 0.4', system_calculated: false, sort_order: 20 },
  {
    component_name: 'Special Allowance',
    section: 'earning',
    formula: 'Balancing Amount of CTC',
    system_calculated: false,
    sort_order: 30,
  },
  { component_name: 'Overtime', section: 'earning', formula: '0', system_calculated: false, sort_order: 40 },
  { component_name: 'PF Employer', section: 'deduction', formula: 'System Calculated', system_calculated: true, sort_order: 10 },
  { component_name: 'ESI Employer', section: 'deduction', formula: 'System Calculated', system_calculated: true, sort_order: 20 },
]

function emptyDraft() {
  return { name: '', description: '', lines: [] }
}

function cloneStructure(s) {
  return {
    name: s.name || '',
    description: s.description || '',
    lines: (s.lines || []).map((l) => ({ ...l })),
  }
}

function uniqueNewName(existing) {
  const base = 'New structure'
  if (!existing.some((s) => s.name === base)) return base
  let n = 2
  while (existing.some((s) => s.name === `${base} ${n}`)) n += 1
  return `${base} ${n}`
}

export default function CreateStructurePanel({ organizationId, canEdit = true, onCreateComponent }) {
  const confirm = useConfirm()
  const [structures, setStructures] = useState([])
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [dirty, setDirty] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDefault, setConfirmDefault] = useState(false)
  const [formulaFocus, setFormulaFocus] = useState(null)

  const isNew = selectedId === 'new'
  const selected = useMemo(() => {
    if (isNew) return null
    return structures.find((s) => s.id === selectedId) || structures[0] || null
  }, [structures, selectedId, isNew])

  const isEditing = canEdit && editMode

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data } = await api.get('/api/payroll/salary-structures/for-organization/', {
        params: { organization: organizationId },
      })
      const list = Array.isArray(data) ? data : []
      setStructures(list)
      setSelectedId((prev) => {
        if (prev === 'new') return prev
        if (prev && list.some((s) => s.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!organizationId) {
      setComponents([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/api/payroll/components/', { params: { organization: organizationId } })
        if (!cancelled) setComponents(Array.isArray(data) ? data : data.results || [])
      } catch {
        if (!cancelled) setComponents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [organizationId])

  useEffect(() => {
    if (isNew || dirty) return
    if (selected) setDraft(cloneStructure(selected))
  }, [selected, dirty, isNew])

  async function discardIfDirty() {
    if (!dirty) return true
    return confirm({
      title: 'Discard unsaved changes?',
      message: 'Your edits to this salary structure will be lost.',
      confirmLabel: 'Discard',
      destructive: true,
    })
  }

  async function selectStructure(id) {
    if (!(await discardIfDirty())) return
    setEditMode(false)
    setDirty(false)
    setSelectedId(id)
    const s = structures.find((x) => x.id === id)
    if (s) setDraft(cloneStructure(s))
  }

  async function startNewStructure() {
    if (!(await discardIfDirty())) return
    const name = uniqueNewName(structures)
    setSelectedId('new')
    setDraft({
      name,
      description: '',
      lines: DEFAULT_NEW_LINES.map((l) => ({ ...l })),
    })
    setEditMode(true)
    setDirty(true)
  }

  async function deleteStructure(id, e) {
    e.stopPropagation()
    const s = structures.find((x) => x.id === id)
    if (!s || s.is_company_default) return
    if ((s.employee_count || 0) > 0) {
      toast.error('Cannot delete — employees are assigned to this structure.')
      return
    }
    const ok = await confirm({
      title: 'Delete salary structure?',
      message: `Delete "${s.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/payroll/salary-structures/${id}/`)
      toast.success('Structure deleted.')
      setEditMode(false)
      setDirty(false)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function updateLine(index, field, value) {
    setDraft((prev) => {
      const lines = [...prev.lines]
      lines[index] = { ...lines[index], [field]: value }
      return { ...prev, lines }
    })
    setDirty(true)
  }

  function addComponentLine(component, section) {
    if (isLineNameUsed(draft.lines, component.name)) {
      toast.error(`${component.name} is already in this structure.`)
      return
    }
    const row = lineFromComponent(component, section)
    setDraft((prev) => ({
      ...prev,
      lines: [...prev.lines, { ...row, sort_order: (prev.lines.length + 1) * 10 }],
    }))
    setDirty(true)
  }

  const earningOptions = useMemo(
    () => availableComponentsForSection(components, 'earning', draft.lines),
    [components, draft.lines]
  )
  const deductionOptions = useMemo(
    () => availableComponentsForSection(components, 'deduction', draft.lines),
    [components, draft.lines]
  )

  function removeLine(index) {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }))
    setDirty(true)
  }

  function cancelEdit() {
    if (isNew) {
      setEditMode(false)
      setDirty(false)
      setSelectedId(structures[0]?.id ?? null)
      if (structures[0]) setDraft(cloneStructure(structures[0]))
      return
    }
    if (selected) setDraft(cloneStructure(selected))
    setDirty(false)
    setEditMode(false)
  }

  function beginEdit() {
    setEditMode(true)
  }

  async function saveStructure(e) {
    e?.preventDefault?.()
    if (!draft.name.trim()) {
      toast.error('Structure name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description || '',
        lines: draft.lines.map((l, i) => ({
          component_name: l.component_name,
          section: l.section,
          formula: l.formula,
          system_calculated: l.system_calculated,
          sort_order: l.sort_order ?? (i + 1) * 10,
        })),
      }

      let data
      if (isNew) {
        const res = await api.post('/api/payroll/salary-structures/', {
          organization: organizationId,
          ...payload,
        })
        data = res.data
        toast.success('Structure created.')
        setSelectedId(data.id)
      } else {
        const res = await api.patch(`/api/payroll/salary-structures/${selected.id}/`, payload)
        data = res.data
        toast.success('Structure saved.')
      }

      setDirty(false)
      setEditMode(false)
      setDraft(cloneStructure(data))
      await load()
      setSelectedId(data.id)
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function confirmSetDefault() {
    if (!selected?.id || isNew) return
    try {
      const { data } = await api.post(`/api/payroll/salary-structures/${selected.id}/set-default/`)
      toast.success('Set as company default.')
      setConfirmDefault(false)
      setStructures((prev) =>
        prev.map((s) => ({
          ...s,
          is_company_default: s.id === data.id,
        }))
      )
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const earnings = draft.lines.filter((l) => l.section === 'earning')
  const deductions = draft.lines.filter((l) => l.section === 'deduction')
  const panelTitle = draft.name || selected?.name || 'New structure'

  if (loading) return <p className="text-sm text-slate-500">Loading salary structures…</p>

  return (
    <>
      <div className="flex min-h-[520px] flex-col gap-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30 lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 p-3 dark:border-slate-700 lg:w-64 lg:border-b-0 lg:border-r">
          <ul className="space-y-1">
            {structures.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => void selectStructure(s.id)}
                  className={`group flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selectedId === s.id
                      ? 'border-l-4 border-brand-600 bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950/40 dark:text-brand-200'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>
                    <div className="flex items-center gap-1">
                      {s.name}
                      {s.is_company_default && (
                        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-normal text-slate-500">
                      {s.employee_count || 0} employee{(s.employee_count || 0) === 1 ? '' : 's'}
                    </div>
                  </span>
                  {canEdit && !s.is_company_default && (s.employee_count || 0) === 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => deleteStructure(s.id, e)}
                      onKeyDown={(e) => e.key === 'Enter' && deleteStructure(s.id, e)}
                      className="mt-0.5 rounded p-1 text-rose-500 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50"
                      title="Delete structure"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              </li>
            ))}
            {isNew && (
              <li>
                <div className="rounded-lg border-l-4 border-brand-600 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
                  <div>{draft.name || 'New structure'}</div>
                  <div className="text-xs font-normal text-slate-500">Unsaved draft</div>
                </div>
              </li>
            )}
          </ul>
          {canEdit && (
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-brand-300 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-300"
              onClick={() => void startNewStructure()}
            >
              <Plus className="h-4 w-4" />
              Create new structure
            </button>
          )}
        </aside>

        <div className="min-w-0 flex-1 p-4">
          {!selected && !isNew ? (
            <p className="text-sm text-slate-500">No structures yet. Create one to get started.</p>
          ) : (
            <form onSubmit={saveStructure} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{panelTitle}</h3>
                  <p className="text-sm text-slate-500">Overview · salary structure formulas</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit && !isNew && !editMode && (
                    <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={beginEdit}>
                      <Pencil className="mr-1 inline h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                  {canEdit && !isNew && (
                    <button
                      type="button"
                      className="btn-primary !py-1.5 text-xs"
                      disabled={selected?.is_company_default || editMode}
                      onClick={() => setConfirmDefault(true)}
                    >
                      Set as company default
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Name</span>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      value={draft.name}
                      onChange={(e) => {
                        setDraft({ ...draft, name: e.target.value })
                        setDirty(true)
                      }}
                    />
                  ) : (
                    <p className="mt-1 rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
                      {draft.name || '—'}
                    </p>
                  )}
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Description</span>
                  {isEditing ? (
                    <textarea
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
                      rows={2}
                      placeholder="Enter your description here"
                      value={draft.description}
                      onChange={(e) => {
                        setDraft({ ...draft, description: e.target.value })
                        setDirty(true)
                      }}
                    />
                  ) : (
                    <p className="mt-1 min-h-[4rem] rounded-lg border border-transparent bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                      {draft.description || '—'}
                    </p>
                  )}
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <StructureTable
                  title="Earnings"
                  section="earning"
                  rows={earnings}
                  allLines={draft.lines}
                  isEditing={isEditing}
                  formulaFocus={formulaFocus}
                  onFormulaFocus={setFormulaFocus}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  availableComponents={earningOptions}
                  onAddComponent={(c) => addComponentLine(c, 'earning')}
                  onCreateComponent={onCreateComponent}
                />
                <StructureTable
                  title="Deductions (employer)"
                  section="deduction"
                  rows={deductions}
                  allLines={draft.lines}
                  isEditing={isEditing}
                  formulaFocus={formulaFocus}
                  onFormulaFocus={setFormulaFocus}
                  onUpdate={updateLine}
                  onRemove={removeLine}
                  availableComponents={deductionOptions}
                  onAddComponent={(c) => addComponentLine(c, 'deduction')}
                  onCreateComponent={onCreateComponent}
                />
              </div>

              <p className="text-xs text-slate-500">
                Employee PF, ESI, professional tax and TDS are calculated automatically on each pay run. Use
                &quot;Balancing Amount of CTC&quot; for special allowance to fill remaining CTC.
              </p>

              {isEditing && (
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button type="button" className="btn-secondary !py-2" onClick={cancelEdit} disabled={saving}>
                    <X className="mr-1 inline h-4 w-4" />
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary !py-2" disabled={!dirty || saving}>
                    <Check className="mr-1 inline h-4 w-4" />
                    {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {confirmDefault && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Confirm your action</h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This will set <strong>{selected?.name}</strong> as the default salary structure for the entire company.
              New employees will use this structure unless assigned otherwise. Are you sure?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmDefault(false)}>
                No
              </button>
              <button type="button" className="btn-primary" onClick={() => void confirmSetDefault()}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ComponentAddPicker({ section, options, onSelect, onCreateComponent }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hoverId, setHoverId] = useState(null)
  const rootRef = useRef(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function pick(component) {
    onSelect(component)
    setOpen(false)
    setQuery('')
    setHoverId(null)
  }

  const label = section === 'earning' ? 'earning' : 'deduction'

  return (
    <div ref={rootRef} className="relative border-t border-slate-200 dark:border-slate-700">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30"
        onClick={() => setOpen((v) => !v)}
      >
        <span>+ Add {label} component</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 w-full min-w-[280px] rounded-b-lg border border-t-0 border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder={`Search ${label} components…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((c) => {
              const key = c.id || c.code
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition ${
                      hoverId === key ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                    onMouseEnter={() => setHoverId(key)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => pick(c)}
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{c.name}</span>
                    {hoverId === key && (
                      <span className="text-[10px] font-medium text-slate-400">Press to select</span>
                    )}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-500">
                {options.length === 0 ? 'All components already added.' : 'No match — try another search.'}
              </li>
            )}
          </ul>
        </div>
      )}

      {onCreateComponent && (
        <button
          type="button"
          className="flex w-full items-center gap-1 border-t border-slate-100 px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-950/30"
          onClick={onCreateComponent}
        >
          <Plus className="h-3.5 w-3.5" />
          Create new component
        </button>
      )}
    </div>
  )
}

function StructureTable({
  title,
  section,
  rows,
  allLines,
  isEditing,
  formulaFocus,
  onFormulaFocus,
  onUpdate,
  onRemove,
  availableComponents,
  onAddComponent,
  onCreateComponent,
}) {
  function lineIndex(line) {
    return allLines.findIndex((l) => l === line)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        {title}
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="px-3 py-2 font-semibold">Component</th>
            <th className="px-3 py-2 font-semibold">Calculation (annual)</th>
            {isEditing && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const idx = lineIndex(row)
            const focusKey = `${section}-${idx}`
            return (
              <tr key={`${row.component_name}-${idx}`} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-2 align-top">
                  {isEditing ? (
                    <input
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-medium dark:border-slate-600 dark:bg-slate-900"
                      value={row.component_name}
                      onChange={(e) => onUpdate(idx, 'component_name', e.target.value)}
                    />
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200">{row.component_name}</span>
                  )}
                </td>
                <td className="relative px-3 py-2 align-top">
                  {row.system_calculated ? (
                    <span className="text-slate-500">System calculated</span>
                  ) : isEditing ? (
                    <>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
                        value={row.formula}
                        onFocus={() => onFormulaFocus(focusKey)}
                        onBlur={() => onFormulaFocus(null)}
                        onChange={(e) => onUpdate(idx, 'formula', e.target.value)}
                      />
                      {formulaFocus === focusKey && <FormulaHelpPopover />}
                    </>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">{row.formula}</span>
                  )}
                </td>
                {isEditing && (
                  <td className="px-1 py-2 align-top">
                    {!row.system_calculated && (
                      <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => onRemove(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      {isEditing && (
        <ComponentAddPicker
          section={section}
          options={availableComponents}
          onSelect={onAddComponent}
          onCreateComponent={onCreateComponent}
        />
      )}
    </div>
  )
}

function FormulaHelpPopover() {
  return (
    <div className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg bg-slate-800 p-3 text-xs text-white shadow-lg">
      <p className="font-bold">{FORMULA_HELP.title}</p>
      <p className="mt-2 text-slate-300">Valid expressions:</p>
      <ul className="mt-1 list-inside list-disc text-slate-200">
        {FORMULA_HELP.examples.map((ex) => (
          <li key={ex}>
            <code>{ex}</code>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-slate-300">Variables:</p>
      <ul className="mt-1 space-y-1">
        {FORMULA_HELP.variables.map((v) => (
          <li key={v.key}>
            <code className="text-brand-300">{v.key}</code> — {v.desc}
          </li>
        ))}
      </ul>
    </div>
  )
}
