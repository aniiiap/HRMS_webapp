import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Pencil, Save, Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'
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

export default function AttendancePage() {
  const { isManagerPlus } = useAuth()
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
  const [approvalOpen, setApprovalOpen] = useState({})
  const [brokenHeatmapProfiles, setBrokenHeatmapProfiles] = useState({})
  const [searchParams] = useSearchParams()
  const q = (searchParams.get('q') || '').trim().toLowerCase()

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
        const [{ data: heat }, { data: logData }, { data: corrData }] = await Promise.all([
          api.get('/api/attendance/heatmap/', { params: { year, month } }),
          api.get('/api/attendance/', { params: { ordering: '-date' } }),
          api.get('/api/attendance/correction_requests/'),
        ])
        setHeatmap(heat)
        setLogs(Array.isArray(logData) ? logData : logData.results || [])
        setCorrections(Array.isArray(corrData) ? corrData : corrData.results || [])
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

  async function requestCorrection(row) {
    const requestType = requestTypes[row.id] || 'mark_present'
    try {
      await api.post(`/api/attendance/${row.id}/request_correction/`, {
        request_type: requestType,
        requested_check_out: requestType === 'mark_exact_time' ? exactTimes[row.id] || null : null,
        reason:
          requestType === 'mark_leave'
            ? 'Requesting leave conversion for this day.'
            : requestType === 'mark_exact_time'
              ? 'Submitting exact check-out time for attendance regularization.'
            : 'Checked in but forgot to check out. Please regularize attendance.',
      })
      toast.success('Approval request sent to admin.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function reviewCorrection(correctionId, status) {
    try {
      await api.post('/api/attendance/review_correction/', {
        correction_id: correctionId,
        status,
      })
      toast.success(`Correction ${status}.`)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
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

  const cellClass = (status) => {
    if (status === 'present') return 'bg-emerald-500/95 ring-1 ring-emerald-300/60 dark:ring-emerald-400/20'
    if (status === 'absent') return 'bg-rose-500/95 ring-1 ring-rose-300/60 dark:ring-rose-400/20'
    if (status === 'leave') return 'bg-blue-500/95 ring-1 ring-blue-300/60 dark:ring-blue-400/20'
    if (status === 'weekend') return 'bg-slate-300 ring-1 ring-slate-300/80 dark:bg-slate-600 dark:ring-slate-500/60'
    return 'bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
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
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
                        return <div key={`cell-${r.employee_id}-${r.employee_code || 'na'}-${day}-${rowIdx}`} className={`h-6 rounded-md transition hover:scale-105 ${cellClass(status)}`} title={`${r.name} - ${dayjs(`${year}-${month}-${day}`).format('MMM D')}: ${status}`} />
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="overflow-x-auto p-4">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Shift</th>
                    <th className="px-3 py-2">Clock in</th>
                    <th className="px-3 py-2">Clock out</th>
                    <th className="px-3 py-2">Anomaly</th>
                    <th className="px-3 py-2">Work duration</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.slice(0, 80).map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">{r.employee_name}</td>
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2 text-xs">{r.shift_template_name || `${r.shift_start_time || '--:--'} to ${r.shift_end_time || '--:--'}`}</td>
                      <td className="px-3 py-2">{editing?.id === r.id ? <input type="datetime-local" className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900" value={editing.check_in || ''} onChange={(e) => setEditing({ ...editing, check_in: e.target.value })} /> : (r.check_in ? dayjs(r.check_in).format('YYYY-MM-DD HH:mm') : '-')}</td>
                      <td className="px-3 py-2">{editing?.id === r.id ? <input type="datetime-local" className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900" value={editing.check_out || ''} onChange={(e) => setEditing({ ...editing, check_out: e.target.value })} /> : (r.check_out ? dayjs(r.check_out).format('YYYY-MM-DD HH:mm') : '-')}</td>
                      <td className="px-3 py-2">{anomalyBadge(r.anomaly)}</td>
                      <td className="px-3 py-2">{r.work_duration || '-'}</td>
                      <td className="px-3 py-2">{editing?.id === r.id ? <div className="flex gap-1"><button className="btn-secondary !px-2 !py-1" onClick={() => void saveLogEdit()}><Save size={14} /></button><button className="btn-secondary !px-2 !py-1" onClick={() => setEditing(null)}><X size={14} /></button></div> : <button className="btn-secondary !px-2 !py-1" onClick={() => setEditing({ id: r.id, check_in: r.check_in ? dayjs(r.check_in).format('YYYY-MM-DDTHH:mm') : '', check_out: r.check_out ? dayjs(r.check_out).format('YYYY-MM-DDTHH:mm') : '', notes: r.notes || '' })}><Pencil size={14} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="p-4">
              <div className="mb-3 text-sm font-semibold">Attendance correction approvals</div>
              <div className="space-y-2">
                {corrections.filter((c) => c.status === 'pending').slice(0, 12).map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{c.employee_name} - {c.attendance_date}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{(c.request_type || 'manual_review').replace('_', ' ')} | {c.reason || 'No reason provided'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary !px-3 !py-1.5" onClick={() => void reviewCorrection(c.id, 'approved')}>Approve</button>
                      <button className="btn-secondary !px-3 !py-1.5" onClick={() => void reviewCorrection(c.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                ))}
                {corrections.filter((c) => c.status === 'pending').length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No pending approvals.</p>
                )}
              </div>
            </div>
          )}
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
            {filteredRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3 text-xs">{r.shift_template_name || `${r.shift_start_time || '--:--'} to ${r.shift_end_time || '--:--'}`}</td>
                <td className="px-4 py-3">{r.check_in ? dayjs(r.check_in).format('HH:mm') : '-'}</td>
                <td className="px-4 py-3">{r.check_out ? dayjs(r.check_out).format('HH:mm') : '-'}</td>
                <td className="px-4 py-3">{anomalyBadge(r.anomaly)}</td>
                <td className="px-4 py-3">{r.work_duration || '-'}</td>
                <td className="px-4 py-3">
                  {r.anomaly !== 'none' && dayjs(r.date).isBefore(dayjs(), 'day') ? (
                    approvalOpen[r.id] ? (
                      <div className="flex flex-wrap gap-1">
                        <select className="rounded-lg border border-slate-300 px-2 py-1 text-xs" value={requestTypes[r.id] || 'mark_present'} onChange={(e) => setRequestTypes({ ...requestTypes, [r.id]: e.target.value })}>
                          <option value="mark_present">Mark as present</option>
                          <option value="mark_exact_time">Mark exact time</option>
                          <option value="mark_leave">Mark as leave</option>
                          <option value="manual_review">Manual review</option>
                        </select>
                        {(requestTypes[r.id] || 'mark_present') === 'mark_exact_time' && (
                          <input
                            type="datetime-local"
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                            value={exactTimes[r.id] || ''}
                            onChange={(e) => setExactTimes({ ...exactTimes, [r.id]: e.target.value })}
                          />
                        )}
                        <button className="btn-secondary !px-3 !py-1.5" onClick={() => void requestCorrection(r)}>Send request</button>
                      </div>
                    ) : (
                      <button
                        className="btn-secondary !px-3 !py-1.5"
                        onClick={() => setApprovalOpen({ ...approvalOpen, [r.id]: true })}
                      >
                        Get approval
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="7">No attendance logs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
