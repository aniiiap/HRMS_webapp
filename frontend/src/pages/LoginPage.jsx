import { Eye, EyeOff, CheckCircle2, Sun, Moon } from 'lucide-react'
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
      <div className="relative grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide">Opening your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen lg:h-screen lg:overflow-hidden font-sans bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row selection:bg-brand-500/30">
      
      {/* Theme Toggle */}
      <button 
        onClick={toggle} 
        className="absolute top-6 right-6 lg:top-8 lg:right-8 z-50 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Global Abstract Backgrounds */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-brand-500/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[900px] h-[900px] bg-indigo-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Left Marketing Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative text-slate-900 dark:text-white flex-col justify-between py-12 lg:py-20 px-8 lg:px-16 xl:px-24 z-10">
        
        {/* Logo (Top) */}
        <div className="w-full max-w-md xl:max-w-lg mx-auto">
          <Link to="/">
            <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {/* Auth/Security Wireframe (Middle) */}
        <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-md xl:max-w-lg mx-auto min-h-0 my-4">
          <div className="relative w-full max-w-[200px] lg:max-w-[220px] transform hover:scale-[1.02] transition-transform duration-700 group">
            
            {/* Main Auth Panel */}
            <div className="relative bg-slate-900/[0.04] dark:bg-white/[0.04] backdrop-blur-md rounded-[20px] border border-slate-900/[0.08] dark:border-white/[0.08] shadow-xl dark:shadow-2xl p-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-400/10 rounded-full blur-[30px] transform translate-x-1/2 -translate-y-1/2" />
              
              {/* Profile Placeholder */}
              <div className="flex justify-center mb-4 relative">
                <div className="w-12 h-12 rounded-full bg-slate-900/5 dark:bg-white/5 border border-slate-900/10 dark:border-white/10 flex items-center justify-center relative overflow-hidden">
                  <div className="w-5 h-5 rounded-full bg-slate-900/20 dark:bg-white/20 mb-2" />
                  <div className="absolute bottom-0 w-10 h-5 bg-slate-900/10 dark:bg-white/10 rounded-t-full" />
                </div>
                {/* Status dot */}
                <div className="absolute bottom-0 right-12 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-50 dark:border-slate-900 animate-pulse" />
              </div>

              {/* Input 1 */}
              <div className="h-7 w-full bg-slate-900/5 dark:bg-white/5 rounded-xl mb-3 border border-slate-900/10 dark:border-white/10 flex items-center px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/20 dark:bg-white/20 mr-2.5" />
                <div className="h-1.5 w-1/2 bg-slate-900/20 dark:bg-white/20 rounded-full" />
              </div>
              
              {/* Input 2 (Password) */}
              <div className="h-7 w-full bg-slate-900/5 dark:bg-white/5 rounded-xl mb-5 border border-slate-900/10 dark:border-white/10 flex items-center px-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900/20 dark:bg-white/20 mr-2.5" />
                <div className="flex gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-slate-900/30 dark:bg-white/30" />
                  ))}
                </div>
              </div>

              {/* Button */}
              <div className="h-8 w-full bg-brand-500/90 rounded-xl flex items-center justify-center border border-brand-400/30 relative overflow-hidden group-hover:bg-brand-500 transition-colors shadow-[0_0_15px_rgba(var(--color-brand-500),0.3)]">
                <div className="h-1.5 w-1/3 bg-white/90 rounded-full" />
              </div>
            </div>

            {/* Floating Security Badge */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-slate-900/5 dark:bg-white/5 backdrop-blur-xl border border-slate-900/10 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl flex items-center justify-center animate-float-delayed rotate-12 group-hover:rotate-0 transition-all duration-700 z-20">
              <div className="relative">
                <div className="w-4 h-3.5 border-[1.5px] border-emerald-400/80 rounded-b-md rounded-t-sm flex items-center justify-center relative mt-1.5 bg-emerald-400/10">
                  <div className="w-1 h-1 bg-emerald-400/80 rounded-full" />
                </div>
                {/* Lock Shackle */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 border-[1.5px] border-b-0 border-emerald-400/80 rounded-t-full transition-all duration-700 group-hover:-translate-y-1 group-hover:border-emerald-300" />
              </div>
            </div>
            
            {/* Floating Notification */}
            <div className="absolute -bottom-3 -left-3 bg-slate-900/10 dark:bg-white/10 backdrop-blur-xl rounded-xl border border-slate-900/20 dark:border-white/20 p-2 shadow-xl dark:shadow-2xl flex items-center gap-2 animate-float z-20">
              <div className="w-5 h-5 rounded-full bg-slate-900/20 dark:bg-white/20 flex items-center justify-center border border-slate-900/30 dark:border-white/30">
                <div className="w-1 h-1 rounded-full bg-slate-900 shadow-[0_0_8px_rgba(0,0,0,0.3)] dark:bg-white dark:shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
              <div>
                <div className="h-1 w-10 bg-slate-900/80 dark:bg-white/80 rounded-full mb-1" />
                <div className="h-1 w-6 bg-slate-900/40 dark:bg-white/40 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Text (Bottom) */}
        <div className="relative z-10 w-full max-w-md xl:max-w-lg mx-auto">
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-4 leading-[1.1]">
            Secure access to your workspace.
          </h1>
          <p className="text-base lg:text-lg text-slate-600 dark:text-white/70 font-normal mb-6 leading-relaxed">
            Sign in to manage your HR, run payroll, and empower your team securely.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={"w-8 h-8 rounded-full border-2 border-slate-50 dark:border-slate-900 bg-slate-900/10 dark:bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-slate-50 dark:ring-slate-900"} style={{ zIndex: 4 - i }}>
                  <img src={"https://api.dicebear.com/7.x/notionists/svg?seed=" + i + "&backgroundColor=transparent"} alt="Avatar" className="w-full h-full rounded-full" />
                </div>
              ))}
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-white/80">
              <span className="font-bold text-slate-900 dark:text-white">4.9/5</span> from over 2,000 reviews
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Side */}
      <div className="w-full lg:w-1/2 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative z-10">
        
        <div className="w-full max-w-md bg-white rounded-[2rem] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
          {/* Subtle card accent */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-400 via-indigo-500 to-brand-400" />
          
          <div className="mb-10 text-center lg:text-left">
            <Link to="/" className="lg:hidden inline-flex justify-center mb-8 w-full">
              <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-10 w-auto object-contain brightness-0" />
            </Link>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Welcome back</h2>
            <p className="text-sm font-medium text-slate-500">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            {error && !isPasswordError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start gap-3 shadow-sm">
                <div className="mt-0.5 bg-rose-100 p-1.5 rounded-full"><EyeOff size={14} className="text-rose-600" /></div>
                <div><span className="font-semibold block mb-0.5">Authentication Failed</span>{error}</div>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 py-3.5 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[13px] font-bold text-brand-600 hover:text-brand-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 py-3.5 text-[15px] font-medium tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-normal focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all duration-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isPasswordError && (
                <p className="text-sm text-rose-500 mt-2 flex items-center gap-1.5 font-medium">
                  <EyeOff size={14} /> Incorrect password. Please try again.
                </p>
              )}
            </div>

            <div className="pt-4">
              <SmartButton type="submit" loading={loading} className="w-full rounded-xl bg-slate-900 px-5 py-4 text-[15px] font-extrabold text-white hover:bg-slate-800 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-slate-900/20 shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)] transition-all duration-300 active:scale-[0.98]">
                Sign in to workspace
              </SmartButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
