import dayjs from 'dayjs'
import {
  ArrowRight,
  Cake,
  CalendarClock,
  Briefcase,
  LogIn,
  LogOut,
  Smartphone,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const PIE_COLORS = ['#7c3aed', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#94a3b8', '#64748b']

const PANEL_SCROLL = 'max-h-[min(340px,42vh)] overflow-y-auto overscroll-contain pr-1'
const DAILY_QUOTES = [
  'Great teams are built one consistent day at a time.',
  'People-first decisions create lasting business outcomes.',
  'Small improvements every day become big wins every quarter.',
  'Clarity, empathy, and speed make operations world-class.',
  'Strong culture is the best long-term productivity multiplier.',
]

function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="group card relative flex h-full min-h-[92px] items-center gap-4 overflow-hidden px-4 py-4 shadow-soft transition hover:shadow-lg dark:hover:shadow-brand-900/20">
      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md ${accent}`}>
        <Icon size={22} className="text-white" strokeWidth={2} />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">{value}</p>
        <p className="mt-0.5 text-xs font-medium leading-snug text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function statusBadge(active) {
  return active ? (
    <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-950/80 dark:text-brand-300">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
      Inactive
    </span>
  )
}

function profilePill(name, imageUrl) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover dark:border-slate-700"
      />
    )
  }
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-indigo-100 text-xs font-bold text-brand-800 dark:from-brand-900/60 dark:to-indigo-900/40 dark:text-brand-200">
      {initials}
    </div>
  )
}

function leaveStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  const map = {
    pending: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
    approved: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    rejected: 'bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${map[s] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
    >
      {status}
    </span>
  )
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{children}</h3>
      {action}
    </div>
  )
}

/** Donut + legend below — avoids clipped side labels on narrow cards */
function DepartmentDonut({ deptData, isDark }) {
  if (!deptData.length) {
    return <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No department data yet.</p>
  }
  const tip = isDark
    ? {
        borderRadius: 12,
        border: '1px solid #334155',
        background: '#0f172a',
        color: '#e2e8f0',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      }
    : {
        borderRadius: 12,
        border: '1px solid rgb(226 232 240)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
      }
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-[220px] sm:max-w-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={deptData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={2}
            >
              {deptData.map((entry, index) => (
                <Cell key={entry.name} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip contentStyle={tip} formatter={(value, name) => [`${value}`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-left dark:border-slate-700/80">
        {deptData.map((d, index) => (
          <li key={d.name} className="flex max-w-[100%] items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 sm:text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: d.fill || PIE_COLORS[index % PIE_COLORS.length] }}
            />
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{d.name}</span>
            <span className="tabular-nums text-slate-500 dark:text-slate-500">({d.value})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isManagerPlus } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [data, setData] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [punchLoading, setPunchLoading] = useState('')
  const [error, setError] = useState('')

  const axisColor = isDark ? '#64748b' : '#94a3b8'
  const tooltipStyles = isDark
    ? { borderRadius: 12, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }
    : { borderRadius: 12, border: '1px solid #e2e8f0' }

  useEffect(() => {
    async function load() {
      try {
        const endpoint = isManagerPlus ? '/api/reports/dashboard/' : '/api/reports/me/'
        if (isManagerPlus) {
          const res = await api.get(endpoint)
          setData(res.data)
        } else {
          const today = dayjs().format('YYYY-MM-DD')
          const [dashboardRes, attRes] = await Promise.all([
            api.get(endpoint),
            api.get('/api/attendance/', { params: { date: today, ordering: '-date' } }),
          ])
          setData(dashboardRes.data)
          const rows = Array.isArray(attRes.data) ? attRes.data : attRes.data?.results || []
          setTodayAttendance(rows[0] || null)
        }
      } catch (err) {
        setError(messageFromError(err))
      }
    }
    void load()
    const timer = setInterval(() => {
      void load()
    }, 60000)
    return () => clearInterval(timer)
  }, [isManagerPlus])

  const firstName = user?.first_name || 'there'
  const quoteOfDay = DAILY_QUOTES[(dayjs().date() + dayjs().month()) % DAILY_QUOTES.length]
  const teamData = data?.team_performance || []
  const deptData = (data?.department_breakdown || []).map((d, i) => ({
    ...d,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))
  const recentLeaves = data?.recent_leave_activity || []
  const upcomingBirthdays = data?.upcoming_birthdays || []
  const workAnniversaries = data?.work_anniversaries || []

  function captureLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device/browser.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        () => reject(new Error('Location permission is required for attendance punch.')),
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 },
      )
    })
  }

  async function punch(type) {
    setPunchLoading(type)
    try {
      const location = await captureLocation()
      const { data: attendanceRow } = await api.post(`/api/attendance/${type}/`, location)
      toast.success(type === 'check_in' ? 'Clocked in successfully.' : 'Clocked out successfully.')
      setTodayAttendance(attendanceRow)
      void api.get('/api/reports/me/').then((res) => setData(res.data)).catch(() => {})
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setPunchLoading('')
    }
  }

  if (!isManagerPlus) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-indigo-700 p-4 text-white shadow-lg md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Hi {firstName},</h2>
              <p className="mt-1 text-xs text-brand-100 md:text-sm">Mobile-first attendance quick actions</p>
            </div>
            <div className="rounded-xl bg-white/15 p-2">
              <Smartphone size={18} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-2">
            <button
              type="button"
              onClick={() => void punch('check_in')}
              disabled={punchLoading === 'check_in'}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:opacity-60"
            >
              <LogIn size={16} />
              Clock in
            </button>
            <button
              type="button"
              onClick={() => void punch('check_out')}
              disabled={punchLoading === 'check_out'}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900/40 px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-slate-900/55 disabled:opacity-60"
            >
              <LogOut size={16} />
              Clock out
            </button>
          </div>
          <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs">
            Today: In {todayAttendance?.check_in ? dayjs(todayAttendance.check_in).format('HH:mm') : '-'} | Out {todayAttendance?.check_out ? dayjs(todayAttendance.check_out).format('HH:mm') : '-'}
          </div>
        </div>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Attendance days (month)</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{data?.attendance_days_this_month ?? '—'}</p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Pending my leaves</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{data?.pending_my_leaves ?? '—'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Attendance, people, leave, and celebrations at a glance.</p>
        </div>
        <div className="hidden text-xs font-medium text-slate-400 sm:block dark:text-slate-500">{dayjs().format('dddd, MMMM D, YYYY')}</div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="card relative w-full shrink-0 overflow-hidden bg-[#dff7f1] ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10 lg:w-[min(100%,320px)] xl:w-[360px]">
          <div className="relative flex h-full flex-col p-4">
            <img
              src="/illustrations/10172825_8401.jpg"
              alt="Welcome illustration"
              className="mt-2 h-[190px] w-full rounded-2xl bg-white object-contain p-2 md:h-[210px]"
            />
            <div className="mt-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Hello</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{firstName}!</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                You have <span className="font-semibold tabular-nums">{data?.pending_leaves ?? 0}</span> leave requests waiting for review.
              </p>
              <Link
                to="/leaves"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Review queue
                <ArrowRight size={18} />
              </Link>
              <blockquote className="mx-auto mt-4 max-w-[90%] text-xs italic text-slate-500 dark:text-slate-400">
                "{quoteOfDay}"
              </blockquote>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white/70 p-2 text-center text-[11px] dark:bg-slate-900/40">
              <div className="rounded-lg bg-brand-50 px-2 py-1.5 dark:bg-brand-900/40">
                <p className="font-semibold tabular-nums text-brand-700 dark:text-brand-300">{data?.present_today ?? 0}</p>
                <p className="text-slate-500 dark:text-slate-400">Present</p>
              </div>
              <div className="rounded-lg bg-rose-50 px-2 py-1.5 dark:bg-rose-900/30">
                <p className="font-semibold tabular-nums text-rose-700 dark:text-rose-300">{data?.absent_today ?? 0}</p>
                <p className="text-slate-500 dark:text-slate-400">Absent</p>
              </div>
              <div className="rounded-lg bg-indigo-50 px-2 py-1.5 dark:bg-indigo-900/30">
                <p className="font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">{data?.on_leave_today ?? 0}</p>
                <p className="text-slate-500 dark:text-slate-400">Leave</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            <StatMini
              icon={UserPlus}
              label="Total present today"
              value={data?.present_today ?? '—'}
              accent="bg-gradient-to-br from-brand-500 to-brand-700"
            />
            <StatMini
              icon={UserMinus}
              label="Total absent today"
              value={data?.absent_today ?? '—'}
              accent="bg-gradient-to-br from-slate-600 to-slate-800"
            />
            <StatMini
              icon={CalendarClock}
              label="On approved leave"
              value={data?.on_leave_today ?? '—'}
              accent="bg-gradient-to-br from-indigo-500 to-violet-700 sm:col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-6">
            <div className="card flex flex-col p-5 sm:p-6 lg:col-span-8">
              <SectionTitle
                action={
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                    Last 12 months
                  </span>
                }
              >
                Team attendance load
              </SectionTitle>
              <div className="h-[260px] w-full min-h-0 sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={teamData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} allowDecimals={false} width={40} />
                    <Tooltip contentStyle={tooltipStyles} labelStyle={{ fontWeight: 600 }} />
                    <Legend
                      wrapperStyle={{
                        paddingTop: 12,
                        color: isDark ? '#cbd5e1' : '#475569',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="engineering"
                      name="Engineering"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="other_departments"
                      name="Other departments"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card flex flex-col p-5 sm:p-6 lg:col-span-4">
              <SectionTitle>People by department</SectionTitle>
              <p className="-mt-2 mb-1 text-xs text-slate-500 dark:text-slate-400">Headcount snapshot</p>
              <DepartmentDonut deptData={deptData} isDark={isDark} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-stretch">
        <div className="card flex min-h-0 flex-col overflow-hidden xl:col-span-5">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-700/80 sm:px-5">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Work anniversary highlights</h3>
            <Briefcase size={18} className="text-brand-600 dark:text-brand-400" />
          </div>
          <ul className={`grid gap-3 p-4 sm:grid-cols-2 ${PANEL_SCROLL}`}>
            {workAnniversaries.length === 0 && (
              <li className="col-span-full rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No work anniversaries coming up.
              </li>
            )}
            {workAnniversaries.map((w) => (
              <li key={`${w.employee_code}-${w.next_anniversary}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-slate-700/80 dark:bg-slate-800/40">
                {profilePill(w.name, w.profile_image)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{w.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{w.designation || 'Team member'}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {w.days_until === 0
                      ? `${w.years_completed} year${w.years_completed === 1 ? '' : 's'} milestone today!`
                      : `${w.years_completed} year${w.years_completed === 1 ? '' : 's'} on ${dayjs(w.next_anniversary).format('MMM D')}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card flex min-h-0 flex-col p-5 sm:p-6 xl:col-span-4">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Recent leave activity</h3>
            <Link to="/leaves" className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
              Open leaves
            </Link>
          </div>
          <ul className={`space-y-2.5 ${PANEL_SCROLL}`}>
            {recentLeaves.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No recent leave requests.
              </li>
            )}
            {recentLeaves.map((row) => (
              <li key={row.id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-slate-700/80 dark:bg-slate-800/40">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                  <CalendarClock size={18} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{row.employee_name}</p>
                  <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                    {String(row.leave_type || '').replace('_', ' ')} ·{' '}
                    {row.start_date && row.end_date
                      ? `${dayjs(row.start_date).format('MMM D')} – ${dayjs(row.end_date).format('MMM D')}`
                      : '—'}
                  </p>
                  <div className="mt-1.5">{leaveStatusBadge(row.status)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card relative flex min-h-0 flex-col overflow-hidden p-5 sm:p-6 xl:col-span-3">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-brand-500/20 blur-2xl dark:from-fuchsia-500/10" />
          <div className="relative mb-3 flex shrink-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-brand-600 text-white shadow-md">
              <Cake size={18} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Birthdays</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upcoming celebrations</p>
            </div>
          </div>
          <ul className={`space-y-3 ${PANEL_SCROLL}`}>
            {upcomingBirthdays.length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Add date of birth on employee profiles to see birthdays here.
              </li>
            )}
            {upcomingBirthdays.map((b) => (
              <li key={b.employee_code} className="flex gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-3 dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-800/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-fuchsia-100 text-xs font-bold text-brand-800 dark:from-brand-900/60 dark:to-fuchsia-900/40 dark:text-brand-200">
                  {b.name
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{b.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{b.designation || '—'}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {b.days_until === 0
                      ? 'Today!'
                      : `In ${b.days_until} day${b.days_until === 1 ? '' : 's'} · ${dayjs(b.next_birthday).format('MMM D')}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
