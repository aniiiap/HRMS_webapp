import { Eye, EyeOff, Moon, Sparkles, Sun, ArrowRight, CheckCircle2, Users, Building, ShieldCheck, Zap, LineChart, PieChart, Smartphone, Wallet, DollarSign, Heart } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { messageFromError, tokenStore } from '../api/client'
import { useAuth } from '../context/AuthContext'
import SmartButton from '../components/ui/SmartButton'
import { useTheme } from '../context/ThemeContext'

const FEATURES = [
  {
    title: 'Core HR & People',
    description: 'Centralize your employee data, documents, and directories in one secure platform.',
    icon: Users,
    cardGradient: 'bg-gradient-to-b from-emerald-500 to-emerald-800',
    shadowColor: 'shadow-emerald-900/40',
    Visual: () => (
      <div className="mt-8 flex flex-col gap-3 opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-1">
        <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-xl border border-white/5 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-white/30 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-3/4 bg-white/40 rounded-full" />
            <div className="h-1.5 w-1/2 bg-white/20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5 backdrop-blur-sm ml-4">
          <div className="w-8 h-8 rounded-full bg-white/20 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-2/3 bg-white/30 rounded-full" />
            <div className="h-1.5 w-1/3 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Smart Payroll',
    description: 'Automate salary processing, tax calculations, and compliance without the headache.',
    icon: Zap,
    cardGradient: 'bg-gradient-to-b from-indigo-500 to-indigo-800',
    shadowColor: 'shadow-indigo-900/40',
    Visual: () => (
      <div className="mt-8 flex items-end gap-2 h-20 opacity-60 group-hover:opacity-100 transition-all duration-500">
        <div className="w-full bg-white/20 rounded-t-lg h-[40%] group-hover:h-[50%] transition-all duration-700" />
        <div className="w-full bg-white/40 rounded-t-lg h-[60%] group-hover:h-[75%] transition-all duration-700 delay-75" />
        <div className="w-full bg-white/20 rounded-t-lg h-[30%] group-hover:h-[40%] transition-all duration-700 delay-150" />
        <div className="w-full bg-white/60 rounded-t-lg h-[80%] group-hover:h-[100%] transition-all duration-700 delay-200 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-ping" />
        </div>
      </div>
    )
  },
  {
    title: 'Time & Attendance',
    description: 'Track clock-ins, manage shifts, and handle leave requests with automated workflows.',
    icon: ShieldCheck,
    cardGradient: 'bg-gradient-to-b from-rose-500 to-rose-800',
    shadowColor: 'shadow-rose-900/40',
    Visual: () => (
      <div className="mt-8 grid grid-cols-5 gap-2 opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105 origin-left">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className={`aspect-square rounded-md ${
              i === 7 ? 'bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse' 
              : i < 7 ? 'bg-white/30' 
              : 'bg-white/10'
            }`} 
          />
        ))}
      </div>
    )
  },
  {
    title: 'Performance & Growth',
    description: 'Align teams with goals, conduct reviews, and foster continuous feedback.',
    icon: LineChart,
    cardGradient: 'bg-gradient-to-b from-amber-500 to-amber-800',
    shadowColor: 'shadow-amber-900/40',
    Visual: () => (
      <div className="mt-8 flex flex-col gap-4 opacity-60 group-hover:opacity-100 transition-all duration-500">
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-white/70 h-full rounded-full w-[65%] group-hover:w-[85%] transition-all duration-1000 ease-out" />
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-white/40 h-full rounded-full w-[40%] group-hover:w-[60%] transition-all duration-1000 ease-out delay-100" />
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-white/90 h-full rounded-full w-[85%] group-hover:w-[100%] transition-all duration-1000 ease-out delay-200" />
        </div>
      </div>
    )
  },
]

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
  const loginRef = useRef(null)

  useEffect(() => {
    if (loginRef.current) {
      setTimeout(() => {
        loginRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [])

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
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white overflow-x-hidden selection:bg-brand-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-md border-b border-slate-200/50 dark:border-white/10 transition-colors">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-brand-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-lg shadow-brand-500/30">
            <Building size={20} className="fill-white/20" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">WorkSphere</span>
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 px-6 lg:px-12 w-full overflow-hidden">
        {/* Background Image & Overlays */}
        <div className="absolute inset-0 z-0 hidden lg:block">
          <img 
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2000&auto=format&fit=crop" 
            alt="Office background" 
            className="w-full h-full object-cover object-center opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-slate-50/30 dark:from-[#0b0f19]/95 dark:via-[#0b0f19]/80 dark:to-[#0b0f19]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-[#0b0f19]" />
        </div>

        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/20 dark:bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 lg:gap-16 items-center">
          
          {/* Hero Content */}
          <div className="max-w-2xl relative z-20">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50/80 dark:bg-teal-500/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-800 dark:text-teal-300 ring-1 ring-inset ring-teal-600/20 dark:ring-teal-500/30 shadow-sm mb-8 motion-safe:animate-fade-up">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              The Next-Gen HR Platform
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-2 lg:mb-6 motion-safe:animate-fade-up drop-shadow-sm" style={{ animationDelay: '100ms' }}>
              Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-400">people.</span><br/>
              Designed for growth.
            </h1>
            
            <p className="hidden md:block text-lg lg:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed motion-safe:animate-fade-up max-w-xl" style={{ animationDelay: '200ms' }}>
              Automate your HR workflows, run payroll flawlessly, and empower your team with a platform they'll actually love using.
            </p>
            
            <div className="hidden md:flex flex-col sm:flex-row gap-4 mb-10 motion-safe:animate-fade-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Free Setup
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Cancel Anytime
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 24/7 Support
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4 motion-safe:animate-fade-up" style={{ animationDelay: '400ms' }}>
              <div className="flex -space-x-3">
                <img className="w-10 h-10 rounded-full border-2 border-slate-50 dark:border-[#0b0f19] object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" alt="User 1" />
                <img className="w-10 h-10 rounded-full border-2 border-slate-50 dark:border-[#0b0f19] object-cover" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" alt="User 2" />
                <img className="w-10 h-10 rounded-full border-2 border-slate-50 dark:border-[#0b0f19] object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="User 3" />
                <img className="w-10 h-10 rounded-full border-2 border-slate-50 dark:border-[#0b0f19] object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="User 4" />
                <div className="flex w-10 h-10 items-center justify-center rounded-full border-2 border-slate-50 dark:border-[#0b0f19] bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                  +2k
                </div>
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Trusted by 2,000+ <br/>HR professionals.
              </div>
            </div>
          </div>

          {/* Embedded Login Form */}
          <div ref={loginRef} className="relative w-full max-w-md mx-auto lg:ml-auto motion-safe:animate-fade-up z-20" style={{ animationDelay: '200ms' }}>
            <div className="relative rounded-[2.5rem] shadow-2xl shadow-slate-900/20 dark:shadow-black/40">
              <div className="relative bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 rounded-[2.5rem] p-8 lg:p-10 h-full w-full overflow-hidden">
              
              <div className="mb-8">
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Work Email</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-brand-500"
                    placeholder="name@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                  <div className="relative">
                    <input
                      className={`w-full rounded-xl border px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-4 dark:text-white ${
                        isPasswordError
                          ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-600 dark:bg-rose-900/20'
                          : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-brand-500'
                      }`}
                      placeholder="••••••••"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
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

                <div className="flex justify-end pt-1">
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
      </section>

      {/* Trusted By Section */}
      <section className="hidden md:block py-12 border-y border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-8">
            Trusted by modern forward-thinking companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {['Acme Corp', 'GlobalTech', 'Nexus Industries', 'Quantum Data', 'Stark Innovations'].map((brand) => (
              <div key={brand} className="text-xl md:text-2xl font-bold font-display tracking-tight text-slate-800 dark:text-slate-200">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="hidden md:block py-24 px-6 lg:px-12 max-w-7xl mx-auto relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Everything you need to run your team effortlessly.
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            From onboarding to offboarding, and everything in between. We provide the tools so you can focus on building a great culture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-12">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            const Visual = feature.Visual
            return (
              <div 
                key={idx} 
                className={`group relative p-8 rounded-[32px] overflow-hidden ${feature.cardGradient} shadow-xl hover:shadow-2xl ${feature.shadowColor} transition-all duration-500 hover:-translate-y-2 flex flex-col h-[420px] ${idx % 2 === 1 ? 'lg:mt-12' : ''}`}
              >
                
                <div className="relative z-10 flex flex-col h-full text-white">
                  <div className="mb-6 group-hover:scale-110 transition-transform duration-500 origin-left">
                    <Icon size={28} strokeWidth={2.5} className="text-white/95" />
                  </div>
                  
                  <h3 className="text-[20px] font-bold tracking-tight mb-3 leading-tight">{feature.title}</h3>
                  <p className="text-[14px] text-white/90 leading-relaxed font-medium">
                    {feature.description}
                  </p>

                  <Visual />

                  <div className="mt-auto pt-6">
                    <div className="flex items-center text-[13px] font-bold text-white hover:text-white/80 transition-colors">
                      Learn More <ArrowRight size={14} className="ml-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* UI Showcase Image Section */}
      <section className="hidden md:block py-24 px-6 lg:px-12 bg-slate-900 text-white relative overflow-hidden">
        {/* Abstract Backgrounds */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Beautifully designed for everyone.</h2>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Whether you are an administrator running complex payroll, or an employee requesting time off, the experience is intuitive, fast, and stunning.
            </p>
            <ul className="space-y-4 text-slate-300">
              <li className="flex items-center gap-3">
                <PieChart className="text-brand-400" />
                Real-time dashboard analytics
              </li>
              <li className="flex items-center gap-3">
                <Smartphone className="text-brand-400" />
                Mobile responsive workspace
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="text-brand-400" />
                Enterprise-grade security
              </li>
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-3xl blur-2xl opacity-30" />
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80" 
              alt="Team collaborating" 
              className="relative z-10 w-full h-auto rounded-3xl shadow-2xl border border-white/10 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Redesigned Payroll Section */}
      <section className="hidden md:block py-32 px-6 lg:px-12 bg-slate-50 dark:bg-slate-900/40 relative border-b border-slate-200 dark:border-slate-800/50 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          
          <div className="order-2 lg:order-1 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/20 to-brand-500/20 rounded-full blur-[80px]" />
            
            <div className="relative z-10 w-full rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transform hover:-translate-y-2 transition-transform duration-500">
              <img 
                src="https://images.unsplash.com/photo-1709880945165-d2208c6ad2ec?auto=format&fit=crop&w=1200&q=80" 
                alt="Premium Smart Payroll Tech Setup" 
                className="w-full h-[450px] lg:h-[500px] object-cover"
              />
            </div>
          </div>

          <div className="order-1 lg:order-2 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-600/20 mb-6">
              Smart Payroll
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-slate-900 dark:text-white leading-tight">
              Run payroll in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-brand-500">minutes</span>, not days.
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
              Say goodbye to manual data entry, spreadsheets, and compliance headaches. Our automated payroll system handles taxes, deductions, and direct deposits with zero errors.
            </p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="mt-1 w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Automated Compliance</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">We automatically calculate and file local, state, and federal taxes so you never have to worry about penalties.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="mt-1 w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Building className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Benefits Syncing</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Health insurance, 401(k), and other benefits are automatically deducted from employee paychecks seamlessly.</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="hidden md:block py-32 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
           <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=2000&q=80" className="w-full h-full object-cover opacity-30 dark:opacity-20" alt="CTA background" />
           <div className="absolute inset-0 bg-teal-900/90 dark:bg-[#0b0f19]/95 backdrop-blur-sm" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-6xl font-extrabold text-white mb-6">Ready to transform your workplace?</h2>
          <p className="text-xl text-teal-100 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of modern companies who have upgraded their HR stack to WorkSphere. It takes less than 5 minutes to get started.
          </p>
          <button 
            onClick={() => {
              if (loginRef.current) {
                loginRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }
            }}
            className="rounded-full bg-emerald-500 text-white hover:bg-emerald-400 px-10 py-5 text-lg font-bold shadow-xl shadow-emerald-900/20 hover:-translate-y-1 transition-all"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hidden md:block py-12 px-6 lg:px-12 border-t border-slate-200 dark:border-white/10 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} WorkSphere. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
