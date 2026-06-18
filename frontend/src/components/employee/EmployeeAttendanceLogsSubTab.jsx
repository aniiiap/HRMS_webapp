import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarDays, MapPin } from 'lucide-react'
import {
  attendanceStatusCode,
  formatDurationHuman,
  formatTime,
} from './profileUtils'

const STATUS_LEGEND = [
  { code: 'P', label: 'Present' },
  { code: 'A', label: 'Absent' },
  { code: 'L', label: 'Leave' },
  { code: 'WO', label: 'Weekly off' },
  { code: 'H', label: 'Holiday' },
  { code: 'HL', label: 'Half day leave' },
  { code: 'WFH', label: 'Work from home' },
  { code: 'AN', label: 'Anomaly', danger: true },
  { code: 'MC', label: 'Missing check-out', danger: true },
]

const TIMELINE_START = 9
const TIMELINE_END = 21
const HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i)

const TH = 'px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400'
const TD = 'px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300'

function buildPunchRows(row) {
  if (!row) return []
  const rows = []
  if (row.check_in) {
    rows.push({ id: `${row.id}-in`, si: 1, time: row.check_in, type: 'Clock In' })
  }
  if (row.check_out) {
    rows.push({ id: `${row.id}-out`, si: rows.length + 1, time: row.check_out, type: 'Clock Out' })
  }
  return rows
}

function hourFraction(iso) {
  if (!iso) return null
  const d = dayjs(iso)
  return d.hour() + d.minute() / 60
}

function timeStringFraction(t) {
  if (!t) return null
  const [h, m] = String(t).slice(0, 5).split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return null
  return hour + (Number(m) || 0) / 60
}

function timelinePct(hour) {
  if (hour == null) return 0
  const range = TIMELINE_END - TIMELINE_START
  return Math.max(0, Math.min(100, ((hour - TIMELINE_START) / range) * 100))
}

function formatHourLabel(h) {
  if (h === 12) return '12 PM'
  if (h < 12) return `${h} AM`
  return `${h - 12} PM`
}

