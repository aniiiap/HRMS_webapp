import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { api } from "../api/client"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { Trash2, Activity, User, Briefcase, Calendar, Info, Search, Filter } from "lucide-react"

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
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const isAdmin = user?.role === "admin" || user?.is_superuser

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    fetchLogs()
  }, [resourceType, debouncedSearch, dateFrom, dateTo])

  async function fetchLogs() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (resourceType) params.append("resource_type", resourceType)
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (dateFrom) params.append("date_from", dateFrom)
      if (dateTo) params.append("date_to", dateTo)

      const url = `/api/action-logs/?${params.toString()}`
      const res = await api.get(url)
      const data = res.data
      setLogs(Array.isArray(data) ? data : data.results || [])
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
      setLogs(logs.filter((l) => l.id !== id))
    } catch (err) {
      toast.error("Failed to delete log")
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
      
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
             <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
          </div>
        )}
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
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
                <td colSpan={isAdmin ? (resourceType ? 4 : 5) : (resourceType ? 3 : 4)} className="px-5 py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="h-6 w-6 text-slate-400" />
                    <p>No manual changes recorded yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
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
    </div>
  )
}
