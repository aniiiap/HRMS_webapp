import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Download, Pencil, Search, Upload, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import { fmtInrFull } from '../../utils/payrollFormat'

const PAGE_SIZE = 15

function EmployeeAvatar({ emp }) {
  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase() || '?'
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      {initials}
    </span>
  )
}

function structureLabel(comp, organizationName) {
  if (!comp) return null
  if (comp.salary_structure_name) return comp.salary_structure_name
  const g = (comp.payroll_group || '').trim()
  if (g && g !== 'default') return g
  return organizationName || 'Company default'
}

export default function AssignStructurePanel({
  employees = [],
  compensations = [],
  organizationId = '',
  organizationName = '',
  onEditEmployee,
  onExport,
  onAssigned,
}) {
  const [search, setSearch] = useState('')
  const [annualView, setAnnualView] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [structures, setStructures] = useState([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [pickStructureId, setPickStructureId] = useState('')
  const [assignBusy, setAssignBusy] = useState(false)

  const compByEmp = useMemo(
    () => Object.fromEntries(compensations.map((c) => [String(c.employee), c])),
    [compensations]
  )

  const loadStructures = useCallback(async () => {
    if (!organizationId) return
    try {
      const { data } = await api.get('/api/payroll/salary-structures/for-organization/', {
        params: { organization: organizationId },
      })
      setStructures(Array.isArray(data) ? data : [])
    } catch {
      setStructures([])
    }
  }, [organizationId])

  useEffect(() => {
    void loadStructures()
  }, [loadStructures])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) => {
      const comp = compByEmp[String(emp.id)]
      const rule = structureLabel(comp, organizationName) || ''
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase()
      return (
        name.includes(q) ||
        (emp.employee_code || '').toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        rule.toLowerCase().includes(q)
      )
    })
  }, [employees, search, compByEmp, organizationName])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const allVisibleSelected =
    pageRows.length > 0 && pageRows.every((e) => selectedEmployeeIds.includes(e.id))

  function formatCtc(comp) {
    if (!comp?.annual_ctc && !comp?.monthly_gross) return '—'
    if (annualView) return fmtInrFull(comp.annual_ctc || Number(comp.monthly_gross) * 12)
    return fmtInrFull(comp.monthly_gross || Number(comp.annual_ctc) / 12)
  }

  async function confirmAssign() {
    if (!pickStructureId || selectedEmployeeIds.length === 0) return
    setAssignBusy(true)
    try {
      const { data } = await api.post('/api/payroll/compensation/bulk-assign-structure/', {
        employee_ids: selectedEmployeeIds,
        salary_structure: Number(pickStructureId),
      })
      const skipped = data.skipped?.length || 0
      if (data.updated > 0) {
        toast.success(`Structure assigned to ${data.updated} employee(s).`)
      }
      if (skipped > 0) {
        toast.error(
          `${skipped} employee(s) skipped — set compensation first using Edit, then assign structure.`,
          { duration: 5000 }
        )
      }
      setAssignModalOpen(false)
      setSelectedEmployeeIds([])
      setPickStructureId('')
      onAssigned?.()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setAssignBusy(false)
    }
  }

  const pickedStructure = structures.find((s) => String(s.id) === pickStructureId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
          />
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2 !py-2"
          disabled={selectedEmployeeIds.length === 0}
          onClick={() => {
            const defaultStruct = structures.find((s) => s.is_company_default) || structures[0]
            setPickStructureId(defaultStruct ? String(defaultStruct.id) : '')
            setAssignModalOpen(true)
          }}
        >
          <Check className="h-4 w-4" />
          Assign structure ({selectedEmployeeIds.length})
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span>Annual</span>
          <button
            type="button"
            role="switch"
            aria-checked={annualView}
            onClick={() => setAnnualView((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition ${annualView ? 'bg-brand-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 block h-6 w-6 rounded-full bg-white shadow transition ${
                annualView ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </label>
        <button type="button" className="btn-secondary !border-rose-200 !py-2 !text-rose-700" title="Import (CSV)">
          <Upload className="mr-1 inline h-4 w-4" />
          Import
        </button>
        <button type="button" className="btn-secondary !py-2" onClick={() => onExport?.()}>
          <Download className="mr-1 inline h-4 w-4" />
          Export
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/30">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEmployeeIds((prev) =>
                        Array.from(new Set([...prev, ...pageRows.map((r) => r.id)]))
                      )
                    } else {
                      const visible = new Set(pageRows.map((r) => r.id))
                      setSelectedEmployeeIds((prev) => prev.filter((id) => !visible.has(id)))
                    }
                  }}
                />
              </th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Designation</th>
              <th className="px-3 py-3">Structure applied</th>
              <th className="px-3 py-3">CTC</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((emp) => {
              const comp = compByEmp[String(emp.id)]
              const rule = structureLabel(comp, organizationName) || 'Not assigned'
              return (
                <tr key={emp.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={(ev) => {
                        setSelectedEmployeeIds(
                          ev.target.checked
                            ? [...selectedEmployeeIds, emp.id]
                            : selectedEmployeeIds.filter((id) => id !== emp.id)
                        )
                      }}
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-500">{emp.employee_code}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <EmployeeAvatar emp={emp} />
                      <span className="font-medium text-slate-900 dark:text-white">
                        {`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{emp.department || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{emp.designation || '—'}</td>
                  <td className="px-3 py-3">
                    {comp ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                          {rule[0]}
                        </span>
                        {rule}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No compensation</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium tabular-nums">{formatCtc(comp)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                      onClick={() => onEditEmployee?.(emp)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No employees match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <p>
          {filtered.length === 0
            ? '0 employees'
            : `${page * PAGE_SIZE + 1} to ${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" disabled={page === 0} onClick={() => setPage(0)}>
            First
          </button>
          <button type="button" className="btn-secondary !px-2 !py-1 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
          <button
            type="button"
            className="btn-secondary !px-2 !py-1 text-xs"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            Last
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        <Users className="mr-1 inline h-3.5 w-3.5" />
        Select one or more employees, then click Assign structure to choose which salary structure applies. Use Edit to
        set CTC and bank details per employee.
      </p>

      {assignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assign salary structure</h3>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setAssignModalOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Applying to <strong>{selectedEmployeeIds.length}</strong> selected employee(s). Choose one structure:
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {structures.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setPickStructureId(String(s.id))}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      pickStructureId === String(s.id)
                        ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40'
                        : 'border-slate-200 hover:border-brand-200 dark:border-slate-700'
                    }`}
                  >
                    <span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {s.name}
                        {s.is_company_default && (
                          <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {s.employee_count || 0} employee{(s.employee_count || 0) === 1 ? '' : 's'} assigned
                      </span>
                    </span>
                    {pickStructureId === String(s.id) && <Check className="h-5 w-5 text-brand-600" />}
                  </button>
                </li>
              ))}
            </ul>
            {structures.length === 0 && (
              <p className="text-sm text-slate-500">Create a structure under Create structure first.</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={assignBusy || !pickStructureId}
                onClick={() => void confirmAssign()}
              >
                {assignBusy ? 'Assigning…' : 'Confirm assign'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </button>
            </div>
            {pickedStructure && (
              <p className="mt-3 text-xs text-slate-500">
                Employees without compensation are skipped. Use Edit to add salary first.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
