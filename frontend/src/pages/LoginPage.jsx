import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/'

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/80 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 animate-float-slow animate-pulse-soft rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-900/20" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 animate-float-slower animate-pulse-soft rounded-full bg-indigo-200/50 blur-3xl dark:bg-indigo-900/20" />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-4 top-4 rounded-xl border border-slate-200 bg-white/90 p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="grid min-h-[calc(100vh-2rem)] place-items-center">
        <div className="card grid w-full max-w-4xl overflow-hidden p-0 md:grid-cols-2 motion-safe:animate-fade-up">
          <div className="relative hidden min-h-[460px] items-center justify-center bg-white p-5 md:flex">
            <img
              src="/illustrations/24070702_bwink_bld_03_single_03.jpg"
              alt="HR operations illustration"
              className="h-full max-h-[420px] w-full rounded-2xl object-contain transition duration-500 ease-out motion-safe:animate-float-slow"
            />
          </div>
          <form
            onSubmit={submit}
            className="flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-brand-50 via-violet-50 to-indigo-50 p-6 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08),0_16px_40px_rgba(79,70,229,0.18)] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:p-8"
          >
            <h1 className="text-center text-2xl font-bold text-slate-900 transition-all duration-300 motion-safe:animate-fade-up dark:text-white">Sign in to HR Core</h1>
            <p className="text-center text-sm text-slate-500 transition-all duration-300 motion-safe:animate-fade-up dark:text-slate-400">Welcome back. Enter your account credentials.</p>
            {error && <div className="w-full max-w-[320px] rounded-xl bg-red-50 p-3 text-sm text-red-700 motion-safe:animate-fade-up dark:bg-red-950/40 dark:text-red-300">{error}</div>}
            <input
              className="w-full max-w-[320px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none transition duration-300 motion-safe:animate-fade-up focus:-translate-y-0.5 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative w-full max-w-[320px]">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-slate-900 outline-none transition duration-300 motion-safe:animate-fade-up focus:-translate-y-0.5 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
                placeholder="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button className="btn-primary w-full max-w-[320px] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 motion-safe:animate-fade-up" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
