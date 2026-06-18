import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Eye, Pencil, Save, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import Pagination from '../Pagination'

const STATUS_LEGEND = [
  { code: 'P', label: 'Present', color: 'bg-emerald-500' },
  { code: 'A', label: 'Absent', color: 'bg-rose-500' },
  { code: 'L', label: 'Leave', color: 'bg-blue-500' },
  { code: 'WO', label: 'Weekly off', color: 'bg-slate-500' },
  { code: 'WFH', label: 'Work from home', color: 'bg-lime-400' },
  { code: 'AN', label: 'Anomaly', color: 'bg-amber-500' },
  { code: 'NA', label: 'No data', color: 'bg-slate-200 dark:bg-slate-700' },
]

function filterSelectClass(extra = '') {
  return `h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${extra}`
}

function ToolbarSelect({ className = 'w-[120px]', ...props }) {
  return (
    <select
      className={filterSelectClass(className)}
      {...props}
    />
  )
}

function employeeInitials(name) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatTime(value) {
  return value ? dayjs(value).format('hh:mm A') : '--'
}

function cellClass(status) {
  if (status === 'present') return 'bg-emerald-500 text-white'
  if (status === 'absent') return 'bg-rose-500 text-white'
  if (status === 'leave') return 'bg-blue-500 text-white'
  if (status === 'wfh') return 'bg-lime-500 text-white'
  if (status === 'anomaly') return 'bg-amber-500 text-white'
  if (status === 'weekend') return 'bg-slate-400 text-white dark:bg-slate-600'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}

function cellCode(status, days, day) {
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

function StatusBadge({ code }) {
  const map = {
    P: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    A: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
    L: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
    WFH: 'bg-lime-100 text-lime-800 dark:bg-lime-950/50 dark:text-lime-300',
    WO: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    AN: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    NA: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${map[code] || map.NA}`}>
      {code}
    </span>
  )
}

function LegendBar() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-400">
      {STATUS_LEGEND.map((item) => (
        <span key={item.code} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.code}</span>
          <span>: {item.label}</span>
        </span>
      ))}
    </div>
  )
}

function SummaryCards({ summary }) {
  if (!summary) return null
  const cards = [
    { label: 'Present', value: summary.present || 0, className: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Absent', value: summary.absent || 0, className: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300' },
    { label: 'Leave', value: (summary.leave || 0) + (summary.wfh || 0), className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300' },
    { label: 'Anomaly', value: summary.anomaly || 0, className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300' },
  ]
  return (
    <div className="flex flex-wrap gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${c.className}`}>
          {c.label}: {c.value}
        </div>
      ))}
    </div>
  )
}


