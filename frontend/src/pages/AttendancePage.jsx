import dayjs from 'dayjs'
import { Fragment, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Download, Pencil, Save, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'
import AttendanceRulesPanel from '../components/attendance/AttendanceRulesPanel'
import AttendanceLogsPanel from '../components/attendance/AttendanceLogsPanel'
import Pagination from '../components/Pagination'
import { useAuth } from '../context/AuthContext'

const LAST_LOCATION_KEY = 'hrms_last_location'
const MAX_LOCATION_AGE_MS = 5 * 60 * 1000

function anomalyBadge(anomaly) {
  if (anomaly === 'late_checkin') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Late</span>
  if (anomaly === 'early_checkout') return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Early checkout</span>
  if (anomaly === 'short_hours') return <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700">Short hours</span>
  if (anomaly === 'missing_checkout') return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Missing check-out</span>
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">OK</span>
}

function formatApprovalTime(value) {
  return value ? dayjs(value).format('hh:mm A') : '--'
}

function employeeInitials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function DualTimeCell({ actual, requested, showRequested }) {
  return (
    <div className="space-y-0.5 text-xs leading-tight">
      <div className="font-medium text-slate-800 dark:text-slate-200">{formatApprovalTime(actual)}</div>
      {showRequested && requested && (
        <div className="font-semibold text-brand-600 dark:text-brand-400">{formatApprovalTime(requested)}</div>
      )}
    </div>
  )
}

export default function AttendancePage() {
  const { isManagerPlus, isPrivileged } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [rows, setRows] = useState([])
  const [heatmap, setHeatmap] = useState(null)
  const [month, setMonth] = useState(dayjs().month() + 1)
  const [year, setYear] = useState(dayjs().year())
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [editing, setEditing] = useState(null)
  const [corrections, setCorrections] = useState([])
  const [requestTypes, setRequestTypes] = useState({})
  const [exactTimes, setExactTimes] = useState({})
  const [leaveRules, setLeaveRules] = useState([])
  const [leaveForms, setLeaveForms] = useState({})
  const [reasons, setReasons] = useState({})
  const [approvalOpen, setApprovalOpen] = useState({})
  const [brokenHeatmapProfiles, setBrokenHeatmapProfiles] = useState({})
  const [brokenApprovalProfiles, setBrokenApprovalProfiles] = useState({})
  const [approvalSearch, setApprovalSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('pending')
  const [selectedApprovalIds, setSelectedApprovalIds] = useState([])
  const [approvalPage, setApprovalPage] = useState(1)
  const [approvalPageSize, setApprovalPageSize] = useState(10)
  const [editingApproval, setEditingApproval] = useState(null)
  const [editApprovalForm, setEditApprovalForm] = useState({ check_in: '', check_out: '' })
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const requestWindowDays = 3

  useEffect(() => {
    const tab = searchParams.get('tab')
    const valid = ['overview', 'logs', 'approvals', ...(isPrivileged ? ['rules'] : [])]
    if (tab && valid.includes(tab)) setActiveTab(tab)
  }, [searchParams, isPrivileged])

  function captureLocation() {
    const cachedRaw = localStorage.getItem(LAST_LOCATION_KEY)
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw)
        if (
          typeof cached.latitude === 'number' &&
          typeof cached.longitude === 'number' &&
          Date.now() - Number(cached.ts || 0) <= MAX_LOCATION_AGE_MS
        ) {
          return Promise.resolve({ latitude: cached.latitude, longitude: cached.longitude })
        }
      } catch {
        // Ignore invalid cached value.
      }
    }
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device/browser.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...coords, ts: Date.now() }))
          resolve(coords)
        },
        () => reject(new Error('Location permission is required for attendance punch.')),
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 120000 },
      )
    })
  }

  async function load() {
    try {
      if (isManagerPlus) {
        const [{ data: heat }, { data: logData }, { data: corrData }, { data: rulesData }] = await Promise.all([
          api.get('/api/attendance/heatmap/', { params: { year, month } }),
          api.get('/api/attendance/', { params: { ordering: '-date' } }),
          api.get('/api/attendance/correction_requests/'),
          api.get('/api/leave-rules/'),
        ])
        setHeatmap(heat)
        setLogs(Array.isArray(logData) ? logData : logData.results || [])
        setCorrections(Array.isArray(corrData) ? corrData : corrData.results || [])
        setLeaveRules(Array.isArray(rulesData) ? rulesData : rulesData.results || [])
      } else {
        const { data } = await api.get('/api/attendance/', { params: { ordering: '-date' } })
        setRows(Array.isArray(data) ? data : data.results || [])
      }
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => { void load() }, [isManagerPlus, month, year])

  async function punch(type) {
    try {
      const location = await captureLocation()
      const { data } = await api.post(`/api/attendance/${type}/`, location)
      setRows((prev) => {
        const next = [...prev]
        const idx = next.findIndex((r) => r.id === data.id)
        if (idx >= 0) {
          next[idx] = data
        } else {
          next.unshift(data)
        }
        return next
      })
      toast.success(type === 'check_in' ? 'Clocked in successfully.' : 'Clocked out successfully.')
      void load()
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  async function saveLogEdit() {
    if (!editing?.id) return
    try {
      await api.patch(`/api/attendance/${editing.id}/`, {
        check_in: editing.check_in || null,
        check_out: editing.check_out || null,
        notes: editing.notes || '',
      })
      toast.success('Attendance updated.')
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function exportSheet() {
    try {
      const res = await api.get('/api/attendance/export/', {
        params: { year, month },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${year}_${String(month).padStart(2, '0')}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Attendance sheet downloaded.')
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  function defaultExactTimes(row) {
    return {
      check_in: row.check_in ? dayjs(row.check_in).format('YYYY-MM-DDTHH:mm') : `${row.date}T09:00`,
      check_out: row.check_out ? dayjs(row.check_out).format('YYYY-MM-DDTHH:mm') : `${row.date}T18:00`,
    }
  }

  function openApprovalPanel(row) {
    setApprovalOpen((prev) => ({ ...prev, [row.id]: true }))
    setRequestTypes((prev) => ({ ...prev, [row.id]: '' }))
    setExactTimes((prev) => ({ ...prev, [row.id]: defaultExactTimes(row) }))
    setLeaveForms((prev) => ({
      ...prev,
      [row.id]: { start_date: row.date, end_date: row.date, leave_type: leaveRules[0]?.code || 'paid_leave', reason: '' },
    }))
    setReasons((prev) => ({ ...prev, [row.id]: '' }))
  }

  function setApprovalType(row, type) {
    setRequestTypes((prev) => ({ ...prev, [row.id]: type }))
    if (type === 'mark_exact_time') {
      setExactTimes((prev) => ({ ...prev, [row.id]: prev[row.id] || defaultExactTimes(row) }))
    }
  }

  async function requestCorrection(row) {
    const requestType = requestTypes[row.id] || 'mark_present'
    const payload = { request_type: requestType, reason: reasons[row.id] || '' }

    if (requestType === 'mark_exact_time') {
      const times = exactTimes[row.id] || {}
      if (!times.check_in || !times.check_out) {
        toast.error('Enter both clock-in and clock-out times.')
        return
      }
      payload.requested_check_in = dayjs(times.check_in).toISOString()
      payload.requested_check_out = dayjs(times.check_out).toISOString()
      if (!payload.reason) {
        payload.reason = 'Requesting attendance regularization with exact clock-in and clock-out times.'
      }
    } else if (requestType === 'mark_leave') {
      const leave = leaveForms[row.id] || {}
      if (!leave.start_date || !leave.end_date || !leave.leave_type) {
        toast.error('Fill leave start date, end date, and leave type.')
        return
      }
      if (!leave.reason?.trim()) {
        toast.error('Please provide a reason for leave.')
        return
      }
      payload.leave_start_date = leave.start_date
      payload.leave_end_date = leave.end_date
      payload.leave_type = leave.leave_type
      payload.reason = leave.reason.trim()
    } else if (!payload.reason) {
      payload.reason = 'Checked in but forgot to check out. Please regularize attendance.'
    }

    try {
      await api.post(`/api/attendance/${row.id}/request_correction/`, payload)
      toast.success('Approval request sent to admin.')
      setApprovalOpen((prev) => ({ ...prev, [row.id]: false }))
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function reviewCorrection(correctionId, status, extra = {}) {
    try {
      await api.post('/api/attendance/review_correction/', {
        correction_id: correctionId,
        status,
        ...extra,
      })
      toast.success(`Correction ${status}.`)
      setSelectedApprovalIds((prev) => prev.filter((id) => id !== correctionId))
      setEditingApproval(null)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function bulkReviewCorrection(status) {
    if (!selectedApprovalIds.length) {
      toast.error('Select at least one row.')
      return
    }
    setApprovalBusy(true)
    try {
      await Promise.all(
        selectedApprovalIds.map((id) => api.post('/api/attendance/review_correction/', { correction_id: id, status })),
      )
      toast.success(`Bulk ${status} completed.`)
      setSelectedApprovalIds([])
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setApprovalBusy(false)
    }
  }

  function csvEscape(cell) {
    const text = String(cell ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')
    return `"${text}"`
  }

  function formatExportDate(value) {
    if (!value) return ''
    const d = dayjs(value)
    // Leading tab keeps Excel from auto-formatting as a narrow date serial (####).
    return d.isValid() ? `\t${d.format('DD-MMM-YYYY')}` : `\t${String(value)}`
  }

  function formatExportDateTime(value) {
    if (!value) return ''
    const d = dayjs(value)
    return d.isValid() ? `\t${d.format('DD-MMM-YYYY hh:mm A')}` : `\t${String(value)}`
  }

  function exportApprovalsCsv(rows) {
    const header = ['ID', 'Employee', 'Department', 'Manager', 'Date', 'In (actual)', 'In (requested)', 'Out (actual)', 'Out (requested)', 'Work duration', 'Type', 'Status', 'Reason']
    const lines = rows.map((c) => [
      c.employee_code,
      c.employee_name,
      c.department,
      c.manager_name,
      formatExportDate(c.attendance_date),
      formatExportDateTime(c.actual_check_in),
      formatExportDateTime(c.requested_check_in),
      formatExportDateTime(c.actual_check_out),
      formatExportDateTime(c.requested_check_out),
      c.requested_work_duration || c.actual_work_duration || '',
      (c.request_type || '').replaceAll('_', ' '),
      c.status,
      c.reason || '',
    ])
    const csv = `\uFEFF${[header, ...lines].map((row) => row.map(csvEscape).join(',')).join('\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_approvals_${dayjs().format('YYYY-MM-DD')}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  function openEditApproval(row) {
    setEditingApproval(row)
    setEditApprovalForm({
      check_in: row.requested_check_in
        ? dayjs(row.requested_check_in).format('YYYY-MM-DDTHH:mm')
        : row.actual_check_in
          ? dayjs(row.actual_check_in).format('YYYY-MM-DDTHH:mm')
          : '',
      check_out: row.requested_check_out
        ? dayjs(row.requested_check_out).format('YYYY-MM-DDTHH:mm')
        : row.actual_check_out
          ? dayjs(row.actual_check_out).format('YYYY-MM-DDTHH:mm')
          : '',
    })
  }

  async function saveEditAndApprove() {
    if (!editingApproval) return
    if (!editApprovalForm.check_in || !editApprovalForm.check_out) {
      toast.error('Enter both in and out times.')
      return
    }
    await reviewCorrection(editingApproval.id, 'approved', {
      requested_check_in: dayjs(editApprovalForm.check_in).toISOString(),
      requested_check_out: dayjs(editApprovalForm.check_out).toISOString(),
    })
  }

  const today = useMemo(() => rows.find((r) => r.date === dayjs().format('YYYY-MM-DD')), [rows])
  const filteredHeatmapRows = useMemo(() => {
    const base = heatmap?.rows || []
    if (!q) return base
    return base.filter((r) => {
      const hay = `${r.employee_code || ''} ${r.name || ''} ${r.department || ''} ${r.designation || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [heatmap, q])
  const filteredRows = useMemo(() => {
    if (!q) return rows
    return rows.filter((r) => `${r.date || ''} ${r.notes || ''} ${r.check_in || ''} ${r.check_out || ''}`.toLowerCase().includes(q))
  }, [rows, q])
  const filteredLogs = useMemo(() => {
    const base = logs.filter((r) => dayjs(r.date).year() === year && dayjs(r.date).month() + 1 === month)
    if (!q) return base
    return base.filter((r) => `${r.employee_name || ''} ${r.date || ''} ${r.notes || ''}`.toLowerCase().includes(q))
  }, [logs, month, q, year])

  const filteredApprovals = useMemo(() => {
    let list = corrections
    if (approvalFilter !== 'all') {
      list = list.filter((c) => c.status === approvalFilter)
    }
    const term = approvalSearch.trim().toLowerCase()
    if (term) {
      list = list.filter((c) => {
        const hay = `${c.employee_code || ''} ${c.employee_name || ''} ${c.department || ''} ${c.manager_name || ''} ${c.attendance_date || ''} ${c.request_type || ''}`.toLowerCase()
        return hay.includes(term)
      })
    }
    return list
  }, [corrections, approvalFilter, approvalSearch])

  const approvalTotalPages = Math.max(Math.ceil(filteredApprovals.length / approvalPageSize), 1)

  const visibleApprovals = useMemo(
    () => filteredApprovals.slice((approvalPage - 1) * approvalPageSize, approvalPage * approvalPageSize),
    [filteredApprovals, approvalPage, approvalPageSize],
  )

  const pendingApprovalIds = useMemo(
    () => visibleApprovals.filter((c) => c.status === 'pending').map((c) => c.id),
    [visibleApprovals],
  )

  const isCorrectionExpired = (rowDate) => {
    const daysAgo = dayjs().startOf('day').diff(dayjs(rowDate).startOf('day'), 'day')
    return daysAgo > requestWindowDays
  }

  const cellClass = (status) => {
    if (status === 'present') return 'bg-emerald-500/95 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20'
    if (status === 'absent') return 'bg-rose-500/95 ring-1 ring-rose-300/60 dark:ring-rose-400/20'
    if (status === 'leave') return 'bg-blue-500/95 ring-1 ring-blue-300/60 dark:ring-blue-400/20'
    if (status === 'wfh') return 'bg-lime-500/95 ring-1 ring-lime-300/60 dark:ring-lime-400/20'
    if (status === 'anomaly') return 'bg-amber-500/95 ring-1 ring-amber-300/60 dark:ring-amber-400/20'
    if (status === 'weekend') return 'bg-slate-300 ring-1 ring-slate-300/80 dark:bg-slate-600 dark:ring-slate-500/60'
    return 'bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
  }

  const cellLabel = (status, days, day) => {
    const code = days?.[`${day}_code`]
    if (code) return code
    if (status === 'present') return 'P'
    if (status === 'absent') return 'A'
    if (status === 'leave') return 'L'
    if (status === 'wfh') return 'WFH'
    if (status === 'anomaly') return 'AN'
    if (status === 'weekend') return 'WO'
    return 'NA'
  }

  if (isManagerPlus) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Attendance</h2>
            {q && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Showing results for "{q}"</p>}
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
            <select className="h-10 w-[90px] rounded-xl border border-slate-300 bg-white pl-3 pr-6 text-center text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => <option key={`month-${i + 1}`} value={i + 1}>{dayjs().month(i).format('MMMM')}</option>)}
            </select>
            <input className="h-10 w-20 rounded-xl border border-slate-300 bg-white px-3 text-center text-sm font-medium text-slate-700 outline-none transition focus:border-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" type="number" value={year} onChange={(e) => setYear(Number(e.target.value || dayjs().year()))} />
            <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300" onClick={() => void exportSheet()}>
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>}

        <div className="card overflow-hidden border border-slate-200/80 dark:border-slate-700">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
            {[
              { id: 'overview', label: 'Attendance' },
              { id: 'logs', label: 'Logs' },
              { id: 'approvals', label: 'Approvals' },
              ...(isPrivileged ? [{ id: 'rules', label: 'Rules' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id === 'rules') {
                    window.history.replaceState(null, '', '?tab=rules')
                  } else if (searchParams.get('tab')) {
                    const params = new URLSearchParams(searchParams)
                    params.delete('tab')
                    const qs = params.toString()
                    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/70 p-4 shadow-soft dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/70">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500" />Present</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-500" />Absent</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-blue-500" />Leave</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-500" />Anomaly</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-300 dark:bg-slate-600" />Weekend</span>
                  <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />No record</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                  <Search size={12} />
                  Search from top bar
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[980px] space-y-2">
                  <div className="grid grid-cols-[210px_repeat(31,minmax(0,1fr))] gap-1 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <div className="text-left">Employee</div>
                    {Array.from({ length: heatmap?.days_in_month || 31 }).map((_, i) => (
                      <div key={`hdr-day-${i + 1}`} className="rounded-md bg-slate-100/70 py-1 leading-tight dark:bg-slate-800/70">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{i + 1}</div>
                        <div className="text-[10px] font-medium uppercase text-slate-400 dark:text-slate-500">{dayjs(`${year}-${month}-${i + 1}`).format('ddd')[0]}</div>
                      </div>
                    ))}
                  </div>
                  {filteredHeatmapRows.map((r, rowIdx) => (
                    <div key={`row-${r.employee_id}-${r.employee_code || 'na'}-${rowIdx}`} className="grid grid-cols-[210px_repeat(31,minmax(0,1fr))] items-center gap-1">
                      <div className="flex w-fit max-w-[210px] items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/90 p-2 dark:border-slate-700 dark:bg-slate-800/70">
                        {r.profile_image && !brokenHeatmapProfiles[r.employee_id] ? (
                          <img
                            src={r.profile_image}
                            alt={r.name}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                            onError={() => setBrokenHeatmapProfiles((prev) => ({ ...prev, [r.employee_id]: true }))}
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{r.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.designation || r.department || 'Employee'}</p>
                        </div>
                      </div>
                      {Array.from({ length: heatmap?.days_in_month || 31 }).map((_, idx) => {
                        const day = String(idx + 1)
                        const status = r.days?.[day] || 'no_record'
                        return (
                          <div
                            key={`cell-${r.employee_id}-${r.employee_code || 'na'}-${day}-${rowIdx}`}
                            className={`flex h-6 items-center justify-center rounded-md text-[10px] font-bold transition hover:scale-105 ${cellClass(status)} ${status === 'weekend' || status === 'no_record' ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}
                            title={`${r.name} - ${dayjs(`${year}-${month}-${day}`).format('MMM D')}: ${status}`}
                          >
                            {cellLabel(status, r.days, day)}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <AttendanceLogsPanel
              heatmap={heatmap}
              year={year}
              month={month}
              setYear={setYear}
              setMonth={setMonth}
              onExport={() => void exportSheet()}
              brokenProfiles={brokenHeatmapProfiles}
              setBrokenProfiles={setBrokenHeatmapProfiles}
            />
          )}

          {activeTab === 'approvals' && (
            <div className="p-4">
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Attendance Approvals</h3>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search employees..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900"
                    value={approvalSearch}
                    onChange={(e) => setApprovalSearch(e.target.value)}
                  />
                </div>
                <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1 dark:border-slate-700 dark:bg-slate-900/50">
                  {[{ id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }, { id: 'all', label: 'All' }].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setApprovalFilter(t.id); setApprovalPage(1) }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                        approvalFilter === t.id ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={approvalBusy || !selectedApprovalIds.length}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
                  onClick={() => void bulkReviewCorrection('approved')}
                >
                  Bulk approve
                </button>
                <button
                  type="button"
                  disabled={approvalBusy || !selectedApprovalIds.length}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-rose-700 disabled:opacity-50"
                  onClick={() => void bulkReviewCorrection('rejected')}
                >
                  Bulk reject
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  onClick={() => exportApprovalsCsv(filteredApprovals)}
                >
                  <Download size={14} />
                  Export
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={pendingApprovalIds.length > 0 && pendingApprovalIds.every((id) => selectedApprovalIds.includes(id))}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedApprovalIds(pendingApprovalIds)
                            else setSelectedApprovalIds((prev) => prev.filter((id) => !pendingApprovalIds.includes(id)))
                          }}
                        />
                      </th>
                      <th className="px-3 py-3">ID</th>
                      <th className="px-3 py-3">Employee name</th>
                      <th className="px-3 py-3">Department</th>
                      <th className="px-3 py-3">Employee manager</th>
                      <th className="px-3 py-3">In time</th>
                      <th className="px-3 py-3">Out time</th>
                      <th className="px-3 py-3">Work duration</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleApprovals.map((c) => {
                      const showRequestedTimes = c.request_type === 'mark_exact_time' || c.request_type === 'mark_present'
                      const isPending = c.status === 'pending'
                      return (
                        <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-3">
                            {isPending && (
                              <input
                                type="checkbox"
                                checked={selectedApprovalIds.includes(c.id)}
                                onChange={(e) => {
                                  setSelectedApprovalIds((prev) => (
                                    e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                                  ))
                                }}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-200">{c.employee_code}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {c.profile_image && !brokenApprovalProfiles[c.id] ? (
                                <img
                                  src={c.profile_image}
                                  alt={c.employee_name}
                                  className="h-8 w-8 rounded-full object-cover"
                                  onError={() => setBrokenApprovalProfiles((prev) => ({ ...prev, [c.id]: true }))}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                                  {employeeInitials(c.employee_name)}
                                </div>
                              )}
                              <span className="font-medium text-slate-900 dark:text-white">{c.employee_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.department || '—'}</td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.manager_name || '—'}</td>
                          <td className="px-3 py-3">
                            {c.request_type === 'mark_leave' ? (
                              <span className="text-xs text-slate-500">Leave request</span>
                            ) : (
                              <DualTimeCell
                                actual={c.actual_check_in}
                                requested={c.requested_check_in}
                                showRequested={showRequestedTimes}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {c.request_type === 'mark_leave' ? (
                              <span className="text-xs font-medium text-brand-600">
                                {c.leave_start_date} → {c.leave_end_date}
                              </span>
                            ) : (
                              <DualTimeCell
                                actual={c.actual_check_out}
                                requested={c.requested_check_out}
                                showRequested={showRequestedTimes}
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-700 dark:text-slate-200">
                            {c.requested_work_duration || c.actual_work_duration || '—'}
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{c.attendance_date}</td>
                          <td className="px-3 py-3">
                            <span className="capitalize text-xs text-slate-500">{(c.request_type || '').replaceAll('_', ' ')}</span>
                            {!isPending && (
                              <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {c.status}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {isPending ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="Approve"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                  onClick={() => void reviewCorrection(c.id, 'approved')}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  type="button"
                                  title="Reject"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                                  onClick={() => void reviewCorrection(c.id, 'rejected')}
                                >
                                  <X size={16} />
                                </button>
                                <button
                                  type="button"
                                  title="Edit & approve"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                                  onClick={() => openEditApproval(c)}
                                >
                                  <Pencil size={15} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {visibleApprovals.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-10 text-center text-sm text-slate-500">
                          No approval requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={approvalPage}
                totalPages={approvalTotalPages}
                total={filteredApprovals.length}
                pageSize={approvalPageSize}
                onPageChange={setApprovalPage}
                onPageSizeChange={(size) => { setApprovalPageSize(size); setApprovalPage(1) }}
              />

              {editingApproval && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900 dark:text-white">Edit & approve — {editingApproval.employee_name}</h4>
                      <button type="button" className="text-slate-500" onClick={() => setEditingApproval(null)}>
                        <X size={18} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">{editingApproval.attendance_date} · {(editingApproval.request_type || '').replaceAll('_', ' ')}</p>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      In time
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                        value={editApprovalForm.check_in}
                        onChange={(e) => setEditApprovalForm({ ...editApprovalForm, check_in: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Out time
                      <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                        value={editApprovalForm.check_out}
                        onChange={(e) => setEditApprovalForm({ ...editApprovalForm, check_out: e.target.value })}
                      />
                    </label>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setEditingApproval(null)}>Cancel</button>
                      <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => void saveEditAndApprove()}>
                        <Save size={14} />
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && isPrivileged && <AttendanceRulesPanel />}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Attendance</h2>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => void punch('check_in')}>Clock in</button>
          <button className="btn-secondary" onClick={() => void punch('check_out')}>Clock out</button>
        </div>
      </div>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="card p-4 text-sm">Today: In {today?.check_in ? dayjs(today.check_in).format('HH:mm') : '-'} | Out {today?.check_out ? dayjs(today.check_out).format('HH:mm') : '-'}</div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Clock in</th>
              <th className="px-4 py-3">Clock out</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Work duration</th>
              <th className="px-4 py-3">Approval</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const canRequest = (r.anomaly !== 'none' || (!r.check_in && !r.check_out)) && dayjs(r.date).isBefore(dayjs(), 'day')
              const selectedType = requestTypes[r.id] || ''

              return (
                <Fragment key={r.id}>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3">{r.date}</td>
                    <td className="px-4 py-3 text-xs">{r.shift_template_name || `${r.shift_start_time || '--:--'} to ${r.shift_end_time || '--:--'}`}</td>
                    <td className="px-4 py-3">{r.check_in ? dayjs(r.check_in).format('HH:mm') : '-'}</td>
                    <td className="px-4 py-3">{r.check_out ? dayjs(r.check_out).format('HH:mm') : '-'}</td>
                    <td className="px-4 py-3">{anomalyBadge(r.anomaly)}</td>
                    <td className="px-4 py-3">{r.work_duration || '-'}</td>
                    <td className="px-4 py-3 align-top">
                      {!canRequest ? (
                        <span className="text-xs text-slate-400">-</span>
                      ) : r.correction_request_status === 'pending' ? (
                        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          Requested for approval
                        </span>
                      ) : isCorrectionExpired(r.date) ? (
                        <span
                          className="inline-flex cursor-help rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                          title="You can request approval only within 3 days from the attendance date."
                        >
                          Request expired
                        </span>
                      ) : !approvalOpen[r.id] ? (
                        <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => openApprovalPanel(r)}>
                          Get approval
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                          onClick={() => setApprovalOpen({ ...approvalOpen, [r.id]: false })}
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>

                  {approvalOpen[r.id] && canRequest && r.correction_request_status !== 'pending' && !isCorrectionExpired(r.date) && (
                    <tr className="border-t border-slate-100 bg-slate-50/80 dark:bg-slate-900/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="mx-auto max-w-2xl space-y-3">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Request approval for {r.date}</p>

                          {!selectedType && (
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: 'mark_exact_time', label: 'Mark exact time' },
                                { id: 'mark_leave', label: 'Mark as leave' },
                                { id: 'mark_present', label: 'Mark as present' },
                                { id: 'manual_review', label: 'Manual review' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                                  onClick={() => setApprovalType(r, opt.id)}
                                >
                                  {opt.label}
                                </button>
                              ))}
                              <button
                                type="button"
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500"
                                onClick={() => setApprovalOpen({ ...approvalOpen, [r.id]: false })}
                              >
                                Cancel
                              </button>
                            </div>
                          )}

                          {selectedType === 'mark_exact_time' && (
                            <form
                              className="space-y-3 rounded-xl border border-brand-200 bg-white p-4 shadow-sm dark:border-brand-900/50 dark:bg-stone-900"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void requestCorrection(r)
                              }}
                            >
                              <p className="text-sm font-semibold text-brand-800 dark:text-brand-200">Edit clock-in & clock-out</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Update the times below, then click Apply to send your request to admin.
                              </p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Clock in
                                  <input
                                    required
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                    value={exactTimes[r.id]?.check_in || ''}
                                    onChange={(e) => setExactTimes({
                                      ...exactTimes,
                                      [r.id]: { ...(exactTimes[r.id] || defaultExactTimes(r)), check_in: e.target.value },
                                    })}
                                  />
                                </label>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Clock out
                                  <input
                                    required
                                    type="datetime-local"
                                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                    value={exactTimes[r.id]?.check_out || ''}
                                    onChange={(e) => setExactTimes({
                                      ...exactTimes,
                                      [r.id]: { ...(exactTimes[r.id] || defaultExactTimes(r)), check_out: e.target.value },
                                    })}
                                  />
                                </label>
                              </div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Note for admin (optional)
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                  value={reasons[r.id] || ''}
                                  onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                                  placeholder="e.g. forgot to punch out"
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button type="submit" className="btn-primary !px-4 !py-2 text-sm">
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary !px-4 !py-2 text-sm"
                                  onClick={() => setRequestTypes({ ...requestTypes, [r.id]: '' })}
                                >
                                  Back
                                </button>
                              </div>
                            </form>
                          )}

                          {selectedType === 'mark_leave' && (
                            <form
                              className="space-y-3 rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900 dark:bg-slate-900"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void requestCorrection(r)
                              }}
                            >
                              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Apply for leave</p>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                  Start date
                                  <input
                                    required
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                    value={leaveForms[r.id]?.start_date || r.date}
                                    onChange={(e) => setLeaveForms({
                                      ...leaveForms,
                                      [r.id]: { ...(leaveForms[r.id] || {}), start_date: e.target.value },
                                    })}
                                  />
                                </label>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                  End date
                                  <input
                                    required
                                    type="date"
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                    value={leaveForms[r.id]?.end_date || r.date}
                                    onChange={(e) => setLeaveForms({
                                      ...leaveForms,
                                      [r.id]: { ...(leaveForms[r.id] || {}), end_date: e.target.value },
                                    })}
                                  />
                                </label>
                              </div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Leave type
                                <select
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                  value={leaveForms[r.id]?.leave_type || leaveRules[0]?.code || 'paid_leave'}
                                  onChange={(e) => setLeaveForms({
                                    ...leaveForms,
                                    [r.id]: { ...(leaveForms[r.id] || {}), leave_type: e.target.value },
                                  })}
                                >
                                  {leaveRules.map((rule) => (
                                    <option key={rule.id} value={rule.code}>{rule.name}</option>
                                  ))}
                                  {leaveRules.length === 0 && <option value="paid_leave">Paid Leave</option>}
                                </select>
                              </label>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Reason
                                <textarea
                                  required
                                  rows={2}
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                  placeholder="Why do you need this leave?"
                                  value={leaveForms[r.id]?.reason || ''}
                                  onChange={(e) => setLeaveForms({
                                    ...leaveForms,
                                    [r.id]: { ...(leaveForms[r.id] || {}), reason: e.target.value },
                                  })}
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button type="submit" className="btn-primary !px-4 !py-2 text-sm">Apply leave</button>
                                <button type="button" className="btn-secondary !px-4 !py-2 text-sm" onClick={() => setRequestTypes({ ...requestTypes, [r.id]: '' })}>Back</button>
                              </div>
                            </form>
                          )}

                          {(selectedType === 'mark_present' || selectedType === 'manual_review') && (
                            <form
                              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                              onSubmit={(e) => {
                                e.preventDefault()
                                void requestCorrection(r)
                              }}
                            >
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                Reason (optional)
                                <input
                                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
                                  value={reasons[r.id] || ''}
                                  onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                                />
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button type="submit" className="btn-primary !px-4 !py-2 text-sm">Apply</button>
                                <button type="button" className="btn-secondary !px-4 !py-2 text-sm" onClick={() => setRequestTypes({ ...requestTypes, [r.id]: '' })}>Back</button>
                              </div>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {filteredRows.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="7">No attendance logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
