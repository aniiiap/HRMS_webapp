import { Building2, LayoutDashboard, LogOut, Moon, Sun } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const nav = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform/organizations', label: 'Organizations', icon: Building2 },
]

export default function PlatformLayout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-surface bg-mesh-light dark:bg-stone-950 dark:bg-mesh-dark">
      <header className="border-b border-warm-200/80 bg-white/85 px-4 py-4 shadow-sm backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">HR Core Platform</p>
            <h1 className="font-display text-lg font-bold text-stone-900 dark:text-white">Owner dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-stone-500 sm:inline">{user?.email}</span>
            <button type="button" onClick={toggle} className="btn-ghost !p-2.5" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" onClick={handleLogout} className="btn-secondary inline-flex items-center gap-2 !py-2">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[220px_1fr] md:p-6">
        <nav className="card flex flex-row gap-2 p-2 md:flex-col md:p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'nav-active pl-4'
                    : 'text-stone-600 hover:bg-warm-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="motion-safe:animate-fade-up min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
