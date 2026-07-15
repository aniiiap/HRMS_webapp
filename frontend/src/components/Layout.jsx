import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileBarChart2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Settings,
  Sun,
  Users,
  FileText,
  Receipt,
  X
} from 'lucide-react'
import dayjs from 'dayjs'
import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import useAnnouncementPopup from '../hooks/useAnnouncementPopup'
import AnnouncementPopup from './AnnouncementPopup'
import GlobalSearch from './GlobalSearch'
import RoutePageFallback from './RoutePageFallback'

const allGeneral = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, iconFx: 'icon-fx-bounce' },
  { to: '/payroll', label: 'Payroll', employeeLabel: 'Payslips', icon: IndianRupee, iconFx: 'icon-fx-swing' },
  { to: '/employees', label: 'Employees', icon: Users, iconFx: 'icon-fx-pop' },
  { to: '/attendance', label: 'Attendance', icon: CalendarDays, iconFx: 'icon-fx-nudge' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, iconFx: 'icon-fx-rise' },
  { to: '/letters', label: 'Letters & Docs', icon: FileText, iconFx: 'icon-fx-tilt' },
]

const allMore = [
  { to: '/leaves', label: 'Leaves', icon: Briefcase, iconFx: 'icon-fx-tilt' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, iconFx: 'icon-fx-rise' },
  { to: '/expenses/approvals', label: 'Expense Approvals', icon: Receipt, iconFx: 'icon-fx-rise' },
  { to: '/organizations', label: 'Organizations', icon: Building2, iconFx: 'icon-fx-pop' },
  { to: '/reports', label: 'Reports', icon: FileBarChart2, iconFx: 'icon-fx-rise' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { announcement: announcementModal, dismiss: dismissAnnouncementModal } = useAnnouncementPopup(user?.id)
  const notifRef = useRef(null)

  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'
  const displayName =
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    user?.email?.split('@')?.[0] ||
    (user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Account')
  const canViewPayrollAdmin = ['admin', 'hr'].includes(user?.role)
  const canViewReports = ['admin', 'hr'].includes(user?.role)
  const general = allGeneral.map((item) => {
    if (item.to === '/letters' && !['admin', 'hr'].includes(user?.role)) {
      return { ...item, to: `/employees/${user?.employee_id}?tab=documents`, label: 'My Documents' }
    }
    return item
  }).filter((item) => {
    if (item.to === '/employees') return ['admin', 'hr'].includes(user?.role)
    if (item.to === '/announcements') return ['admin', 'hr', 'employee'].includes(user?.role)
    if (item.to === '/payroll') return ['admin', 'hr', 'employee'].includes(user?.role)
    return true
  })
  const more = allMore.filter((item) => {
    if (item.to === '/organizations') return canViewPayrollAdmin && !user?.is_superuser
    if (item.to === '/reports') return canViewReports
    if (item.to === '/expenses/approvals') return ['admin', 'hr'].includes(user?.role)
    if (item.to === '/expenses') return ['employee'].includes(user?.role)
    return true
  })

  async function loadNotifications({ silent = false } = {}) {
    if (!silent) setNotifLoading(true)
    try {
      const { data } = await api.get('/api/notifications/')
      const rows = Array.isArray(data) ? data : data.results || []
      setUnreadCount(rows.length)
      setNotifications(
        rows.slice(0, 12).map((n) => ({
          id: n.id,
          title: n.title,
          subtitle: n.message,
          type: n.type,
          created_at: n.created_at,
        })),
      )
      return rows
    } catch {
      setUnreadCount(0)
      setNotifications([])
      return []
    } finally {
      if (!silent) setNotifLoading(false)
    }
  }

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

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      return
    }
    void loadNotifications()
  }, [user?.id])

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
      isActive
        ? 'nav-active pl-4'
        : 'text-stone-600 hover:bg-warm-100/90 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800/80 dark:hover:text-stone-100'
    }`

  const Sidebar = (
    <div className="flex h-full min-h-0 flex-col border-r border-warm-200/90 bg-gradient-to-b from-white via-surface-card to-warm-50/80 dark:border-stone-800 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900">
      <div className="shrink-0 px-3 pb-1 pt-2 md:px-4 md:pb-1.5 md:pt-2.5">
        {/* Full row width matches previous icon + “HR Core” + tagline footprint */}
        <div className="flex w-full min-w-0 items-center">
          <img
            src="/illustrations/image-removebg-preview%20(1).png"
            alt="HR Core"
            className="block h-auto w-full max-h-[5.25rem] object-contain object-left sm:max-h-[5.75rem]"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pb-2">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">General</p>
          <div className="space-y-0.5">
            {general.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                <span className={`inline-flex ${item.iconFx}`}>
                  <item.icon size={18} strokeWidth={2} />
                </span>
                {['employee', 'manager'].includes(user?.role) && item.employeeLabel ? item.employeeLabel : item.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Management</p>
          <div className="space-y-0.5">
            {more.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setMobileOpen(false)}>
                <span className={`inline-flex ${item.iconFx}`}>
                  <item.icon size={18} strokeWidth={2} />
                </span>
                {['employee', 'manager'].includes(user?.role) && item.employeeLabel ? item.employeeLabel : item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-warm-200/80 p-3 dark:border-stone-800">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-warm-200 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-warm-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 md:hidden"
          onClick={toggle}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-warm-200 py-2.5 text-sm font-semibold text-stone-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-rose-900 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
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
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-surface text-stone-800 dark:bg-stone-950 dark:text-stone-100">
      <AnnouncementPopup
        announcement={announcementModal}
        onDismiss={async (item) => {
          await dismissAnnouncementModal(item)
          await loadNotifications({ silent: true })
        }}
      />

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/55 backdrop-blur-sm dark:bg-black/65 md:hidden motion-safe:animate-fade-in"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,272px)] flex-col bg-surface-card shadow-2xl transition-transform duration-300 ease-out dark:bg-stone-950 dark:shadow-black/50 md:static md:z-0 md:w-[14.5rem] md:min-w-[14.5rem] md:max-w-[14.5rem] md:shadow-none ${
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
          <header className="relative z-[80] flex shrink-0 flex-wrap items-center gap-3 border-b border-warm-200/80 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/85 md:gap-4 md:px-6 lg:px-8">
            <button
              type="button"
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>

            <GlobalSearch />

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              <button
                type="button"
                className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
                <Bell size={20} className={unreadCount > 0 ? "animate-ring text-brand-600 dark:text-brand-400" : ""} />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 animate-ping opacity-75" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-950" />
                  </>
                )}
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
                          setUnreadCount(0)
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
                          if (t.includes('announcement')) navigate('/announcements')
                          else if (t.includes('attendance')) navigate('/attendance')
                          else if (t.includes('leave')) navigate('/leaves')
                          else if (t.includes('payroll')) navigate('/payroll')
                          else if (t.includes('report')) navigate('/reports')
                          else navigate('/announcements')
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
              <div className="ml-1 flex items-center gap-2 rounded-xl border border-warm-200/90 bg-white/90 py-1 pl-1 pr-3 shadow-soft dark:border-stone-700 dark:bg-stone-900/90">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-xs font-bold text-white shadow-md shadow-brand-600/30">
                  {initials}
                </div>
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{displayName}</p>
                  <p className="text-[10px] capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
                </div>
              </div>
            </div>
          </header>

          <section className="relative z-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-mesh-light scrollbar-thin dark:bg-mesh-dark">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-500/[0.04] to-transparent dark:from-brand-400/[0.06]" aria-hidden />
            <div className="relative mx-auto w-full max-w-[1600px] motion-safe:animate-fade-up px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
              <Suspense fallback={<RoutePageFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
