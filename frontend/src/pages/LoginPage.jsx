import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { messageFromError, tokenStore } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SmartButton from '../components/ui/SmartButton'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { login, user, loading: authLoading, defaultHome } = useAuth()
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
      <div className="relative grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide">Opening your workspace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-6 selection:bg-brand-500/30 relative overflow-hidden">
      
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Embedded Login Form */}
      <div className="relative w-full max-w-md mx-auto z-20">
        <div className="relative rounded-[2.5rem] shadow-2xl shadow-slate-900/10 dark:shadow-black/40">
          <div className="relative bg-white dark:bg-[#0b0f19] backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 lg:p-10 h-full w-full overflow-hidden">
          
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome back</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Sign in to your workspace to continue.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && !isPasswordError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                <span className="font-semibold mr-2">Oops!</span>{error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Work Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-brand-400 dark:focus:bg-slate-900 dark:focus:ring-brand-400/10 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className={`w-full rounded-xl border ${isPasswordError ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 bg-rose-50' : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/10 bg-slate-50 focus:bg-white'} px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:placeholder:text-slate-600 transition-all`}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex="-1"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isPasswordError && (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
                &larr; Back home
              </Link>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <div className="pt-2">
              <SmartButton
                type="submit"
                loading={loading}
                className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Sign in to workspace
              </SmartButton>
            </div>
          </form>
        </div>
        </div>
      </div>

    </div>
  )
}
