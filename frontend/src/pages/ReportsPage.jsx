import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, messageFromError } from '../api/client'
import { fmtInrFull } from '../utils/payrollFormat'

function MetricCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function ReportsPage() {
  const [data, setData] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [error, setError] = useState('')
  const now = new Date()

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, attRes] = await Promise.all([
          api.get('/api/reports/dashboard/'),
          api.get('/api/reports/attendance/', {
            params: { year: now.getFullYear(), month: now.getMonth() + 1 },
          }),
        ])
        setData(dashRes.data)
        setAttendance(attRes.data)
      } catch (err) {
        setError(messageFromError(err))
      }
    }
    void load()
  }, [])

  const attendanceChart = useMemo(() => {
    const byDay = attendance?.by_day || {}
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, present]) => ({
        date: date.slice(-2),
        present,
      }))
  }, [attendance])

  const deptChart = useMemo(
    () => (data?.department_breakdown || []).map((d) => ({ name: d.name, count: d.value })),
    [data]
  )

  const health = data?.attendance_health
  const payroll = data?.payroll_snapshot
  const leaves = data?.leave_pipeline
  const headcount = data?.headcount_snapshot

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">HR Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Workforce, attendance, leave, and payroll insights for your organization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/payroll?section=run&sub=reports" className="btn-secondary !py-2 text-sm">
            Payroll statutory exports
          </Link>
          <Link to="/attendance" className="btn-secondary !py-2 text-sm">
            Attendance details
          </Link>
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40">{error}</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active employees" value={data.employees_total ?? '—'} sub={headcount?.month_label} />
            <MetricCard
              label="Present today"
              value={data.present_today ?? '—'}
              sub={`${data.on_leave_today ?? 0} on leave · ${data.absent_today ?? 0} absent`}
            />
            <MetricCard
              label="Pending leave requests"
              value={data.pending_leaves ?? '—'}
              sub={`${leaves?.approved ?? 0} approved this month`}
            />
            <MetricCard
              label="Payroll this month"
              value={payroll?.has_run ? fmtInrFull(payroll.net_payout) : 'No run'}
              sub={payroll?.status ? `Status: ${payroll.status}` : 'Create a pay run in Payroll'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="font-semibold">Attendance health — {health?.month_label || 'This month'}</h3>
              <p className="mt-1 text-xs text-slate-500">Person-day mix on scheduled workdays</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(health?.metrics || []).map((m) => (
                  <div key={m.key} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                    <p className="text-lg font-bold text-brand-700 dark:text-brand-300">{m.pct}%</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{m.label}</p>
                    <p className="text-[10px] text-slate-400">{m.count} days</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="font-semibold">Leave pipeline — {leaves?.month_label}</h3>
              <div className="mt-4 space-y-2">
                {(leaves?.stages || []).map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <span className="text-sm capitalize">{s.label}</span>
                    <span className="font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">{leaves?.pending_now ?? 0} awaiting approval right now</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card h-80 p-4">
              <h3 className="font-semibold">Daily attendance (this month)</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={attendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="present" fill="#0d9488" name="Present" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card h-80 p-4">
              <h3 className="font-semibold">7-day presence trend</h3>
              <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data.attendance_weekly_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" stroke="#2563eb" strokeWidth={2} name="Present" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {deptChart.length > 0 && (
            <div className="card h-80 p-4">
              <h3 className="font-semibold">Headcount by department</h3>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={deptChart} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#7c3aed" name="Employees" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h3 className="font-semibold">Payroll snapshot</h3>
              {payroll?.has_run ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>Gross payout: {fmtInrFull(payroll.gross_payout)}</li>
                  <li>Net payout: {fmtInrFull(payroll.net_payout)}</li>
                  <li>Employees in run: {payroll.employees_in_run}</li>
                  <li>Missing compensation setup: {payroll.missing_compensation}</li>
                  {payroll.employees_on_hold > 0 && <li>On hold: {payroll.employees_on_hold}</li>}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No payroll run for {payroll?.period_label || 'this month'} yet.</p>
              )}
              {payroll?.draft_runs_count > 0 && (
                <p className="mt-2 text-xs text-amber-700">{payroll.draft_runs_count} draft run(s) need review</p>
              )}
            </div>

            <div className="card p-4">
              <h3 className="font-semibold">People highlights</h3>
              <p className="mt-2 text-xs font-semibold uppercase text-slate-500">Upcoming birthdays</p>
              <ul className="mt-1 space-y-1 text-sm">
                {(data.upcoming_birthdays || []).slice(0, 4).map((b) => (
                  <li key={b.employee_code}>
                    {b.name} — {b.days_until === 0 ? 'Today' : `in ${b.days_until} day(s)`}
                  </li>
                ))}
                {(data.upcoming_birthdays || []).length === 0 && <li className="text-slate-500">None in the next weeks</li>}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Work anniversaries</p>
              <ul className="mt-1 space-y-1 text-sm">
                {(data.work_anniversaries || []).slice(0, 4).map((a) => (
                  <li key={a.employee_code}>
                    {a.name} — {a.years_completed} yr{a.years_completed === 1 ? '' : 's'} · in {a.days_until} day(s)
                  </li>
                ))}
                {(data.work_anniversaries || []).length === 0 && <li className="text-slate-500">None upcoming</li>}
              </ul>
            </div>
          </div>

          {(data.action_queue?.items || []).length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold">Action queue ({data.action_queue.total})</h3>
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {data.action_queue.items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.subtitle}</p>
                    </div>
                    <Link to={item.href} className="text-xs font-semibold text-brand-600 hover:underline">
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
