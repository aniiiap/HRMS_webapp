import { Eye, EyeOff, Moon, Sparkles, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { messageFromError, tokenStore } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SmartButton from '../components/ui/SmartButton';
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { login, user, loading: authLoading, defaultHome } = useAuth()
  const { theme, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || defaultHome

  useEffect(() => {
    if (!authLoading && user) {
      const dest = user.is_superuser && !user.organization_id ? '/platform' : redirectTo
      navigate(dest, { replace: true })
    }
  }, [authLoading, user, navigate, redirectTo])

  const isPasswordError = Boolean(error && /incorrect password/i.test(error))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedIn = await login(email, password)
      const dest = loggedIn?.is_superuser && !loggedIn?.organization_id ? '/platform' : redirectTo
      navigate(dest, { replace: true })
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading && tokenStore.getAccess()) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-surface bg-mesh-light p-4 dark:bg-stone-950 dark:bg-mesh-dark">
        <div className="flex flex-col items-center gap-4 text-stone-600 dark:text-stone-400">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium">Opening your workspace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface bg-mesh-light p-4 dark:bg-stone-950 dark:bg-mesh-dark">
      <div className="pointer-events-none absolute -left-24 top-16 h-80 w-80 animate-float-slow animate-pulse-soft rounded-full bg-brand-300/30 blur-3xl dark:bg-brand-800/20" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-96 w-96 animate-float-slower animate-pulse-soft rounded-full bg-accent-300/25 blur-3xl dark:bg-accent-700/15" />

      <button
        type="button"
        onClick={toggle}
        className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-xl border border-warm-200 bg-white/90 p-2.5 text-stone-600 shadow-soft backdrop-blur-sm transition hover:bg-warm-50 dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="grid min-h-[calc(100vh-2rem)] place-items-center">
        <div className="card grid w-full max-w-4xl overflow-hidden p-0 shadow-glow md:grid-cols-2 motion-safe:animate-fade-up">
          <div className="relative hidden min-h-[480px] items-center justify-center bg-gradient-to-br from-brand-50 via-warm-50 to-accent-50/40 p-8 md:flex dark:from-stone-900 dark:via-stone-900 dark:to-brand-950/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.15),transparent_50%)]" />
            <img
              src="/illustrations/24070702_bwink_bld_03_single_03.webp"
              alt="HR operations illustration"
              loading="lazy"
              fetchpriority="low"
              decoding="async"
              className="relative z-10 h-full max-h-[400px] w-full rounded-2xl object-contain motion-safe:animate-float-slow"
            />
          </div>

          <form
            onSubmit={submit}
            className="flex flex-col items-center justify-center space-y-5 bg-gradient-to-br from-white via-surface-card to-brand-50/30 p-8 dark:from-stone-900 dark:via-stone-900 dark:to-brand-950/20 sm:p-10"
          >
            <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              HR Core
            </div>
            <div className="text-center">
              <h1 className="font-display text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Welcome back</h1>
              <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Sign in to manage your people &amp; payroll</p>
            </div>

            {error && !isPasswordError && (
              <div className="w-full max-w-[320px] rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 motion-safe:animate-fade-up dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </div>
            )}

            <input
              className="input-field w-full max-w-[320px] motion-safe:animate-fade-up"
              placeholder="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="w-full max-w-[320px] space-y-1.5">
              <div className="relative">
                <input
                  className={`input-field pr-11 motion-safe:animate-fade-up ${
                    isPasswordError
                      ? 'border-rose-400 ring-2 ring-rose-500/20 focus:border-rose-500 focus:ring-rose-500/25 dark:border-rose-600'
                      : ''
                  }`}
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (isPasswordError) setError('')
                  }}
                  required
                  autoComplete="current-password"
                  aria-invalid={isPasswordError}
                  aria-describedby={isPasswordError ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-warm-100 hover:text-stone-700 dark:hover:bg-stone-800"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isPasswordError && (
                <p id="login-password-error" className="text-xs font-medium text-rose-700 dark:text-rose-300">
                  {error}
                </p>
              )}
              <p className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Forgot password?
                </Link>
              </p>
            </div>

            <SmartButton 
              type="submit" 
              className="w-full max-w-[320px] motion-safe:animate-fade-up" 
              loading={loading}
              success={!loading && user !== null}
            >
              Sign in
            </SmartButton>
          </form>
        </div>
      </div>
    </div>
  )
}