export default function AttendanceLogsPanel({
  heatmap,
  year,
  month,
  setYear,
  setMonth,
  onExport,
  brokenProfiles,
  setBrokenProfiles,
}) {
  const [logsView, setLogsView] = useState('table')
  const [logDate, setLogDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [tableSearch, setTableSearch] = useState('')
  const [tableDepartment, setTableDepartment] = useState('')
  const [tableStatus, setTableStatus] = useState('all')
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [tableSort, setTableSort] = useState('name')
  const [dailyData, setDailyData] = useState(null)
  const [tableLoading, setTableLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detailRow, setDetailRow] = useState(null)
  const [calendarSearch, setCalendarSearch] = useState('')
  const [calendarPage, setCalendarPage] = useState(1)
  const [calendarPageSize, setCalendarPageSize] = useState(10)

  const loadDailyLogs = useCallback(async () => {
    setTableLoading(true)
    try {
      const { data } = await api.get('/api/attendance/daily_logs/', {
        params: {
          date: logDate,
          search: tableSearch.trim(),
          department: tableDepartment,
          status: tableStatus,
          sort_by: tableSort,
          page: tablePage,
          page_size: tablePageSize,
        },
      })
      setDailyData(data)
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setTableLoading(false)
    }
  }, [logDate, tableSearch, tableDepartment, tableStatus, tableSort, tablePage, tablePageSize])

  useEffect(() => {
    if (logsView === 'table') void loadDailyLogs()
  }, [logsView, loadDailyLogs])

  useEffect(() => {
    setTablePage(1)
  }, [logDate, tableSearch, tableDepartment, tableStatus, tablePageSize])

  useEffect(() => {
    setCalendarPage(1)
  }, [calendarSearch, year, month, calendarPageSize])

  async function saveEdit() {
    if (!editing?.attendance_id) return
    try {
      await api.patch(`/api/attendance/${editing.attendance_id}/`, {
        check_in: editing.check_in || null,
        check_out: editing.check_out || null,
        notes: editing.notes || '',
      })
      toast.success('Attendance updated.')
      setEditing(null)
      await loadDailyLogs()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const calendarRows = useMemo(() => {
    let rows = heatmap?.rows || []
    const term = calendarSearch.trim().toLowerCase()
    if (term) {
      rows = rows.filter((r) => `${r.employee_code} ${r.name} ${r.department}`.toLowerCase().includes(term))
    }
    return rows
  }, [heatmap, calendarSearch])

  const calendarTotalPages = Math.max(Math.ceil(calendarRows.length / calendarPageSize), 1)
  const visibleCalendarRows = useMemo(
    () => calendarRows.slice((calendarPage - 1) * calendarPageSize, calendarPage * calendarPageSize),
    [calendarRows, calendarPage, calendarPageSize],
  )

  const daysInMonth = heatmap?.days_in_month || dayjs(`${year}-${month}-01`).daysInMonth()

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Logs</h3>
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold dark:border-slate-600">
          {[
            { id: 'table', label: 'Table View' },
            { id: 'calendar', label: 'Calendar View' },
          ].map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setLogsView(v.id)}
              className={`px-4 py-2 transition ${
                logsView === v.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {logsView === 'table' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="search-input w-44 shrink-0 sm:w-52">
                <Search aria-hidden />
                <input type="search" placeholder="Search..." value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} />
              </div>
              <button type="button" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300" onClick={onExport}>
                <Download size={14} />
                Export
              </button>
              <ToolbarSelect className="w-[130px]" value={tableDepartment} onChange={(e) => setTableDepartment(e.target.value)}>
                <option value="">Department</option>
                {(dailyData?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </ToolbarSelect>
              <ToolbarSelect className="w-[110px]" value={tableStatus} onChange={(e) => setTableStatus(e.target.value)}>
                <option value="all">Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="leave">Leave</option>
                <option value="wfh">Work from home</option>
                <option value="anomaly">Anomaly</option>
                <option value="weekend">Weekly off</option>
              </ToolbarSelect>
              <ToolbarSelect className="w-[130px]" value={tableSort} onChange={(e) => setTableSort(e.target.value)}>
                <option value="name">Sort by name</option>
                <option value="id">Sort by ID</option>
                <option value="status">Sort by status</option>
              </ToolbarSelect>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <button type="button" className="text-brand-600 hover:underline" onClick={() => setLogDate(dayjs(logDate).subtract(1, 'day').format('YYYY-MM-DD'))}>
                <ChevronLeft className="inline h-3.5 w-3.5" /> Previous
              </button>
              <input
                type="date"
                className="h-9 w-[132px] rounded-lg border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
              <button type="button" className="text-brand-600 hover:underline" onClick={() => setLogDate(dayjs(logDate).add(1, 'day').format('YYYY-MM-DD'))}>
                Next <ChevronRight className="inline h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Employee name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">In time</th>
                  <th className="px-4 py-3">Out time</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading…</td></tr>
                )}
                {!tableLoading && (dailyData?.rows || []).map((r) => (
                  <tr key={r.employee_id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{r.employee_code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.profile_image && !brokenProfiles?.[r.employee_id] ? (
                          <img src={r.profile_image} alt="" className="h-8 w-8 rounded-full object-cover" onError={() => setBrokenProfiles((p) => ({ ...p, [r.employee_id]: true }))} />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">{employeeInitials(r.employee_name)}</div>
                        )}
                        <span className="font-medium text-slate-900 dark:text-white">{r.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge code={r.status_code} /></td>
                    <td className="px-4 py-3">
                      {editing?.attendance_id === r.attendance_id && r.attendance_id ? (
                        <input type="datetime-local" className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900" value={editing.check_in} onChange={(e) => setEditing({ ...editing, check_in: e.target.value })} />
                      ) : formatTime(r.check_in)}
                    </td>
                    <td className="px-4 py-3">
                      {editing?.attendance_id === r.attendance_id && r.attendance_id ? (
                        <input type="datetime-local" className="rounded border border-slate-300 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900" value={editing.check_out} onChange={(e) => setEditing({ ...editing, check_out: e.target.value })} />
                      ) : formatTime(r.check_out)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editing?.attendance_id === r.attendance_id ? (
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => void saveEdit()}><Save size={14} /></button>
                          <button type="button" className="btn-secondary !px-2 !py-1" onClick={() => setEditing(null)}><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          {r.attendance_id && (
                            <button type="button" className="btn-secondary !px-2 !py-1" title="Edit" onClick={() => setEditing({
                              attendance_id: r.attendance_id,
                              check_in: r.check_in ? dayjs(r.check_in).format('YYYY-MM-DDTHH:mm') : '',
                              check_out: r.check_out ? dayjs(r.check_out).format('YYYY-MM-DDTHH:mm') : '',
                              notes: r.notes || '',
                            })}
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          <button type="button" className="btn-secondary !px-2 !py-1" title="View" onClick={() => setDetailRow(r)}><Eye size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!tableLoading && !(dailyData?.rows || []).length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No records for this date.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={dailyData?.page || 1}
            totalPages={dailyData?.total_pages || 1}
            total={dailyData?.total || 0}
            pageSize={tablePageSize}
            onPageChange={setTablePage}
            onPageSizeChange={(size) => { setTablePageSize(size); setTablePage(1) }}
          />
          <SummaryCards summary={dailyData?.summary} />
          <LegendBar />
        </>
      )}

      {logsView === 'calendar' && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="search-input w-44 shrink-0 sm:w-52">
              <Search aria-hidden />
              <input type="search" placeholder="Name, ID" value={calendarSearch} onChange={(e) => setCalendarSearch(e.target.value)} />
            </div>
            <button type="button" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700" onClick={onExport}>
              <Download size={14} />
              Export
            </button>
            <ToolbarSelect className="w-[88px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = dayjs().year() - 2 + i
                return <option key={y} value={y}>{y}</option>
              })}
            </ToolbarSelect>
            <ToolbarSelect className="w-[120px]" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={i + 1}>{dayjs().month(i).format('MMMM')}</option>)}
            </ToolbarSelect>
          </div>

          <div className="overflow-x-auto p-4">
            <div className="min-w-[900px] space-y-1">
              <div className="grid gap-px text-center text-[10px] font-semibold text-slate-500" style={{ gridTemplateColumns: `56px 180px repeat(${daysInMonth}, minmax(28px, 1fr))` }}>
                <div className="text-left">ID</div>
                <div className="text-left">Employee name</div>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <div key={i + 1} className="py-1 leading-tight">
                    <div>{i + 1}</div>
                    <div className="text-[9px] font-normal uppercase text-slate-400">{dayjs(`${year}-${month}-${i + 1}`).format('ddd')}</div>
                  </div>
                ))}
              </div>
              {visibleCalendarRows.map((r) => (
                <div
                  key={r.employee_id}
                  className="grid items-center gap-px"
                  style={{ gridTemplateColumns: `56px 180px repeat(${daysInMonth}, minmax(28px, 1fr))` }}
                >
                  <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">{r.employee_code}</div>
                  <div className="flex min-w-0 items-center gap-1.5 pr-2">
                    {r.profile_image && !brokenProfiles?.[r.employee_id] ? (
                      <img src={r.profile_image} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" onError={() => setBrokenProfiles((p) => ({ ...p, [r.employee_id]: true }))} />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-800">{employeeInitials(r.name)}</div>
                    )}
                    <span className="truncate text-xs font-medium text-slate-900 dark:text-white">{r.name}</span>
                  </div>
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = String(idx + 1)
                    const status = r.days?.[day] || 'no_record'
                    return (
                      <div
                        key={day}
                        className={`flex h-7 items-center justify-center rounded text-[9px] font-bold ${cellClass(status)}`}
                        title={`${r.name} · ${dayjs(`${year}-${month}-${day}`).format('D MMM')}: ${cellCode(status, r.days, day)}`}
                      >
                        {cellCode(status, r.days, day)}
                      </div>
                    )
                  })}
                </div>
              ))}
              {visibleCalendarRows.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-500">No employees found.</p>
              )}
            </div>
          </div>

          <Pagination
            page={calendarPage}
            totalPages={calendarTotalPages}
            total={calendarRows.length}
            pageSize={calendarPageSize}
            onPageChange={setCalendarPage}
            onPageSizeChange={(size) => { setCalendarPageSize(size); setCalendarPage(1) }}
          />
          <LegendBar />
        </>
      )}

      {detailRow && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-stone-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold text-slate-900 dark:text-white">{detailRow.employee_name}</h4>
              <button type="button" onClick={() => setDetailRow(null)}><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Date</dt><dd>{logDate}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusBadge code={detailRow.status_code} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">In time</dt><dd>{formatTime(detailRow.check_in)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Out time</dt><dd>{formatTime(detailRow.check_out)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Department</dt><dd>{detailRow.department || '—'}</dd></div>
              {detailRow.anomaly && detailRow.anomaly !== 'none' && (
                <div className="flex justify-between"><dt className="text-slate-500">Anomaly</dt><dd className="capitalize">{detailRow.anomaly.replace(/_/g, ' ')}</dd></div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
