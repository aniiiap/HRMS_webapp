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
          <p className="text-sm font-medium tracking-wide">Opening your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden font-sans bg-slate-50 dark:bg-[#0b0f19] flex flex-col lg:flex-row selection:bg-brand-500/30">
      
      {/* Left Marketing Side (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-700 overflow-hidden text-white flex-col justify-between p-8 lg:p-10">
        {/* Abstract Backgrounds inside Left Side */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-400/20 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/4 translate-y-1/4" />
        
        <div className="relative z-10">
          <Link to="/">
            <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {/* Custom CSS Glassmorphism Wireframe */}
        <div className="relative z-10 flex-1 flex items-center justify-center w-full py-4 max-w-[90%] mx-auto">
          <div className="relative w-full aspect-[4/3] max-w-[260px] lg:max-w-[280px] transform hover:scale-[1.02] transition-transform duration-700 group">
            
            {/* Main Glass Panel */}
            <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-md rounded-[24px] border border-white/[0.15] shadow-2xl flex overflow-hidden">
              
              {/* Sidebar */}
              <div className="w-1/3 bg-white/5 border-r border-white/10 p-3.5 flex flex-col gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 mb-1" />
                <div className="space-y-2.5">
                  <div className="h-1.5 w-full bg-white/30 rounded-full" />
                  <div className="h-1.5 w-5/6 bg-white/20 rounded-full" />
                  <div className="h-1.5 w-4/6 bg-white/20 rounded-full" />
                  <div className="h-1.5 w-full bg-white/20 rounded-full" />
                </div>
                <div className="mt-auto h-20 w-full bg-gradient-to-t from-white/10 to-transparent rounded-lg border border-white/10" />
              </div>

              {/* Main Content */}
              <div className="flex-1 p-4 flex flex-col gap-3.5">
                {/* Header */}
                <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                  <div className="h-2.5 w-1/3 bg-white/30 rounded-full" />
                  <div className="flex gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/20" />
                    <div className="w-5 h-5 rounded-full bg-white/20" />
                  </div>
                </div>

                {/* Stats Grid - Unified Mono theme */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 flex flex-col gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-sm bg-white/70" />
                    </div>
                    <div className="h-2.5 w-1/2 bg-white/40 rounded mt-0.5" />
                  </div>
                  <div className="bg-white/5 rounded-xl border border-white/10 p-2.5 flex flex-col gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-sm bg-white/70" />
                    </div>
                    <div className="h-2.5 w-1/2 bg-white/40 rounded mt-0.5" />
                  </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-3 flex flex-col justify-end gap-1.5 mt-1">
                  <div className="flex items-end justify-between h-full gap-1.5 opacity-80">
                    {[40, 70, 45, 90, 65, 30].map((h, i) => (
                      <div key={i} className="w-full bg-white/40 rounded-t-[2px] relative group-hover:bg-white/60 transition-colors duration-500" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Notification */}
            <div className="absolute -top-5 -right-5 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-2.5 shadow-2xl flex items-center gap-2.5 animate-float z-20">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              </div>
              <div>
                <div className="h-1.5 w-12 bg-white/60 rounded-full mb-1" />
                <div className="h-1 w-8 bg-white/30 rounded-full" />
              </div>
            </div>
            
            {/* Floating Avatar Card */}
            <div className="absolute -bottom-5 -left-5 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 p-2.5 shadow-2xl flex items-center gap-2.5 animate-float-delayed z-20">
              <div className="flex -space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-white/30 border border-white/20 backdrop-blur-sm" />
                <div className="w-8 h-8 rounded-full bg-white/20 border border-white/20 backdrop-blur-sm" />
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm" />
              </div>
            </div>
            
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Everything you need to manage your team.
          </h1>
          <p className="text-lg text-white/80 font-medium mb-6 leading-relaxed">
            From seamless onboarding to smart payroll and attendance. Join thousands of forward-thinking companies streamlining their HR.
          </p>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-brand-600 bg-white/20 backdrop-blur-md flex items-center justify-center`} style={{ zIndex: 4 - i }}>
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=transparent`} alt="Avatar" className="w-full h-full rounded-full" />
                </div>
              ))}
            </div>
            <div className="text-sm font-medium">
              <span className="font-bold">4.9/5</span> from over 2,000 reviews
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Side */}
      <div className="w-full lg:w-1/2 flex-1 flex items-center justify-center p-6 lg:p-8 relative">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-100 to-transparent dark:from-brand-900/20 pointer-events-none opacity-50" />
        
        <div className="relative w-full max-w-md z-10">
          <div className="mb-10 text-center lg:text-left">
            <Link to="/" className="lg:hidden inline-block mb-8">
              <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-12 w-auto object-contain" />
            </Link>
            <h2 className="text-[2rem] font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">Welcome back</h2>
            <p className="text-base text-slate-500 dark:text-slate-400">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && !isPasswordError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200 flex items-start gap-3">
                <div className="mt-0.5 bg-rose-100 dark:bg-rose-900/50 p-1 rounded-full"><EyeOff size={14} className="text-rose-600 dark:text-rose-400" /></div>
                <div><span className="font-semibold block mb-0.5">Authentication Failed</span>{error}</div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white px-5 py-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:hover:bg-slate-900 dark:placeholder:text-slate-600 shadow-sm transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white px-5 py-3.5 text-base tracking-widest text-slate-900 placeholder:text-slate-300 placeholder:tracking-normal focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white dark:hover:bg-slate-900 dark:placeholder:text-slate-600 shadow-sm transition-all duration-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isPasswordError && (
                <p className="text-sm text-rose-500 mt-1 flex items-center gap-1.5">
                  <EyeOff size={14} /> Incorrect password. Please try again.
                </p>
              )}
            </div>

            <SmartButton type="submit" loading={loading} className="w-full rounded-2xl bg-slate-900 dark:bg-brand-600 px-5 py-4 text-[15px] font-bold text-white hover:bg-slate-800 dark:hover:bg-brand-500 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-slate-900/10 dark:focus:ring-brand-500/20 shadow-xl shadow-slate-900/20 transition-all duration-300 active:scale-[0.98]">
              Sign in to workspace
            </SmartButton>
          </form>
        </div>
      </div>
    </div>
  )
}
