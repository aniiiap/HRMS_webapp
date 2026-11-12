import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/client"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { Trash2, Activity, User, Briefcase, Calendar, Info, Search, Filter } from "lucide-react"
import Pagination from "./Pagination"

// A helper function to make raw API descriptions user-friendly
function formatLogAction(log) {
  let text = ""
  if (log.action_type === 'POST') text = "Created"
  else if (log.action_type === 'PATCH' || log.action_type === 'PUT') text = "Updated"
  else if (log.action_type === 'DELETE') text = "Deleted"
  else text = log.action_type
  
  let actionDesc = ""
  if (log.resource_type === 'Payroll') {
    if (log.resource_id === 'sync_employees') actionDesc = "Synced Employees for Payroll Run"
    else if (log.resource_id === 'recalculate') actionDesc = "Recalculated Payroll Run"
    else if (log.resource_id === 'finalize') actionDesc = "Finalized Payroll Run"
    else if (log.resource_id === 'mark-ready') actionDesc = "Marked Payroll Run as Ready"
    else if (log.resource_id === 'reopen') actionDesc = "Reopened Payroll Run"
    else if (log.resource_id === 'runs') actionDesc = `${text} Payroll Run`
    else actionDesc = `${text} Payroll (ID: ${log.resource_id})`
  } else if (log.resource_type === 'Attendance') {
    if (log.resource_id === 'attendance') actionDesc = "Modified attendance records"
    else actionDesc = `${text} Attendance`
  } else if (log.resource_type === 'Leave') {
    if (log.resource_id === 'approve') actionDesc = "Approved Leave Request"
    else if (log.resource_id === 'reject') actionDesc = "Rejected Leave Request"
    else actionDesc = `${text} Leave Request`
  } else if (log.resource_type === 'Employee/Salary') {
    actionDesc = `${text} Employee details`
  } else {
    actionDesc = log.description
  }

  let payloadDetails = null
  if (log.payload && typeof log.payload === 'object' && Object.keys(log.payload).length > 0) {
    const changes = Object.entries(log.payload)
      .filter(([k, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => {
        let valStr = typeof v === 'object' ? JSON.stringify(v) : String(v)
        
        // Attempt to nicely format ISO date strings
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
          const dateObj = new Date(v)
          if (!isNaN(dateObj)) {
            valStr = format(dateObj, "MMM d, yyyy h:mm a")
          }
        } else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const dateObj = new Date(v)
          if (!isNaN(dateObj)) {
            valStr = format(dateObj, "MMM d, yyyy")
          }
        }

        // Make key human readable e.g., 'check_in' -> 'Check In'
        const readableKey = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        return `${readableKey}: ${valStr}`
      })
      .join(' • ')
    if (changes.length > 0) {
      payloadDetails = <span className="text-slate-500 dark:text-slate-400 text-[13px] ml-1 block mt-1 leading-relaxed">{changes}</span>
    }
  }

  return (
    <div>
      <span className="font-medium text-slate-700 dark:text-slate-300">{actionDesc}</span>
      {payloadDetails}
    </div>
  )
}

function getIconForResource(type) {
  if (type === 'Payroll') return <Briefcase className="h-4 w-4" />
  if (type === 'Attendance') return <Calendar className="h-4 w-4" />
  if (type === 'Leave') return <User className="h-4 w-4" />
  return <Activity className="h-4 w-4" />
}

