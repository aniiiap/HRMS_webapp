import React from 'react';
import { ShieldCheck, BarChart3, Users, Clock, Calendar, Mail, FileText, Headphones, Calculator, IndianRupee, CheckCircle2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProductsPage() {
  const modules = [
    {
      title: 'Core HR & Employee Directory',
      desc: 'Maintain a single source of truth for all employee data. Track personal details, job history, and documents securely.',
      icon: <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      color: 'bg-indigo-50 dark:bg-indigo-900/30'
    },
    {
      title: 'Time & Attendance',
      desc: 'Track hours worked with precision. Support for web clock-in, biometric integration, and flexible shift scheduling.',
      icon: <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      color: 'bg-blue-50 dark:bg-blue-900/30'
    },
    {
      title: 'Automated Payroll',
      desc: 'Run payroll in minutes not days. Automatically calculates deductions, taxes, and generates compliant payslips.',
      icon: <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-50 dark:bg-emerald-900/30'
    },
    {
      title: 'Leave & Time-off',
      desc: 'Customizable leave policies, automated accruals, and a multi-level approval workflow that managers love.',
      icon: <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      color: 'bg-amber-50 dark:bg-amber-900/30'
    },
    {
      title: 'Helpdesk & Ticketing',
      desc: 'Internal support made easy. Let employees raise HR or IT requests and track them to resolution.',
      icon: <Headphones className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      color: 'bg-rose-50 dark:bg-rose-900/30'
    },
    {
      title: 'Letter & Document Generation',
      desc: 'Create beautiful templates for offer letters, relieving letters, and more, instantly populated with employee data.',
      icon: <FileText className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />,
      color: 'bg-cyan-50 dark:bg-cyan-900/30'
    },
    {
      title: 'Enterprise Security',
      desc: 'Multi-tenant architecture ensuring complete data isolation, role-based access control, and comprehensive audit trails.',
      icon: <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      color: 'bg-purple-50 dark:bg-purple-900/30'
    },
    {
      title: 'Automated Communications',
      desc: 'Built-in email notifications for approvals, announcements, and payroll updates to keep everyone in the loop.',
      icon: <Mail className="h-6 w-6 text-orange-600 dark:text-orange-400" />,
      color: 'bg-orange-50 dark:bg-orange-900/30'
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 pt-24 pb-24 lg:pt-32 lg:pb-32">
        
        {/* Soft Pastel Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-pink-300/30 dark:bg-pink-900/20 blur-[120px]"></div>
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-amber-200/30 dark:bg-amber-900/20 blur-[120px]"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-blue-300/30 dark:bg-blue-900/20 blur-[120px]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Text & CTA */}
            <div className="text-left max-w-2xl">
              <div className="text-brand-600 dark:text-brand-400 font-bold tracking-wider text-sm uppercase mb-4 animate-fade-up">
                HR & Payroll Software
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6 animate-fade-up stagger-1">
                Everything you need <span className="text-brand-500">in one platform</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 animate-fade-up stagger-2 leading-relaxed">
                GlobalWorkSphere eliminates the need for fragmented tools. Compute salaries, sync attendance, and manage your entire workforce — <span className="italic text-brand-600 dark:text-brand-400 font-medium">all from a single, unified dashboard.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-fade-up stagger-3">
                <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-1">
                  Start Your Free Trial <span className="ml-2">→</span>
                </Link>
                <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-600 transition-all hover:-translate-y-1">
                  Book a Demo
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 animate-fade-up stagger-4">
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Automated Tax Filing
                </div>
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> One-click Bank Payouts
                </div>
                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 dark:border-slate-700/50">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> 100% Data Security
                </div>
              </div>
            </div>

            {/* Right Column: Mock Dashboard */}
            <div className="relative animate-fade-up stagger-2 lg:ml-8">
              <div 
                className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden"
                style={{ transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)' }}
              >
                {/* Browser Top Bar */}
                <div className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/60 dark:border-slate-700/60 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <div className="mx-auto bg-white dark:bg-slate-900 rounded-md px-4 py-1 text-xs text-slate-500 font-medium border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Run Payroll - Current Cycle
                  </div>
                </div>
                {/* Mock UI Content */}
                <div className="p-6 flex flex-col gap-6">
                  {/* Top stats row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">Active Staff</div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">1,450</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">Payroll Total</div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">$3.2M</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mb-1">Deductions</div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">$640K</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-1">Accuracy</div>
                      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">100%</div>
                    </div>
                  </div>
                  {/* Chart area mock */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 p-4 h-48 flex items-end gap-2 px-8">
                    {[40, 70, 45, 90, 65, 85, 100, 55, 75, 40, 80, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-brand-400/80 dark:bg-brand-500/80 rounded-t-sm transition-all hover:bg-brand-500" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Floating decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-500 rounded-2xl shadow-xl shadow-brand-500/30 rotate-12 flex items-center justify-center animate-float-slow z-20">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-float-slower z-20">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Cards Section */}
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {modules.map((m, i) => {
            // Cycle through stagger classes 1-4
            const staggerClass = `stagger-${(i % 4) + 1}`;
            return (
              <div 
                key={i} 
                className={`group animate-fade-up ${staggerClass} relative p-8 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-2xl hover:shadow-brand-500/20 transition-all duration-500 transform hover:-translate-y-3 overflow-hidden cursor-pointer`}
              >
                {/* Glow reveal on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-transparent dark:from-brand-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                <div className={`relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center mb-8 shadow-sm ${m.color} group-hover:scale-110 group-hover:-translate-y-1 group-hover:rotate-3 transition-all duration-500`}>
                  {m.icon}
                </div>
                <h3 className="relative z-10 text-xl font-bold text-slate-900 dark:text-white mb-4 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{m.title}</h3>
                <p className="relative z-10 text-slate-600 dark:text-slate-400 leading-relaxed">{m.desc}</p>
                
                {/* Decorative circle that expands on hover */}
                <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-brand-50 dark:bg-brand-900/10 opacity-0 group-hover:opacity-100 group-hover:scale-[2.5] transition-all duration-700 ease-out pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* Six Checkpoints Section */}
        <div className="mt-32 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
              Six checkpoints from inputs to money in accounts
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              Every stage is explicit, reviewable and reversible — until you press disburse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 transition-colors group">
              <div className="absolute top-8 right-8 text-5xl font-black text-slate-200 dark:text-slate-700/50 group-hover:text-brand-100 dark:group-hover:text-brand-900/50 transition-colors">01</div>
              <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center mb-6 text-brand-600 dark:text-brand-400">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Sync Attendance & Leave</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">Inputs are gathered automatically from biometrics and self-service portals to calculate payable days.</p>
            </div>
            
            {/* Step 2 */}
            <div className="relative p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-colors group">
              <div className="absolute top-8 right-8 text-5xl font-black text-slate-200 dark:text-slate-700/50 group-hover:text-indigo-100 dark:group-hover:text-indigo-900/50 transition-colors">02</div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <Calculator className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Handle Deductions</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">Statutory compliances like PF, ESI, PT, and TDS are calculated precisely with built-in formulas.</p>
            </div>

            {/* Step 3 */}
            <div className="relative p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors group">
              <div className="absolute top-8 right-8 text-5xl font-black text-slate-200 dark:text-slate-700/50 group-hover:text-blue-100 dark:group-hover:text-blue-900/50 transition-colors">03</div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Review Salary Register</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">A detailed, reviewable draft is generated. Check every number before moving forward.</p>
            </div>

            {/* Step 4 */}
            <div className="relative p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition-colors group">
              <div className="absolute top-8 right-8 text-5xl font-black text-slate-200 dark:text-slate-700/50 group-hover:text-emerald-100 dark:group-hover:text-emerald-900/50 transition-colors">04</div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">One-Tap Approvals</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">Route the finalized payroll batch to managers and finance heads for a final sign-off.</p>
            </div>

            {/* Step 5 - Highlighted */}
            <div className="relative p-8 rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-brand-500 shadow-xl shadow-brand-500/15 transform scale-105 z-10">
              <div className="absolute top-8 right-8 text-5xl font-black text-brand-100 dark:text-brand-900/40">05</div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 flex items-center justify-center mb-6 text-white shadow-md">
                <IndianRupee className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Disburse Salaries</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">Press disburse to securely route money directly into your employees' bank accounts in one click.</p>
            </div>

            {/* Step 6 */}
            <div className="relative p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition-colors group">
              <div className="absolute top-8 right-8 text-5xl font-black text-slate-200 dark:text-slate-700/50 group-hover:text-purple-100 dark:group-hover:text-purple-900/50 transition-colors">06</div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                <Send className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Distribute Payslips</h3>
              <p className="text-slate-600 dark:text-slate-400 relative z-10">Payslips and tax forms are automatically generated and delivered to employees instantly.</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-10 md:p-16 text-center border border-amber-100 dark:border-amber-800/50 mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-left">
            <div className="bg-purple-600 rounded-full p-4 shrink-0 shadow-lg shadow-purple-500/30">
              <ShieldCheck className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Want to explore GlobalWorkSphere?</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Experience the platform with no commitments and no upfront cost.
              </p>
            </div>
          </div>
          <Link to="/demo" className="shrink-0 px-8 py-4 text-lg font-semibold rounded-full text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 hover:border-brand-600 hover:text-brand-600 dark:hover:border-brand-400 dark:hover:text-brand-400 transition-colors bg-white dark:bg-slate-800">
            Request a Live Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
