import dayjs from 'dayjs'
import {
  ArrowRight,
  Cake,
  CalendarClock,
  Briefcase,
  LogIn,
  LogOut,
  Radio,
  Smartphone,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, messageFromError } from '../api/client'
import EmptyState from '../components/ui/EmptyState'
import PageSkeleton from '../components/ui/PageSkeleton'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const LAST_LOCATION_KEY = 'hrms_last_location'
const MAX_LOCATION_AGE_MS = 5 * 60 * 1000
const PIE_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#f59e0b', '#78716c', '#a8a29e']

/** Work anniversary sidebar card — compact height below Hello. */
const WORK_ANNIVERSARY_CARD = 'flex min-h-[200px] flex-col sm:min-h-[220px]'

/** Bottom row panels — equal height (leave + birthdays). */
const DASHBOARD_BOTTOM_CARD = 'flex h-full min-h-[240px] max-h-[380px] flex-col sm:min-h-[260px] sm:max-h-[450px]'
const COMPANY_ACTIVITY_CARD = 'flex min-h-[260px] max-h-[380px] flex-col sm:min-h-[280px] sm:max-h-[450px]'

const DAILY_QUOTES = [
  'Great teams are built one consistent day at a time.',
  'People-first decisions create lasting business outcomes.',
  'Small improvements every day become big wins every quarter.',
  'Clarity, empathy, and speed make operations world-class.',
  'Strong culture is the best long-term productivity multiplier.',
]