export default function EmployeeAttendanceLogsSubTab({ attendance = [] }) {
  const [mode, setMode] = useState('daily')
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [rangeFrom, setRangeFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'))
  const [rangeTo, setRangeTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const dailyRow = useMemo(
    () => attendance.find((a) => a.date === selectedDate),
    [attendance, selectedDate],
  )

  const punchRows = useMemo(() => buildPunchRows(dailyRow), [dailyRow])

  const monthlyRows = useMemo(() => {
    return attendance
      .filter((a) => a.date >= rangeFrom && a.date <= rangeTo)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [attendance, rangeFrom, rangeTo])

  const totalPages = Math.max(1, Math.ceil(monthlyRows.length / pageSize))
  const pagedMonthly = monthlyRows.slice((page - 1) * pageSize, page * pageSize)

  const timelineLeft = timelinePct(hourFraction(dailyRow?.check_in))
  const timelineWidth = Math.max(0, timelinePct(hourFraction(dailyRow?.check_out)) - timelineLeft)

  const shiftStartFrac = timeStringFraction(dailyRow?.shift_start_time)
  const graceMins = dailyRow?.grace_minutes ?? 0
  const graceEndFrac = shiftStartFrac != null ? shiftStartFrac + graceMins / 60 : null
  const graceLeft = timelinePct(shiftStartFrac)
  const graceWidth = Math.max(0, timelinePct(graceEndFrac) - graceLeft)

  const hasAnomaly = dailyRow?.anomaly && dailyRow.anomaly !== 'none'
  const barColor = hasAnomaly ? 'bg-rose-500' : 'bg-brand-500'

  const anomalyText =
    dailyRow?.anomaly === 'missing_checkout'
      ? 'Missing check-out'
      : hasAnomaly
        ? dailyRow.anomaly.replace(/_/g, ' ')
        : ''

  function shiftDay(delta) {
    setSelectedDate(dayjs(selectedDate).add(delta, 'day').format('YYYY-MM-DD'))
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded border border-slate-200 text-[11px] dark:border-slate-700">
          {[
            { id: 'daily', label: 'Daily log' },
            { id: 'monthly', label: 'Monthly log' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-3.5 py-1.5 font-medium transition ${
                mode === t.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'daily' ? (
          <div className="flex items-center gap-1.5 text-[11px]">
            <button type="button" className="text-brand-600 hover:underline" onClick={() => shiftDay(-1)}>
              ‹ Previous
            </button>
            <label className="relative inline-flex items-center">
              <CalendarDays className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                className="rounded border border-slate-300 py-1 pl-7 pr-2 text-[11px] dark:border-slate-600 dark:bg-slate-900"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
            <button type="button" className="text-brand-600 hover:underline" onClick={() => shiftDay(1)}>
              Next ›
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span>Select date range</span>
            <input
              type="date"
              className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
              value={rangeFrom}
              onChange={(e) => {
                setRangeFrom(e.target.value)
                setPage(1)
              }}
            />
            <span>To</span>
            <input
              type="date"
              className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
              value={rangeTo}
              onChange={(e) => {
                setRangeTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}
      </div>

      {mode === 'daily' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
          {/* Timeline block — anomalies + summary + chart (Kredily layout) */}
          <div className="border-b border-slate-200 bg-sky-50/50 p-3 dark:border-slate-700 dark:bg-sky-950/20">
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
              <div>
                <p className="mb-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">Anomalies</p>
                <div className="flex min-h-[52px] items-center rounded border border-sky-200/80 bg-white px-2.5 py-2 dark:border-sky-900/50 dark:bg-slate-900/60">
                  {anomalyText ? (
                    <span className="text-[11px] font-medium capitalize text-rose-600 dark:text-rose-400">
                      {anomalyText}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">Summary</p>
                <div className="rounded border border-sky-200/80 bg-white dark:border-sky-900/50 dark:bg-slate-900/60">
                  <div className="grid grid-cols-3 divide-x divide-sky-100 dark:divide-slate-700">
                    {[
                      { label: 'Work duration', value: dailyRow?.work_duration ? formatDurationHuman(dailyRow.work_duration) : '—' },
                      { label: 'Break duration', value: '—' },
                      { label: 'Overtime duration', value: '—' },
                    ].map((item) => (
                      <div key={item.label} className="px-2 py-2 text-center">
                        <p className="text-[10px] text-slate-500">{item.label}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-800 dark:text-slate-100">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <div className="relative mb-0.5 flex justify-between text-[9px] font-medium text-slate-400">
                  {HOURS.map((h) => (
                    <span key={h} className="flex-1 text-center first:text-left last:text-right">
                      {formatHourLabel(h)}
                    </span>
                  ))}
                </div>
                <div className="relative h-7 rounded-sm bg-white dark:bg-slate-800/80">
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/90 dark:border-slate-600"
                      style={{ left: `${timelinePct(h)}%` }}
                    />
                  ))}
                  {shiftStartFrac != null && graceWidth > 0 && (
                    <div
                      className="absolute top-1 bottom-1 rounded-sm"
                      style={{
                        left: `${graceLeft}%`,
                        width: `${graceWidth}%`,
                        backgroundImage:
                          'repeating-linear-gradient(45deg, #93c5fd 0, #93c5fd 3px, #dbeafe 3px, #dbeafe 6px)',
                      }}
                    />
                  )}
                  {dailyRow?.check_in && dailyRow?.check_out && (
                    <div
                      className={`absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${barColor}`}
                      style={{ left: `${timelineLeft}%`, width: `${Math.max(timelineWidth, 1.5)}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="shrink-0 space-y-1 text-[9px] leading-tight text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-brand-500" /> No anomalies
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-rose-500" /> Clockin-clockout IP mismatch
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-amber-500" /> Missing check-out
                </span>
              </div>
            </div>
          </div>

          {/* Single scrollable punch table */}
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-800/60">
                  <th className={TH}>Sl no</th>
                  <th className={TH}>Time</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>IP address</th>
                  <th className={TH}>Location</th>
                  <th className={TH}>App version</th>
                  <th className={TH}>Mobile model</th>
                  <th className={TH}>Device name</th>
                  <th className={TH}>OS version</th>
                </tr>
              </thead>
              <tbody>
                {punchRows.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 text-center dark:border-slate-800">
                    <td className={TD}>{p.si}</td>
                    <td className={TD}>{formatTime(p.time)}</td>
                    <td className={TD}>{p.type}</td>
                    <td className={`${TD} text-slate-400`}>—</td>
                    <td className={TD}>
                      <div className="mx-auto inline-flex h-14 w-[72px] flex-col items-center justify-end overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                        <MapPin className="mb-0.5 h-3.5 w-3.5 text-rose-500" />
                        <span className="w-full bg-slate-600 py-0.5 text-[8px] text-white">View in map</span>
                      </div>
                    </td>
                    <td className={`${TD} text-slate-400`}>—</td>
                    <td className={`${TD} text-slate-400`}>—</td>
                    <td className={`${TD} text-slate-400`}>—</td>
                    <td className={`${TD} text-slate-400`}>—</td>
                  </tr>
                ))}
                {punchRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-6 text-center text-[11px] text-slate-500">
                      No punch records for {dayjs(selectedDate).format('DD MMM YYYY')}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'monthly' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-800/60">
                  <th className={TH}>Date</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>In time</th>
                  <th className={TH}>Out time</th>
                  <th className={TH}>Work duration</th>
                  <th className={TH}>Overtime duration</th>
                  <th className={TH}>Break duration</th>
                  <th className={TH}>Break count</th>
                </tr>
              </thead>
              <tbody>
                {pagedMonthly.map((a) => {
                  const st = attendanceStatusCode(a)
                  return (
                    <tr key={a.id || a.date} className="border-b border-slate-100 dark:border-slate-800">
                      <td className={`${TD} whitespace-nowrap`}>{dayjs(a.date).format('DD-MM-YYYY')}</td>
                      <td className={TD}>
                        <StatusCode code={st.code} tone={st.tone} />
                      </td>
                      <td className={TD}>{formatTime(a.check_in)}</td>
                      <td className={TD}>{formatTime(a.check_out)}</td>
                      <td className={TD}>{formatDurationHuman(a.work_duration)}</td>
                      <td className={`${TD} text-slate-400`}>—</td>
                      <td className={`${TD} text-slate-400`}>—</td>
                      <td className={`${TD} text-slate-400`}>—</td>
                    </tr>
                  )
                })}
                {pagedMonthly.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-[11px] text-slate-500">
                      No records in selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {monthlyRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-2.5 py-2 text-[10px] text-slate-500 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select
                  className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] dark:border-slate-600 dark:bg-slate-900"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, monthlyRows.length)} of {monthlyRows.length}
                </span>
                <span>Page {page} of {totalPages}</span>
                <div className="flex gap-0.5">
                  <PagerBtn disabled={page <= 1} onClick={() => setPage(1)} label="«" />
                  <PagerBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)} label="‹" />
                  <PagerBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} label="›" />
                  <PagerBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)} label="»" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'monthly' && (
        <div className="rounded border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
          <span className="font-semibold">Status legend: </span>
          {STATUS_LEGEND.map((s, i) => (
            <span key={s.code} className={s.danger ? 'text-rose-600 dark:text-rose-400' : ''}>
              {i > 0 ? ' · ' : ''}
              <strong>{s.code}</strong> — {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusCode({ code, tone }) {
  return (
    <span
      className={`inline-flex rounded px-1 py-0.5 text-[10px] font-bold ${
        tone === 'rose'
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
          : tone === 'emerald'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {code}
    </span>
  )
}

function PagerBtn({ disabled, onClick, label }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-slate-300 px-1.5 py-0.5 disabled:opacity-40 dark:border-slate-600"
    >
      {label}
    </button>
  )
}
