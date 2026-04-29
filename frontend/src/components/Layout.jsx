import {
  Bell,
  Briefcase,
  CalendarDays,
  FileBarChart2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const allGeneral = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, iconFx: 'icon-fx-bounce' },
  { to: '/payroll', label: 'Payroll', icon: IndianRupee, iconFx: 'icon-fx-swing' },
  { to: '/employees', label: 'Employees', icon: Users, iconFx: 'icon-fx-pop' },
  { to: '/attendance', label: 'Attendance', icon: CalendarDays, iconFx: 'icon-fx-nudge' },
]

const allMore = [
  { to: '/leaves', label: 'Leaves', icon: Briefcase, iconFx: 'icon-fx-tilt' },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, iconFx: 'icon-fx-rise' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const didMount = useRef(false)
  const notifRef = useRef(null)

  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'
  const displayName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.email?.split('@')?.[0] ||
    (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Account')
  const canViewPayroll = ['admin', 'hr'].includes(user?.role)
  const canViewReports = ['admin', 'hr', 'manager'].includes(user?.role)
  const general = allGeneral.filter((item) => {
    if (item.to === '/payroll') return canViewPayroll
    if (item.to === '/employees') return ['admin', 'hr', 'manager'].includes(user?.role)
    return true
  })
  const more = allMore.filter((item) => {
    if (item.to === '/reports') return canViewReports
    return true
  })

  async function loadNotifications() {
    setNotifLoading(true)
    try {
      const { data } = await api.get('/api/notifications/')
      const rows = Array.isArray(data) ? data : data.results || []
      setNotifications(
        rows.slice(0, 12).map((n) => ({
          id: n.id,
          title: n.title,
          subtitle: n.message,
          type: n.type,
          created_at: n.created_at,
        })),
      )
    } catch {
      setNotifications([])
    } finally {
      setNotifLoading(false)
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || ''
    setGlobalSearch(q)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    const t = setTimeout(() => {
      const q = globalSearch.trim()
      const params = new URLSearchParams(location.search)
      if (q.length >= 2) params.set('q', q)
      else params.delete('q')
      const nextSearch = params.toString()
      const next = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`
      if (`${location.pathname}${location.search}` !== next) navigate(next, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [globalSearch, navigate, location.pathname, location.search])

  useEffect(() => {
    if (!notifOpen) return
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [notifOpen])

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive
        ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/70 dark:text-brand-300 dark:shadow-none'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/90 dark:hover:text-white'
    }`

  const Sidebar = (
    <div className="flex h-full min-h-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="shrink-0 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-lg shadow-brand-500/25">
            H
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">HR Core</h1>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">People Platform</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-2">
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">General</p>
          <div className="space-y-0.5">
            {general.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                <span className={`inline-flex ${item.iconFx}`}>
                  <item.icon size={18} strokeWidth={2} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Management</p>
          <div className="space-y-0.5">
            {more.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                <span className={`inline-flex ${item.iconFx}`}>
                  <item.icon size={18} strokeWidth={2} />
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#f4f6f9] text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,260px)] flex-col bg-white shadow-2xl transition-transform duration-200 dark:bg-slate-950 dark:shadow-black/40 md:static md:z-0 md:w-56 md:min-w-[14rem] md:max-w-[14rem] md:shadow-none ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          {Sidebar}
          <button
            type="button"
            className="absolute right-3 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X size={22} />
          </button>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="relative z-[80] flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 md:gap-4 md:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div className="relative min-w-0 flex-1 md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search people, payroll, reports…"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none ring-brand-500/20 placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:bg-slate-900"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              <button
                type="button"
                className="hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:block"
                onClick={toggle}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={async () => {
                  const next = !notifOpen
                  setNotifOpen(next)
                  if (next) await loadNotifications()
                }}
              >
                <Bell size={20} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-950" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 z-[120] mt-2 w-[330px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        onClick={async () => {
                          await api.post('/api/notifications/mark-all-read/')
                          setNotifications([])
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
                        onClick={() => setNotifOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  {notifLoading && <p className="p-2 text-xs text-slate-500 dark:text-slate-400">Loading...</p>}
                  {!notifLoading && notifications.length === 0 && (
                    <p className="p-2 text-xs text-slate-500 dark:text-slate-400">No new notifications.</p>
                  )}
                  <ul className="max-h-72 space-y-2 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className="cursor-pointer rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-700 dark:bg-slate-800/60"
                        onClick={() => {
                          const t = String(n.type || '').toLowerCase()
                          if (t.includes('attendance')) navigate('/attendance')
                          else if (t.includes('leave')) navigate('/leaves')
                          else if (t.includes('payroll')) navigate('/payroll')
                          else if (t.includes('report')) navigate('/reports')
                          else navigate('/')
                          setNotifOpen(false)
                        }}
                      >
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{n.subtitle}</p>
                        {n.created_at && <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{dayjs(n.created_at).format('MMM D, HH:mm')}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </div>
              <button
                type="button"
                className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => {
                  navigate('/profile')
                }}
              >
                <Settings size={20} />
              </button>
              <div className="ml-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{displayName}</p>
                  <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="relative z-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <div className="mx-auto w-full max-w-[1600px] animate-fade-up px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