function StatMini({ icon: Icon, label, value, accent }) {
  return (
    <div className="group card relative flex h-full min-h-[92px] items-center gap-4 overflow-hidden px-4 py-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card dark:hover:shadow-brand-900/20">
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
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-xs font-bold text-brand-800 dark:from-brand-900/60 dark:to-brand-800/40 dark:text-brand-200">
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

const PULSE_EVENT_META = {
  check_in: {
    icon: LogIn,
    dot: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50',
    chip: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  check_out: {
    icon: LogOut,
    dot: 'bg-slate-500 ring-slate-100 dark:ring-slate-700',
    chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  leave: {
    icon: CalendarClock,
    dot: 'bg-amber-500 ring-amber-100 dark:ring-amber-900/50',
    chip: 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  },
}

function formatPulseTime(iso) {
  if (!iso) return '—'
  return dayjs(iso).format('h:mm A')
}

function TeamPulsePanel({ pulse }) {
  const events = pulse?.events || []

  if (events.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
        <Radio size={28} className="text-brand-500 dark:text-brand-400" strokeWidth={1.5} />
        <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">Quiet day so far</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          When employees check in, check out, or submit leave today, those events will show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul className="relative min-h-0 flex-1 space-y-0 overflow-y-auto pr-1">
        <div className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-brand-300 via-brand-200 to-transparent dark:from-brand-700 dark:via-brand-900" />
        {events.map((event, index) => {
          const meta = PULSE_EVENT_META[event.type] || PULSE_EVENT_META.check_in
          const Icon = meta.icon
          return (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              <div className="relative z-10 flex shrink-0 flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ring-4 ${meta.dot} ${
                    index === 0 ? 'animate-pulse' : ''
                  }`}
                >
                  <Icon size={14} className="text-white" strokeWidth={2.5} />
                </span>
              </div>
              <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{event.name}</p>
                  <time className="shrink-0 text-[11px] font-medium tabular-nums text-slate-400 dark:text-slate-500">
                    {formatPulseTime(event.at)}
                  </time>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {event.department || 'Team member'}
                </p>
                <p className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${meta.chip}`}>
                  {event.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {pulse?.has_more && (
        <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
          +{(pulse.total_events ?? 0) - events.length} more events today
        </p>
      )}
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
    <div className="flex w-full flex-col gap-2">
      <div className="relative mx-auto aspect-square w-full max-w-[160px] sm:max-w-[176px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={160} minHeight={160}>
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
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-left dark:border-slate-700/80">
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel overflow-hidden rounded-xl border border-white/60 bg-white/80 px-3.5 py-2.5 text-sm shadow-xl backdrop-blur-md dark:border-stone-700/50 dark:bg-stone-900/80 dark:shadow-black/50">
        {label && <p className="mb-1.5 font-semibold text-slate-900 dark:text-white">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: entry.color || entry.payload?.fill || '#14b8a6' }}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {entry.name}: <span className="tabular-nums font-bold text-slate-900 dark:text-white">{entry.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { user, isPrivileged } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [data, setData] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [punchLoading, setPunchLoading] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const axisColor = isDark ? '#64748b' : '#94a3b8'

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const endpoint = isPrivileged ? '/api/reports/dashboard/' : '/api/reports/me/'
        if (isPrivileged) {
          const params = {}
          if (user?.organization_id) params.organization = user.organization_id
          const res = await api.get(endpoint, { params })
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
      } finally {
        setLoading(false)
      }
    }
    void load()
    const timer = setInterval(() => {
      void load()
    }, 60000)
    return () => clearInterval(timer)
  }, [isPrivileged, user?.organization_id])

  const firstName = user?.first_name || 'there'
  const quoteOfDay = DAILY_QUOTES[(dayjs().date() + dayjs().month()) % DAILY_QUOTES.length]
  const teamPulse = data?.team_pulse
  const deptData = (data?.department_breakdown || []).map((d, i) => ({
    ...d,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }))
  const recentLeaves = data?.recent_leave_activity || []
  const upcomingBirthdays = data?.upcoming_birthdays || []
  const workAnniversaries = data?.work_anniversaries || []
  const weeklyTrend = data?.attendance_weekly_trend || []
  const leaveBalances = data?.leave_balances || []
  const attTrend = data?.attendance_trend || []
  const notifications = data?.notifications || []

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

  if (!isPrivileged) {
    const trendChart = attTrend
      .filter((d) => d.status !== 'weekend')
      .map((d) => ({
        day: dayjs(d.date).format('D'),
        present: d.status === 'present' ? 1 : 0,
        late: d.status === 'late' ? 1 : 0,
        absent: d.status === 'absent' ? 1 : 0,
      }))

    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 p-4 text-white shadow-glow md:p-5 motion-safe:animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight md:text-2xl">Hi {firstName},</h2>
              <p className="mt-1 text-xs text-brand-100 md:text-sm">Your workspace — attendance and leave</p>
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
        {loading && <PageSkeleton rows={5} />}

        {!loading && (
          <>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="card p-5">
                <SectionTitle
                  action={
                    <Link to="/leaves" className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      Apply leave
                    </Link>
                  }
                >
                  Leave balances
                </SectionTitle>
                {leaveBalances.length === 0 ? (
                  <EmptyState title="No leave policy" description="Contact HR to assign a leave policy." />
                ) : (
                  <ul className="space-y-2">
                    {leaveBalances.map((b) => (
                      <li key={b.leave_type} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{b.label}</span>
                        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
                          {b.remaining} / {b.quota} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card p-5">
                <SectionTitle>Attendance (last 2 weeks)</SectionTitle>
                <div className="h-[200px] w-full">
                  {trendChart.length === 0 ? (
                    <EmptyState title="No trend data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: axisColor }} />
                        <YAxis hide allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                        <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                        <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late / short" />
                        <Bar dataKey="absent" stackId="a" fill="#f43f5e" name="Absent" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <SectionTitle>Notifications</SectionTitle>
              {notifications.length === 0 ? (
                <EmptyState title="All caught up" description="No new notifications." />
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                      <p className="line-clamp-2 text-xs text-slate-500">{n.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
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
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[min(100%,320px)] lg:self-stretch xl:w-[360px]">
        <div className="card relative w-full shrink-0 overflow-hidden bg-[#dff7f1] ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
          <div className="relative flex flex-col p-4">
            <img
              src="/illustrations/10172825_8401.webp"
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
                &quot;{quoteOfDay}&quot;
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

        <div className={`card p-3 sm:p-4 ${WORK_ANNIVERSARY_CARD} lg:min-h-0 lg:flex-1`}>
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Work anniversary highlights</h3>
            <Briefcase size={18} className="shrink-0 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {workAnniversaries.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No work anniversaries coming up.
              </div>
            ) : (
          <ul className="max-h-[168px] min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-[180px]">
            {workAnniversaries.map((w) => (
              <li
                key={`${w.employee_code}-${w.next_anniversary}`}
                className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/90 p-2.5 dark:border-slate-700/80 dark:bg-slate-800/40"
              >
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
            )}
          </div>
        </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:min-h-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
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
              accent="bg-gradient-to-br from-brand-500 to-brand-800"
            />
            <StatMini
              icon={LogIn}
              label="Late arrivals today"
              value={data?.late_arrivals_today ?? '—'}
              accent="bg-gradient-to-br from-orange-500 to-amber-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:min-h-0 lg:flex-1">
            <div className="flex min-h-0 flex-col gap-4 lg:col-span-8 lg:flex-1">
              <div className={`card relative overflow-hidden p-5 sm:p-6 ${COMPANY_ACTIVITY_CARD}`}>
                <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-gradient-to-br from-brand-400/15 to-fuchsia-400/10 blur-2xl" />
                <SectionTitle
                  action={
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                      </span>
                      Live today
                    </span>
                  }
                >
                  Today&apos;s company activity
                </SectionTitle>
                <p className="-mt-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                  {teamPulse?.date_label || 'Today'} — check-ins, check-outs, and leave requests from all employees in your organization.
                </p>
                <div className="flex min-h-0 flex-1 flex-col">
                  <TeamPulsePanel pulse={teamPulse} />
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
                <div className={`card p-5 sm:p-6 ${DASHBOARD_BOTTOM_CARD}`}>
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">Recent leave activity</h3>
                    <Link to="/leaves" className="text-xs font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-400">
                      Open leaves
                    </Link>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    {recentLeaves.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        No recent leave requests.
                      </div>
                    ) : (
                  <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                    {recentLeaves.map((row) => (
                      <li
                        key={row.id}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3 dark:border-slate-700/80 dark:bg-slate-800/40"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
                          <CalendarClock size={18} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900 dark:text-white">{row.employee_name}</p>
                          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">
                            {row.leave_type_name || String(row.leave_type || '').replace(/_/g, ' ')} ·{' '}
                            {row.start_date && row.end_date
                              ? `${dayjs(row.start_date).format('MMM D')} – ${dayjs(row.end_date).format('MMM D')}`
                              : '—'}
                          </p>
                          <div className="mt-1.5">{leaveStatusBadge(row.status)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                    )}
                  </div>
                </div>

                <div className={`card relative overflow-hidden p-5 sm:p-6 ${DASHBOARD_BOTTOM_CARD}`}>
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
                  <div className="relative flex min-h-0 flex-1 flex-col">
                    {upcomingBirthdays.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        Add date of birth on employee profiles to see birthdays here.
                      </div>
                    ) : (
                  <ul className="relative min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
                    {upcomingBirthdays.map((b) => (
                      <li
                        key={b.employee_code}
                        className="flex gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-3 dark:border-slate-700/80 dark:from-slate-900 dark:to-slate-800/80"
                      >
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
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-4 lg:col-span-4 lg:flex-1 lg:self-stretch">
              <div className="card flex min-h-[200px] flex-1 flex-col p-5 sm:p-6 sm:min-h-[220px] lg:min-h-0">
                <SectionTitle>Present this week</SectionTitle>
                <div className="min-h-[180px] w-full flex-1 sm:min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
                    <BarChart data={weeklyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} />
                      <YAxis tick={{ fontSize: 11, fill: axisColor }} stroke={axisColor} allowDecimals={false} width={32} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                      <Bar dataKey="present" name="Present" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card flex shrink-0 flex-col p-4 sm:p-5">
                <SectionTitle>People by department</SectionTitle>
                <p className="-mt-2 mb-0.5 text-xs text-slate-500 dark:text-slate-400">Headcount snapshot</p>
                <DepartmentDonut deptData={deptData} isDark={isDark} />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
