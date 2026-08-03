import { Eye, EyeOff, Moon, Sparkles, Sun, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { messageFromError, tokenStore } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SmartButton from '../components/ui/SmartButton'
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
      <div className="relative grid min-h-screen place-items-center bg-stone-50 p-4 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-4 text-stone-600 dark:text-stone-400">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide">Opening your workspace…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-50/40 dark:bg-[#0a0f1c] font-sans">
      {/* Premium Dynamic Outer Background */}
      {/* Soft light grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik00MCAwaC00MHY0MGg0MHoiIGZpbGw9InRyYW5zcGFyZW50Ii8+CjxwYXRoIGQ9Ik00MCAwaC00MHYxdjM5aDF2LTM5aDM5eiIgZmlsbD0icmdiYSgxMDAsIDEwMCwgMTAwLCAwLjAzKSIvPgo8L3N2Zz4=')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik00MCAwaC00MHY0MGg0MHoiIGZpbGw9InRyYW5zcGFyZW50Ii8+CjxwYXRoIGQ9Ik00MCAwaC00MHYxdjM5aDF2LTM5aDM5eiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPgo8L3N2Zz4=')] opacity-50" />
      
      {/* Floating Soft Orbs for lighting */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-brand-400/20 dark:bg-brand-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen motion-safe:animate-blob pointer-events-none" />
      <div className="absolute top-[20%] right-[15%] w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-[130px] mix-blend-multiply dark:mix-blend-screen motion-safe:animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute -bottom-32 left-[30%] w-[500px] h-[500px] bg-accent-400/20 dark:bg-accent-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen motion-safe:animate-blob animation-delay-4000 pointer-events-none" />

      <button
        type="button"
        onClick={toggle}
        className="fixed right-6 top-6 z-50 rounded-full border border-white/20 bg-white/50 p-3 text-stone-600 shadow-lg backdrop-blur-md transition-all hover:bg-white hover:scale-110 dark:border-stone-800/50 dark:bg-stone-900/50 dark:text-stone-300 dark:hover:bg-stone-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative z-10 w-full max-w-5xl mx-4 overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] backdrop-blur-xl dark:border-stone-800/50 dark:bg-stone-900/70 grid md:grid-cols-2 motion-safe:animate-fade-up">
        
        {/* Left Section - Hero Image & Branding */}
        <div className="relative hidden md:flex flex-col justify-center items-center p-8 bg-stone-900 overflow-hidden dark:bg-stone-950 min-h-[480px]">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          
          {/* Animated Glowing Orbs */}
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-brand-500/30 rounded-full blur-[100px] animate-blob" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent-500/30 rounded-full blur-[100px] animate-blob animation-delay-2000" />

          {/* Typography */}
          <div className="relative z-10 w-full text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-md border border-white/10 shadow-lg mb-4">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              HR Core Platform
            </div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold leading-tight text-white mb-3">
              Empower your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-accent-300">workforce.</span>
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed max-w-[280px] mx-auto">
              Manage your people, automate payroll, and track attendance in one unified workspace.
            </p>
          </div>

          {/* Floating Illustration in a Glass Frame */}
          <div className="relative z-10 w-full max-w-[280px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl p-6 motion-safe:animate-float-slow">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/10 to-transparent rounded-3xl" />
            <img
              src="/illustrations/24070702_bwink_bld_03_single_03.webp"
              alt="HR operations illustration"
              loading="lazy"
              fetchpriority="high"
              decoding="async"
              className="relative z-10 w-full h-auto object-contain drop-shadow-2xl brightness-110 contrast-125"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <div className="w-full max-w-md mx-auto">
            <h2 className="font-display text-3xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">Welcome back</h2>
            <p className="text-stone-500 dark:text-stone-400 mb-8">Please enter your details to sign in.</p>

            <form onSubmit={submit} className="space-y-5">
              {error && !isPasswordError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-800 backdrop-blur-sm motion-safe:animate-fade-up dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                  <div className="flex gap-2">
                    <span className="font-semibold">Oops!</span>
                    {error}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <input
                  className="w-full rounded-xl border border-stone-200 bg-white/50 px-4 py-3 text-stone-900 placeholder-stone-400 backdrop-blur-sm transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-stone-700/50 dark:bg-stone-900/50 dark:text-white dark:focus:bg-stone-900"
                  placeholder="Work Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    className={`w-full rounded-xl border px-4 py-3 text-stone-900 placeholder-stone-400 backdrop-blur-sm transition-all focus:outline-none focus:ring-4 dark:text-white ${
                      isPasswordError
                        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:bg-white focus:ring-rose-500/20 dark:border-rose-600/50 dark:bg-rose-900/10'
                        : 'border-stone-200 bg-white/50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/10 dark:border-stone-700/50 dark:bg-stone-900/50 dark:focus:bg-stone-900'
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
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors dark:hover:bg-stone-800 dark:hover:text-stone-300"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isPasswordError && (
                  <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400 ml-1">
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="pt-4">
                <SmartButton
                  type="submit"
                  loading={loading}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-brand-500/25 active:scale-[0.98]"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    Sign in to workspace
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </SmartButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