export default function AuditLogPanel({ resourceType }) {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Selection, range delete & auto-delete settings
  const [selectedIds, setSelectedIds] = useState([])
  const [deleteFrom, setDeleteFrom] = useState("")
  const [deleteTo, setDeleteTo] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [autoDeleteOld, setAutoDeleteOld] = useState(false)
  const [togglingAutoDelete, setTogglingAutoDelete] = useState(false)

  const isAdmin = user?.role === "admin" || user?.is_superuser

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on search
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchLogs()
  }, [resourceType, debouncedSearch, dateFrom, dateTo, page, pageSize])

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    api.get('/api/action-logs/auto_delete_setting/')
      .then((res) => {
        if (active) setAutoDeleteOld(Boolean(res.data?.auto_delete_old_audit_logs))
      })
      .catch(() => {})
    return () => { active = false }
  }, [isAdmin])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (resourceType) params.append("resource_type", resourceType)
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)
      params.append("page", page)
      params.append("page_size", pageSize)

      const url = `/api/action-logs/?${params.toString()}`
      const res = await api.get(url)
      const data = res.data
      
      if (data.results) {
        setLogs(data.results)
        setTotal(data.count)
        setTotalPages(Math.max(1, Math.ceil(data.count / pageSize)))
      } else {
        setLogs(Array.isArray(data) ? data : [])
        setTotal(Array.isArray(data) ? data.length : 0)
        setTotalPages(1)
      }
      setSelectedIds([])
    } catch (err) {
      toast.error("Failed to load activity history")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!isAdmin) return
    if (!window.confirm("Are you sure you want to delete this log?")) return
    try {
      await api.delete(`/api/action-logs/${id}/`)
      toast.success("Log deleted successfully")
      fetchLogs()
    } catch (err) {
      toast.error("Failed to delete log")
    }
  }

  const allOnPageSelected = logs.length > 0 && logs.every((l) => selectedIds.includes(l.id))

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(logs.map((l) => l.id))
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleBulkDeleteSelected() {
    if (!isAdmin || selectedIds.length === 0 || deleting) return
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected history log(s) from the database?`)) return
    setDeleting(true)
    try {
      const res = await api.post('/api/action-logs/bulk_delete/', { ids: selectedIds })
      const count = res.data?.deleted_count ?? selectedIds.length
      toast.success(`Deleted ${count} log(s) permanently`)
      setSelectedIds([])
      fetchLogs()
    } catch (err) {
      toast.error("Failed to delete selected logs")
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteAllMatching() {
    if (!isAdmin || total === 0 || deleting) return
    const hasFilter = Boolean(debouncedSearch || dateFrom || dateTo || resourceType)
    const scopeLabel = hasFilter ? "all matching filtered history logs" : "ALL history logs"
    if (!window.confirm(`Permanently delete ${scopeLabel} from the database? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const payload = { delete_all: true }
      if (resourceType) payload.resource_type = resourceType
      if (debouncedSearch) payload.search = debouncedSearch
      if (dateFrom) payload.date_from = dateFrom
      if (dateTo) payload.date_to = dateTo
      const res = await api.post('/api/action-logs/bulk_delete/', payload)
      const count = res.data?.deleted_count ?? 0
      toast.success(`Deleted ${count} log(s) permanently`)
      setSelectedIds([])
      setPage(1)
      fetchLogs()
    } catch (err) {
      toast.error("Failed to delete history logs")
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteRange() {
    if (!isAdmin || deleting) return
    if (!deleteFrom || !deleteTo) {
      toast.error("Please select both From and To dates")
      return
    }
    if (deleteFrom > deleteTo) {
      toast.error("'From' date must be on or before 'To' date")
      return
    }
    if (!window.confirm(`Permanently delete history logs from ${deleteFrom} to ${deleteTo}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const payload = { date_from: deleteFrom, date_to: deleteTo }
      if (resourceType) payload.resource_type = resourceType
      const res = await api.post('/api/action-logs/delete_range/', payload)
      const count = res.data?.deleted_count ?? 0
      toast.success(`Deleted ${count} log(s) from ${deleteFrom} to ${deleteTo}`)
      setDeleteFrom("")
      setDeleteTo("")
      setPage(1)
      fetchLogs()
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete logs in range")
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleAutoDelete() {
    if (!isAdmin || togglingAutoDelete) return
    const nextVal = !autoDeleteOld
    if (nextVal && !window.confirm("Enabling Auto-Delete will keep only the current month's history and permanently delete all older months' logs from the database. Continue?")) {
      return
    }
    setTogglingAutoDelete(true)
    try {
      const res = await api.post('/api/action-logs/auto_delete_setting/', { enabled: nextVal })
      const updated = Boolean(res.data?.auto_delete_old_audit_logs)
      const purged = res.data?.purged_count ?? 0
      setAutoDeleteOld(updated)
      if (updated) {
        toast.success(purged > 0 ? `Auto-delete enabled. Purged ${purged} old log(s).` : "Auto-delete old months enabled")
        if (purged > 0) {
          setPage(1)
          fetchLogs()
        }
      } else {
        toast.success("Auto-delete old months disabled (manual delete only)")
      }
    } catch (err) {
      toast.error("Failed to update auto-delete setting")
    } finally {
      setTogglingAutoDelete(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 mt-6">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Activity History</h3>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {(search || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch("")
                setDateFrom("")
                setDateTo("")
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                disabled={deleting}
                onClick={handleBulkDeleteSelected}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              disabled={deleting || total === 0}
              onClick={handleDeleteAllMatching}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </button>
            <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delete range:</span>
              <input
                type="date"
                value={deleteFrom}
                onChange={(e) => setDeleteFrom(e.target.value)}
                aria-label="Delete from date"
                className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={deleteTo}
                onChange={(e) => setDeleteTo(e.target.value)}
                aria-label="Delete to date"
                className="px-2 py-1 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                disabled={deleting || !deleteFrom || !deleteTo}
                onClick={handleDeleteRange}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 dark:hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                Delete Range
              </button>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={autoDeleteOld}
              disabled={togglingAutoDelete}
              onClick={handleToggleAutoDelete}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
                autoDeleteOld ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  autoDeleteOld ? 'translate-x-4.5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Auto-delete old months (keep current month only)
            </span>
          </label>
        </div>
      )}
      
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
             <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
          </div>
        )}
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              {isAdmin && (
                <th className="pl-5 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all logs on page"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">Date & Time</th>
              <th className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">User</th>
              <th className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">Action</th>
              {!resourceType && <th className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100">Module</th>}
              {isAdmin && <th className="px-5 py-3 font-medium text-slate-900 dark:text-slate-100 w-16 text-right"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {logs.length === 0 && !loading ? (
              <tr>
                <td colSpan={isAdmin ? (resourceType ? 5 : 6) : (resourceType ? 3 : 4)} className="px-5 py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-6 w-6 text-slate-400" />
                    <p>No manual changes recorded yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(log.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                  {isAdmin && (
                    <td className="pl-5 pr-2 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(log.id)}
                        onChange={() => toggleSelectOne(log.id)}
                        aria-label={`Select log ${log.id}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 text-xs">
                    {format(new Date(log.timestamp), "MMM d, yyyy · h:mm a")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                        {log.user_name.substring(0, 2)}
                      </div>
                      {log.user_name}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {formatLogAction(log)}
                  </td>
                  {!resourceType && (
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md inline-flex text-xs font-medium">
                        {getIconForResource(log.resource_type)}
                        {log.resource_type}
                      </div>
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {logs.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}
