import { Search, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const QUICK_LINKS = [
  { id: 'employees', label: 'Employees', path: '/employees', keywords: ['employee', 'employees', 'people', 'staff', 'team'] },
  { id: 'payroll', label: 'Payroll', path: '/payroll', keywords: ['payroll', 'salary', 'payslip', 'payout'] },
  { id: 'attendance', label: 'Attendance', path: '/attendance', keywords: ['attendance', 'checkin', 'check-in', 'shift'] },
  { id: 'leaves', label: 'Leaves', path: '/leaves', keywords: ['leave', 'leaves', 'holiday', 'vacation'] },
  { id: 'announcements', label: 'Announcements', path: '/announcements', keywords: ['announcement', 'notice', 'broadcast'] },
  { id: 'reports', label: 'Reports', path: '/reports', keywords: ['report', 'reports', 'analytics'] },
]

function employeeLabel(emp) {
  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
  return name || emp.email || emp.employee_code || 'Employee'
}

function employeeInitials(emp) {
  const a = emp.first_name?.[0] || ''
  const b = emp.last_name?.[0] || ''
  return (a + b).toUpperCase() || emp.email?.[0]?.toUpperCase() || '?'
}

export default function GlobalSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const canSearchEmployees = ['admin', 'hr', 'manager'].includes(user?.role)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  const quickLinks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return QUICK_LINKS.filter(
      (link) =>
        link.label.toLowerCase().includes(q) || link.keywords.some((kw) => kw.includes(q) || q.includes(kw)),
    ).slice(0, 3)
  }, [query])

  const results = useMemo(() => {
    const items = []
    quickLinks.forEach((link) => {
      items.push({ type: 'link', id: `link-${link.id}`, path: link.path, label: link.label })
    })
    employees.forEach((emp) => {
      items.push({ type: 'employee', id: `emp-${emp.id}`, employee: emp, path: `/employees/${emp.id}` })
    })
    return items
  }, [quickLinks, employees])

  const searchEmployees = useCallback(
    async (q) => {
      if (!canSearchEmployees || q.length < 2) {
        setEmployees([])
        return
      }
      setLoading(true)
      try {
        const { data } = await api.get('/api/employees/', { params: { search: q } })
        const rows = Array.isArray(data) ? data : data.results || []
        setEmployees(rows.slice(0, 8))
      } catch {
        setEmployees([])
      } finally {
        setLoading(false)
      }
    },
    [canSearchEmployees],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setEmployees([])
      setLoading(false)
      return undefined
    }
    const timer = setTimeout(() => {
      void searchEmployees(q)
    }, 280)
    return () => clearTimeout(timer)
  }, [query, searchEmployees])

  useEffect(() => {
    setActiveIndex(0)
  }, [results.length, query])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function pick(item) {
    if (!item) return
    setOpen(false)
    setQuery('')
    setEmployees([])
    navigate(item.path)
  }

  function onKeyDown(e) {
    if (!open && e.key === 'ArrowDown' && query.trim().length >= 2) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[activeIndex])
    }
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 md:max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder={canSearchEmployees ? 'Search employees, pages…' : 'Search…'}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-warm-200 bg-warm-50/80 py-2.5 pl-10 pr-4 text-sm text-stone-900 outline-none transition duration-200 placeholder:text-stone-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-brand-500 dark:focus:bg-stone-900"
        aria-label="Global search"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        role="combobox"
      />

      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl border border-warm-200 bg-white py-1 shadow-xl dark:border-stone-700 dark:bg-stone-900"
          role="listbox"
        >
          {loading && (
            <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>
          )}

          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">No results for &ldquo;{query.trim()}&rdquo;</p>
          )}

          {!loading && quickLinks.length > 0 && (
            <div className="px-2 pb-1 pt-2">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pages</p>
              {results
                .filter((r) => r.type === 'link')
                .map((item) => {
                  const idx = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                        activeIndex === idx
                          ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-stone-800'
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => pick(item)}
                    >
                      <span className="text-slate-400">Go to</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  )
                })}
            </div>
          )}

          {!loading && employees.length > 0 && (
            <div className="px-2 pb-2">
              {quickLinks.length > 0 && (
                <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Employees</p>
              )}
              {results
                .filter((r) => r.type === 'employee')
                .map((item) => {
                  const emp = item.employee
                  const idx = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        activeIndex === idx
                          ? 'bg-brand-50 dark:bg-brand-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-stone-800'
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => pick(item)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                        {employeeInitials(emp)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                          {employeeLabel(emp)}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {emp.employee_code}
                          {emp.department ? ` · ${emp.department}` : ''}
                          {emp.designation ? ` · ${emp.designation}` : ''}
                        </span>
                      </span>
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
