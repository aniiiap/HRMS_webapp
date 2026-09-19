import React, { useRef, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ChevronRight, Zap, Building, Play, Users, Calendar, ShieldCheck, Smartphone, PieChart, Star, ChevronDown, Lock, Server, Activity, TrendingUp, Workflow, CheckSquare, Clock, Edit3, Briefcase, FileSignature, Globe, Database, Key, Search, LayoutGrid, DollarSign, Ban, Bell } from 'lucide-react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import CountUp from 'react-countup'
import { useInView } from 'react-intersection-observer'

const fadeUpVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left focus:outline-none group"
      >
        <span className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-slate-600 dark:text-slate-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PayrollDeepDiveSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const step = useTransform(scrollYProgress, [0, 0.33, 0.66], [0, 1, 2], { clamp: true });
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    return step.onChange((v) => setCurrentStep(Math.floor(v)));
  }, [step]);

  const steps = [
    { title: "Complete visibility at a glance", desc: "Get a real-time overview of your entire organization. Track daily attendance, monitor leave requests, and analyze headcount trends all from one unified dashboard." },
    { title: "Frictionless global payroll", desc: "Create and manage payroll runs with absolute precision. Review periods, finalize payouts, and ensure compliance for your entire workforce in minutes." },
    { title: "Intelligent attendance tracking", desc: "Monitor team availability with a comprehensive visual calendar. Easily track present days, leaves, weekends, and half-days to streamline scheduling." }
  ];

  return (
    <section ref={containerRef} className="relative h-[300vh] bg-white dark:bg-[#0A1622] border-b border-slate-200 dark:border-slate-800">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="max-w-[1400px] w-full mx-auto px-6 lg:px-12 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16">
          
          {/* Left Text */}
          <div className="flex flex-col justify-center">
            <h2 className="text-sm font-bold tracking-widest text-[#0F7A6C] dark:text-[#14B8A6] uppercase mb-4">Core Platform</h2>
            <h3 className="text-4xl lg:text-5xl font-extrabold text-[#0D1B2A] dark:text-white tracking-tight mb-12 leading-[1.1]">
              Everything you need to <br/>manage your workforce.
            </h3>

            <div className="space-y-8 relative pl-8 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
              {steps.map((s, i) => (
                <div key={i} className={`relative transition-all duration-500 ${currentStep === i ? 'opacity-100 translate-x-2' : 'opacity-30 grayscale'}`}>
                  <div className={`absolute top-1 -left-[37px] w-6 h-6 rounded-full border-4 border-white dark:border-[#0A1622] flex items-center justify-center transition-colors duration-500 ${currentStep === i ? 'bg-[#14B8A6]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                  <h4 className="text-xl font-bold text-[#0D1B2A] dark:text-white mb-2">{s.title}</h4>
                  <p className="text-[#5B7065] dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual UI Mockup */}
          <div className="relative flex items-center justify-center">
             <div className="w-full max-w-[800px] aspect-[16/10] bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative transition-all duration-700">
               
               {/* Browser Header */}
               <div className="h-8 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0A1622] px-4 flex items-center">
                 <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"/><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"/><div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"/></div>
               </div>
               
               <div className="flex-1 flex overflow-hidden">
                 {/* Sidebar */}
                 <div className="w-[140px] md:w-[160px] shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col p-3 md:p-4 z-10 relative">
                    <div className="flex items-center gap-1.5 mb-6">
                       <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-[20px] md:h-[24px] w-auto object-contain -ml-1" />
                    </div>
                    
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg px-2 py-1.5 mb-6 flex items-center gap-1.5 text-[9px] text-slate-400 border border-slate-200 dark:border-slate-700/50">
                      <Search className="w-3 h-3"/> Search...
                    </div>
                    
                    <div className="text-[8px] font-bold text-slate-400 mb-2 uppercase tracking-wider">General</div>
                    <div className={`flex items-center gap-2 p-1.5 rounded-lg mb-1 transition-colors ${currentStep === 0 ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                       <LayoutGrid className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Overview</span>
                    </div>
                    <div className={`flex items-center gap-2 p-1.5 rounded-lg mb-1 transition-colors ${currentStep === 1 ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                       <DollarSign className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Payroll</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg mb-1 text-slate-600 dark:text-slate-400">
                       <Users className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Employees</span>
                    </div>
                    <div className={`flex items-center gap-2 p-1.5 rounded-lg mb-1 transition-colors ${currentStep === 2 ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}>
                       <Calendar className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Attendance</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg mb-4 text-slate-600 dark:text-slate-400">
                       <Bell className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Announcements</span>
                    </div>

                    <div className="text-[8px] font-bold text-slate-400 mb-2 uppercase tracking-wider mt-4">Management</div>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg mb-1 text-slate-600 dark:text-slate-400">
                       <Briefcase className="w-3.5 h-3.5"/> <span className="text-[10px] font-semibold">Leaves</span>
                    </div>
                 </div>
                 
                 {/* Main Content Area */}
                 <div className="flex-1 relative bg-slate-50 dark:bg-[#0A1622]">
                   {/* Top Header */}
                   <div className="absolute top-0 right-0 left-0 h-12 flex items-center justify-end px-6 gap-4 z-20">
                      <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <Search className="w-3 h-3 text-slate-500"/>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center relative">
                        <Bell className="w-3 h-3 text-slate-500"/>
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"/>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="w-5 h-5 rounded-full bg-[#0F7A6C] flex items-center justify-center text-white text-[8px] font-bold">AM</div>
                        <div className="leading-none pr-2">
                          <div className="text-[9px] font-bold text-slate-900 dark:text-white">Alex Morgan</div>
                          <div className="text-[7px] text-slate-500">Admin</div>
                        </div>
                      </div>
                   </div>

                   <AnimatePresence mode="wait">
                     {currentStep === 0 && (
                       <motion.div key="step0" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="absolute inset-0 pt-14 px-6 pb-6 overflow-hidden flex flex-col gap-4">
                         <div className="flex justify-between items-end">
                           <div>
                             <h4 className="text-xl font-bold text-[#0D1B2A] dark:text-white flex items-center gap-2 tracking-tight">Welcome back, Alex! <span className="text-lg">👋</span></h4>
                             <p className="text-[10px] text-slate-500">Here's what's happening at Globalworksphere today.</p>
                           </div>
                           <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-[9px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                             <Calendar className="w-3 h-3"/> Wednesday, September 16, 2026
                           </div>
                         </div>
                         
                         <div className="grid grid-cols-4 gap-3">
                           {[
                             {icon: Users, iconColor: "text-emerald-500 bg-emerald-50", num: "118", label: "Total present today", trend: "↑ 5%", trendColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"},
                             {icon: Ban, iconColor: "text-red-500 bg-red-50", num: "4", label: "Total absent today", trend: "↓ 20%", trendColor: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30"},
                             {icon: Calendar, iconColor: "text-blue-500 bg-blue-50", num: "6", label: "On approved leave", trend: "↑ 0%", trendColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"},
                             {icon: Clock, iconColor: "text-amber-500 bg-amber-50", num: "3", label: "Late arrivals today", trend: "↓ 25%", trendColor: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"}
                           ].map((stat, i)=>(
                             <div key={i} className="bg-white dark:bg-slate-800/80 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 relative">
                               <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconColor} dark:bg-opacity-10`}>
                                   <stat.icon className="w-4 h-4"/>
                                 </div>
                                 <div>
                                   <div className="text-xl font-bold text-slate-900 dark:text-white leading-none mb-1">{stat.num}</div>
                                   <div className="text-[8px] text-slate-500 leading-none">{stat.label}</div>
                                 </div>
                               </div>
                               <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[7px] font-bold ${stat.trendColor}`}>{stat.trend}</div>
                             </div>
                           ))}
                         </div>

                         <div className="flex gap-4 flex-1 min-h-0">
                           <div className="w-[60%] bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                               <div>
                                 <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Today's company activity</h5>
                                 <p className="text-[8px] text-slate-500">Wednesday, Sep 16 — check-ins, check-outs, and leave requests</p>
                               </div>
                               <span className="text-[9px] text-[#0F7A6C] dark:text-teal-400 font-semibold cursor-pointer">View all</span>
                             </div>
                             <div className="flex-1 flex flex-col gap-3">
                               {[
                                 {name: "Sarah Jenkins", action: "checked in", role: "Engineering", time: "9:02 AM", initials: "SJ", color: "bg-teal-100 text-teal-700"},
                                 {name: "Michael Chen", action: "requested time off", role: "Design", time: "9:24 AM", initials: "MC", color: "bg-blue-100 text-blue-700"},
                                 {name: "Emma Wilson", action: "checked in", role: "Marketing", time: "8:47 AM", initials: "EW", color: "bg-emerald-100 text-emerald-700"},
                                 {name: "David Park", action: "marked late arrival", role: "Sales", time: "9:41 AM", initials: "DP", color: "bg-orange-100 text-orange-700"}
                               ].map((a, i)=>(
                                 <div key={i} className="flex items-center gap-3">
                                   <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold ${a.color} dark:bg-opacity-20`}>{a.initials}</div>
                                   <div className="flex-1 leading-tight">
                                     <div className="text-[10px] text-slate-600 dark:text-slate-300"><strong className="font-bold text-slate-900 dark:text-white">{a.name}</strong> {a.action}</div>
                                     <div className="text-[8px] text-slate-400">{a.role}</div>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                     <div className={`w-1.5 h-1.5 rounded-full ${i===1?'bg-blue-500':i===3?'bg-orange-500':'bg-emerald-500'}`} />
                                     <span className="text-[8px] text-slate-400 font-medium">{a.time}</span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
                           <div className="w-[40%] bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col">
                             <div className="flex justify-between items-center mb-3">
                               <div>
                                 <h5 className="text-[11px] font-bold text-slate-900 dark:text-white">Present this week</h5>
                                 <p className="text-[8px] text-slate-500">Headcount present, Thu-Wed</p>
                               </div>
                               <div className="px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[7px] text-slate-600 dark:text-slate-300 flex items-center gap-1">This week <ChevronDown className="w-2 h-2"/></div>
                             </div>
                             <div className="flex-1 flex items-end gap-2 px-2 pb-2">
                               {[90, 110, 70, 60, 95, 120, 115].map((h, i)=>(
                                 <div key={i} className="flex-1 flex flex-col justify-end gap-1 group">
                                   <div className="w-full bg-[#14B8A6] dark:bg-teal-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{height:`${h}%`}}/>
                                   <div className="text-center text-[7px] text-slate-400">{['Thu','Fri','Sat','Sun','Mon','Tue','Wed'][i]}</div>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       </motion.div>
                     )}
                     
                     {currentStep === 1 && (
                       <motion.div key="step1" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="absolute inset-0 pt-16 px-8 pb-6 flex flex-col gap-4">
                         <div>
                           <h4 className="text-2xl font-black text-[#0D1B2A] dark:text-white mb-1">Payroll</h4>
                           <p className="text-[11px] text-slate-500">Create and manage payroll runs for any month.</p>
                         </div>
                         
                         <div className="bg-[#0D1B2A] text-white p-5 rounded-xl shadow-xl flex justify-between items-center mt-2 border border-slate-800 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                           <div className="relative z-10">
                             <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payroll • September 2026</div>
                             <div className="flex items-center gap-4">
                               <div className="text-3xl font-black tracking-tight">$486,240.00</div>
                               <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full border border-emerald-500/30">Finalized</div>
                             </div>
                           </div>
                           <div className="relative z-10 text-right">
                             <div className="text-[11px] text-slate-300 mb-0.5">128 employees paid</div>
                             <div className="text-[9px] text-slate-500">Processed in 2h 14m</div>
                           </div>
                         </div>
                         
                         <div className="flex flex-col mt-4 bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                           <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900/50 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                             <div>Period</div>
                             <div>Status</div>
                             <div>Working days</div>
                             <div>Employees</div>
                             <div>Total paid</div>
                             <div className="w-24 text-center">Actions</div>
                           </div>
                           {[
                             {period: "2026-09", status: "Finalized", statColor: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10", days: "30", emp: "128", total: "$486,240.00", actions: ["view", "dl"]},
                             {period: "2026-08", status: "Finalized", statColor: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10", days: "31", emp: "125", total: "$471,880.00", actions: ["view", "dl"]},
                             {period: "2026-10", status: "Draft", statColor: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10", days: "31", emp: "128", total: "—", actions: ["finalize", "edit"]}
                           ].map((row, i)=>(
                             <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 border-b border-slate-50 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                               <div className="text-[11px] font-bold text-slate-900 dark:text-white">{row.period}</div>
                               <div>
                                 <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full ${row.statColor}`}>{row.status}</span>
                               </div>
                               <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{row.days}</div>
                               <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{row.emp}</div>
                               <div className="text-[10px] font-medium text-slate-900 dark:text-white">{row.total}</div>
                               <div className="flex gap-2 justify-center w-24">
                                 {row.actions[0] === 'finalize' ? (
                                   <div className="px-3 py-1.5 rounded text-[9px] font-bold bg-[#0F7A6C] text-white">Finalize</div>
                                 ) : (
                                   <div className="w-8 h-6 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" />
                                 )}
                                 <div className="w-8 h-6 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" />
                               </div>
                             </div>
                           ))}
                         </div>
                       </motion.div>
                     )}
                     
                     {currentStep === 2 && (
                       <motion.div key="step2" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}} className="absolute inset-0 pt-16 px-8 pb-6 flex flex-col gap-4">
                         <div className="mb-2">
                           <h4 className="text-2xl font-black text-[#0D1B2A] dark:text-white mb-1">Attendance</h4>
                           <p className="text-[11px] text-slate-500">September 2026 — team attendance overview</p>
                         </div>
                         
                         <div className="flex items-center gap-4 text-[9px] font-medium text-slate-500 mb-2">
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Present</div>
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"/> Absent</div>
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"/> Leave</div>
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"/> Weekend</div>
                           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-teal-600"/> Half day</div>
                         </div>
                         
                         <div className="bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-hidden flex flex-col">
                           <div className="flex pb-2 border-b border-slate-100 dark:border-slate-700/50 pt-3 px-6">
                             <div className="w-32 shrink-0" />
                             <div className="flex-1 flex justify-between text-[9px] font-bold text-slate-400">
                               {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(d => (
                                 <div key={d} className="w-5 text-center">{d}</div>
                               ))}
                             </div>
                           </div>
                           
                           <div className="flex-1 flex flex-col justify-around py-3 px-6">
                             {[
                               {name: "Sarah Jenkins", in: "SJ", days: ['P','P','P','P','WO','WO','P','P','P','L','P','WO','WO','P']},
                               {name: "Michael Chen", in: "MC", days: ['P','P','L','L','WO','WO','L','L','L','P','P','WO','WO','P']},
                               {name: "Emma Wilson", in: "EW", days: ['P','P','P','P','WO','WO','P','H','P','P','P','WO','WO','P']},
                               {name: "David Park", in: "DP", days: ['P','A','P','P','WO','WO','P','P','P','P','P','WO','WO','P']},
                               {name: "Priya Nair", in: "PN", days: ['P','P','P','P','WO','WO','P','P','P','P','P','WO','WO','P']}
                             ].map((emp, i) => (
                               <div key={i} className="flex items-center">
                                 <div className="w-32 shrink-0 flex items-center gap-2">
                                   <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[8px] font-bold dark:bg-opacity-20">{emp.in}</div>
                                   <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{emp.name}</div>
                                 </div>
                                 <div className="flex-1 flex justify-between">
                                   {emp.days.map((status, j) => {
                                     let bgClass = "bg-emerald-500 text-white shadow-sm"
                                     if(status === 'A') bgClass = "bg-red-500 text-white shadow-sm"
                                     if(status === 'L') bgClass = "bg-blue-500 text-white shadow-sm"
                                     if(status === 'WO') bgClass = "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                     if(status === 'H') bgClass = "bg-teal-600 text-white shadow-sm"
                                     return (
                                       <div key={j} className={`w-5 h-5 rounded ${bgClass} flex items-center justify-center text-[8px] font-bold`}>{status}</div>
                                     )
                                   })}
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function TestimonialSection() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-[#0A1622] text-slate-900 dark:text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-10 leading-[1.1]">
            Enterprise scale.<br/>Startup agility.
          </h2>
          <div className="grid grid-cols-2 gap-8 mb-10">
             <div>
               <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                 <Zap className="w-6 h-6 text-[#14B8A6]" />
               </div>
               <div className="text-3xl font-bold text-[#14B8A6] mb-1">Unified</div>
               <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Global payroll execution across all regions</div>
             </div>
             <div>
               <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                 <Globe className="w-6 h-6 text-[#14B8A6]" />
               </div>
               <div className="text-3xl font-bold text-[#14B8A6] mb-1">Global</div>
               <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">Compliance across all major regions</div>
             </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 dark:from-teal-500/20 dark:to-emerald-500/20 blur-xl rounded-3xl" />
          <div className="relative bg-white dark:bg-[#0D1B2A] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 md:p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-2xl">
            <Star className="w-8 h-8 text-[#14B8A6] mb-8 fill-[#14B8A6]" />
            <p className="text-2xl md:text-3xl font-medium leading-relaxed mb-10 text-slate-800 dark:text-slate-200">
              "GlobalWorkSphere automated our entire payroll process. What used to take days of manual spreadsheet work is now completed with a single click, with 100% compliance across all our regions."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-slate-100 dark:border-slate-700 bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xl shrink-0">AH</div>
              <div>
                <div className="font-bold text-lg text-slate-900 dark:text-white">Amanda Higgins</div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">VP of Global HR, TechFlow Inc.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [statsRef, statsInView] = useInView({ triggerOnce: true, threshold: 0.2 })

  // Parallax effects
  const { scrollY } = useScroll()
  const yBg = useTransform(scrollY, [0, 1000], [0, 150])
  const yMockupGroup = useTransform(scrollY, [0, 1000], [0, -250])

  return (
    <div className="font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 overflow-clip">
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-24 lg:pt-28 pb-16 lg:pb-20 px-6 lg:px-12 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div style={{ y: yBg }} className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
              alt="Team Collaboration" 
              className="w-full h-full object-cover blur-[1px]"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-teal-50/90 to-teal-100/80 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-teal-950/80 backdrop-blur-[2px]" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left pt-10 lg:pt-0"
          >
            <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-700 dark:text-teal-400 ring-1 ring-inset ring-teal-600/20 mb-8 backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
              The modern HR platform for enterprise
            </motion.div>
            
            <motion.div variants={fadeUpVariant}>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-[1.1]">
                Manage your global team with <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">confidence.</span>
              </h1>
            </motion.div>
            
            <motion.p variants={fadeUpVariant} className="text-xl text-slate-700 dark:text-slate-300 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Onboard, pay, and manage your workforce anywhere in the world. GlobalWorkSphere automates compliance, payroll, and core HR in one unified platform.
            </motion.p>
            
            <motion.div variants={fadeUpVariant} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => navigate('/demo')}
                className="w-full sm:w-auto rounded-full bg-teal-600 text-white hover:bg-teal-500 px-8 py-4 text-base font-bold shadow-[0_8px_30px_rgb(13,148,136,0.3)] hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                Request a Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link to="/products" className="w-full sm:w-auto rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 px-8 py-4 text-base font-bold shadow-sm backdrop-blur-sm hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 group">
                <Play className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                See how it works
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Visual */}
          <div className="relative w-full flex items-center justify-center lg:justify-end py-12 lg:py-0">
            <motion.div 
              className="relative w-full max-w-[600px] z-10"
            >
              
              {/* Dashboard Mockup - High Fidelity */}
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-full bg-slate-50 dark:bg-slate-900 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col aspect-[16/10]"
              >
                 {/* Browser Header */}
                 <div className="h-6 border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#0A1622] px-3 flex items-center">
                   <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"/><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"/><div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"/></div>
                 </div>
                 
                 <div className="flex-1 flex overflow-hidden">
                   {/* Sidebar */}
                   <div className="w-[110px] shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col p-2 z-10 relative">
                      <div className="flex items-center gap-1 mb-4">
                         <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-[14px] md:h-[18px] w-auto object-contain -ml-0.5" />
                      </div>
                      
                      <div className="bg-slate-100 dark:bg-slate-800/50 rounded px-1.5 py-1 mb-3 flex items-center gap-1 text-[6px] text-slate-400 border border-slate-200 dark:border-slate-700/50">
                        <Search className="w-2 h-2"/> Search...
                      </div>
                      
                      <div className="text-[5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">General</div>
                      <div className="flex items-center gap-1.5 p-1 rounded bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 mb-0.5">
                         <LayoutGrid className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Overview</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded text-slate-600 dark:text-slate-400 mb-0.5">
                         <DollarSign className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Payroll</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded text-slate-600 dark:text-slate-400 mb-0.5">
                         <Users className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Employees</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded text-slate-600 dark:text-slate-400 mb-0.5">
                         <Calendar className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Attendance</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded text-slate-600 dark:text-slate-400 mb-2">
                         <Bell className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Announcements</span>
                      </div>

                      <div className="text-[5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider mt-2">Management</div>
                      <div className="flex items-center gap-1.5 p-1 rounded text-slate-600 dark:text-slate-400 mb-0.5">
                         <Briefcase className="w-2.5 h-2.5"/> <span className="text-[6px] font-semibold">Leaves</span>
                      </div>
                   </div>
                   
                   {/* Main Content Area */}
                   <div className="flex-1 relative bg-[#F7F9F8] dark:bg-[#0A1622] p-3 flex flex-col overflow-hidden">
                     {/* Top Header */}
                     <div className="absolute top-0 right-0 left-0 h-8 flex items-center justify-end px-4 gap-2 z-20">
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                          <div className="w-3.5 h-3.5 rounded bg-[#0F7A6C] flex items-center justify-center text-white text-[5px] font-bold">DU</div>
                          <div className="leading-none pr-1">
                            <div className="text-[6px] font-bold text-slate-900 dark:text-white">Dummy User</div>
                            <div className="text-[4px] text-slate-500">Admin</div>
                          </div>
                        </div>
                     </div>

                     <div className="flex-1 flex gap-2.5 mt-6 relative z-10">
                       {/* Left Col */}
                       <div className="w-[35%] flex flex-col gap-2">
                         <div className="flex-1 bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center p-3 text-center">
                           <div className="w-16 h-12 bg-teal-50 dark:bg-teal-900/20 rounded mb-2 flex items-center justify-center">
                             <Users className="w-6 h-6 text-teal-500" />
                           </div>
                           <div className="text-[5px] text-slate-400 font-bold uppercase tracking-widest mb-1">HELLO</div>
                           <div className="text-[10px] font-black text-slate-900 dark:text-white mb-1">Dummy!</div>
                           <div className="text-[5px] text-slate-500 mb-3 px-2">You have <strong className="text-slate-700 dark:text-slate-300">0</strong> leave requests waiting for review.</div>
                           <button className="px-3 py-1.5 bg-[#0F7A6C] text-white rounded text-[5px] font-bold mb-3 flex items-center gap-1">Review queue <ArrowRight className="w-1.5 h-1.5"/></button>
                           <div className="text-[4.5px] italic text-slate-400 max-w-[100px]">"Strong culture is the best long-term productivity multiplier."</div>
                           
                           <div className="flex gap-1 w-full mt-auto pt-3">
                             <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded py-1 text-[5px] font-bold">0<br/><span className="font-normal opacity-70">Present</span></div>
                             <div className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded py-1 text-[5px] font-bold">1<br/><span className="font-normal opacity-70">Absent</span></div>
                             <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded py-1 text-[5px] font-bold">0<br/><span className="font-normal opacity-70">Leave</span></div>
                           </div>
                         </div>
                       </div>
                       
                       {/* Right Col */}
                       <div className="w-[65%] flex flex-col gap-2">
                         {/* Top 4 stats */}
                         <div className="grid grid-cols-4 gap-2">
                           {[
                             {icon: Users, bg: "bg-[#0F7A6C]", v: "0", l: "Total present today"},
                             {icon: Users, bg: "bg-slate-700", v: "1", l: "Total absent today"},
                             {icon: Calendar, bg: "bg-teal-600", v: "0", l: "On approved leave"},
                             {icon: ArrowRight, bg: "bg-orange-500", v: "—", l: "Late arrivals today"}
                           ].map((s, i)=>(
                             <div key={i} className="bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1.5 flex items-center gap-1.5">
                               <div className={`w-4 h-4 rounded flex items-center justify-center text-white shrink-0 ${s.bg}`}><s.icon className="w-2.5 h-2.5"/></div>
                               <div>
                                 <div className="text-[7px] font-black text-slate-900 dark:text-white leading-none mb-0.5">{s.v}</div>
                                 <div className="text-[4px] text-slate-500 leading-tight">{s.l}</div>
                               </div>
                             </div>
                           ))}
                         </div>
                         
                         {/* Middle row */}
                         <div className="flex gap-2 flex-1">
                           <div className="flex-[3] bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-2 flex flex-col">
                             <div className="flex justify-between items-center mb-1">
                               <div className="text-[6px] font-bold text-slate-900 dark:text-white">Today's company activity</div>
                               <div className="px-1 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[4px] font-bold flex items-center gap-0.5"><div className="w-1 h-1 rounded-full bg-teal-500"/> Live today</div>
                             </div>
                             <div className="text-[4.5px] text-slate-400 mb-4">Wednesday, Sep 16 — check-ins, check-outs, and leave requests from all employees in your organization.</div>
                             <div className="flex-1 flex flex-col items-center justify-center text-center">
                               <div className="w-5 h-5 mb-1 text-teal-200"><Activity className="w-full h-full"/></div>
                               <div className="text-[6px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">Quiet day so far</div>
                               <div className="text-[4px] text-slate-400 max-w-[100px] leading-tight">When employees check in, check out, or submit leave today, those events will show up here.</div>
                             </div>
                           </div>
                           <div className="flex-[2] bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-2 flex flex-col">
                             <div className="text-[6px] font-bold text-slate-900 dark:text-white mb-2">Present this week</div>
                             <div className="flex-1 border-l border-b border-slate-200 dark:border-slate-700 flex items-end justify-between px-1 pt-1 pb-0 relative">
                               <div className="absolute left-0 bottom-0 top-0 w-1 border-r border-slate-200 dark:border-slate-700 -ml-1">
                                 <div className="absolute bottom-0 text-[3px] text-slate-400 -left-1">0-</div>
                                 <div className="absolute top-1/4 text-[3px] text-slate-400 -left-1">1-</div>
                                 <div className="absolute top-1/2 text-[3px] text-slate-400 -left-1">2-</div>
                                 <div className="absolute top-3/4 text-[3px] text-slate-400 -left-1">3-</div>
                                 <div className="absolute top-0 text-[3px] text-slate-400 -left-1">4-</div>
                               </div>
                               {['Thu','Fri','Sat','Sun','Mon','Tue','Wed'].map(d=><div key={d} className="text-[3px] text-slate-400 mt-1">{d}</div>)}
                             </div>
                           </div>
                         </div>
                         
                         {/* Bottom row */}
                         <div className="grid grid-cols-3 gap-2 h-[42px]">
                           <div className="bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1.5 flex flex-col">
                             <div className="flex justify-between items-start mb-1"><div className="text-[5px] font-bold text-slate-900 dark:text-white leading-tight">Recent leave<br/>activity</div><div className="text-[4px] text-teal-600 font-bold">Open<br/>leaves</div></div>
                             <div className="flex-1 flex items-center justify-center text-[4px] text-slate-400 text-center">No recent leave requests.</div>
                           </div>
                           <div className="bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1.5 flex flex-col">
                             <div className="flex items-center gap-1 mb-1"><div className="w-2.5 h-2.5 bg-indigo-500 rounded flex items-center justify-center"><Calendar className="w-1.5 h-1.5 text-white"/></div><div><div className="text-[5px] font-bold text-slate-900 dark:text-white leading-none">Birthdays</div><div className="text-[3px] text-slate-400">Upcoming celebrations</div></div></div>
                             <div className="flex-1 flex items-center justify-center text-[4px] text-slate-400 text-center leading-tight">Add date of birth on employee profiles to see birthdays here.</div>
                           </div>
                           <div className="bg-white dark:bg-slate-800/80 rounded shadow-sm border border-slate-100 dark:border-slate-700 p-1.5">
                             <div className="text-[5px] font-bold text-slate-900 dark:text-white mb-0.5">People by department</div>
                             <div className="text-[3px] text-slate-400 mb-1">Headcount snapshot</div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
              </motion.div>

              {/* Floating Live Progress Card */}
              <motion.div 
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -bottom-6 -left-6 md:-bottom-8 md:-left-12 bg-white dark:bg-[#0D1B2A] p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 w-64 z-20"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white">Tax Filings</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Syncing...
                    </motion.span>
                  </span>
                </div>
                {/* Looping Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "100%", "0%"] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", times: [0, 0.8, 1] }}
                    className="h-full bg-[#14B8A6] rounded-full relative"
                  />
                </div>
              </motion.div>

              {/* Floating Notification */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: [0, 1, 1, 0], x: [20, 0, 0, 20] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -top-4 -right-4 md:-top-6 md:-right-8 bg-white dark:bg-[#0D1B2A] p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-3 z-20 max-w-[200px]"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                  <strong className="text-slate-900 dark:text-white">Sarah Jenkins</strong> leave request approved automatically.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enterprise Reliability Section */}
      <section ref={statsRef} className="py-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="text-center px-4">
              <div className="flex justify-center mb-4"><ShieldCheck className="w-8 h-8 text-[#0F7A6C] dark:text-[#14B8A6]" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Enterprise Security</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certified Secure</p>
            </div>
            <div className="text-center px-4">
              <div className="flex justify-center mb-4"><Lock className="w-8 h-8 text-[#0F7A6C] dark:text-[#14B8A6]" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">End-to-End</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Encryption</p>
            </div>
            <div className="text-center px-4">
              <div className="flex justify-center mb-4"><Globe className="w-8 h-8 text-[#0F7A6C] dark:text-[#14B8A6]" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">GDPR Ready</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Compliance</p>
            </div>
            <div className="text-center px-4">
              <div className="flex justify-center mb-4"><Server className="w-8 h-8 text-[#0F7A6C] dark:text-[#14B8A6]" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">High Availability</h3>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cloud Infrastructure</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spec Sheet Features Section */}
      <section className="py-24 bg-[#F2F6F4] dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {/* Header */}
          <div className="flex flex-col-reverse lg:flex-row lg:items-start justify-between gap-10 lg:gap-12 mb-16">
            <div className="max-w-3xl">
              <h2 className="text-4xl lg:text-5xl font-extrabold text-[#0D1B2A] dark:text-white tracking-tight mb-6 leading-[1.1]">
                The operating system for how your company runs
              </h2>
              <p className="text-lg text-[#5B7065] dark:text-slate-400 max-w-xl leading-relaxed">
                A highly-structured environment tying together onboarding, payroll, scheduling, and analytics into one unified architecture.
              </p>
            </div>
            
            {/* Anchor Image */}
            <div className="relative shrink-0 w-full lg:w-[280px] h-[170px] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-none dark:border dark:border-slate-800 bg-white dark:bg-slate-900 group">
              <img 
                src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" 
                alt="System Architecture" 
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl pointer-events-none" />
            </div>
          </div>

          {/* 4 Columns Panel */}
          <div className="-mx-6 lg:-mx-10 grid md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {[
              {
                title: "Core HR",
                desc: "Automated onboarding and centralized directory.",
                icon: Users,
                img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                dataText: "Centralized employee directory",
                hasDot: true
              },
              {
                title: "Global Payroll",
                desc: "Run multi-region payroll with automated filings.",
                icon: Zap,
                img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                dataText: "Multi-region compliance engine",
                hasDot: false
              },
              {
                title: "Time & Attendance",
                desc: "Time tracking, shift scheduling, and leave logic.",
                icon: Calendar,
                img: "https://images.unsplash.com/photo-1435527173128-983b87201f4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                dataText: "Dynamic shift scheduling",
                hasDot: true
              },
              {
                title: "AI Insights",
                desc: "Predictive analytics for retention and benchmarking.",
                icon: TrendingUp,
                img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
                dataText: "Predictive team analytics",
                hasDot: true
              }
            ].map((col, idx) => (
              <div 
                key={idx}
                className="group flex flex-col p-6 lg:p-10 transition-colors duration-300 hover:bg-[#0F7A6C]/5 dark:hover:bg-[#14B8A6]/10"
              >
                {/* Icon */}
                <div className="mb-8">
                  <col.icon 
                    strokeWidth={1.5} 
                    className="w-9 h-9 text-[#0F7A6C] dark:text-slate-400 transition-all duration-300 group-hover:text-[#14B8A6] dark:group-hover:text-[#14B8A6] transform group-hover:-translate-y-0.5" 
                  />
                </div>
                
                {/* Text */}
                <h3 className="text-xl font-bold tracking-tight text-[#0D1B2A] dark:text-white mb-2">{col.title}</h3>
                <p className="text-[#5B7065] dark:text-slate-400 text-sm leading-relaxed mb-8 flex-1">{col.desc}</p>
                
                {/* Thumbnail */}
                <div className="relative w-full h-[90px] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 mb-8 ring-1 ring-inset ring-black/5 dark:ring-white/5">
                  <img 
                    src={col.img} 
                    alt={col.title} 
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  />
                </div>
                
                {/* Hairline Divider */}
                <div className="h-px w-full bg-slate-200 dark:bg-slate-800 mb-6" />
                
                {/* Live Data Readout */}
                <div className="flex items-center gap-3 font-mono text-xs font-semibold text-[#0F7A6C] dark:text-[#14B8A6] mb-8 uppercase tracking-widest">
                  {col.hasDot && (
                    <div className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-[ping_2.5s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-[#14B8A6] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F7A6C] dark:bg-[#14B8A6]"></span>
                    </div>
                  )}
                  {!col.hasDot && (
                    <div className="w-2 h-2 rounded-full bg-[#0F7A6C] dark:bg-[#14B8A6] opacity-30 shrink-0" />
                  )}
                  <span className="whitespace-normal text-left">{col.dataText}</span>
                </div>
                
                {/* Learn More Link */}
                <div className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#0D1B2A] dark:text-white cursor-pointer relative w-fit group/link">
                  Learn more 
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-[#0F7A6C] dark:bg-[#14B8A6] transition-all duration-300 group-hover/link:w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Scroll-Pinned Deep Dive: Payroll Architecture */}
      <PayrollDeepDiveSection />

      {/* AI Insights Section */}
      <section className="py-24 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUpVariant} className="text-3xl lg:text-4xl font-bold mb-6 text-slate-900 dark:text-white">AI-Powered Intelligence</motion.h2>
              <motion.p variants={fadeUpVariant} className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                Turn raw employee data into strategic decisions. Our machine learning algorithms automatically detect turnover risks, pay equity gaps, and performance trends before they become issues.
              </motion.p>
              
              <motion.div variants={fadeUpVariant} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { name: "Retention Scoring", icon: Users, color: "#14b8a6" },
                  { name: "Pay Benchmarks", icon: TrendingUp, color: "#f59e0b" },
                  { name: "D&I Analytics", icon: PieChart, color: "#8b5cf6" },
                  { name: "Headcount Forecast", icon: Activity, color: "#3b82f6" },
                  { name: "Report Builder", icon: Database, color: "#10b981" },
                  { name: "Skill Gap Analysis", icon: Briefcase, color: "#6366f1" }
                ].map((tool, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer group">
                    <tool.icon className="w-5 h-5 transition-colors" style={{ color: tool.color }} />
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{tool.name}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10 w-full max-w-sm mx-auto lg:mr-0">
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex gap-4 relative"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">AI Insights</span>
                      <span className="text-[10px] text-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded font-bold tracking-wide uppercase">Alert</span>
                      <span className="text-[10px] text-slate-400 ml-auto">Just now</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Retention Risk Detected</strong> ⚠️ <br/>
                      Engineering Team turnover risk has increased by 12% this quarter. View recommended actions.
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Testimonial Quote Section */}
      <TestimonialSection />

      {/* FAQ Section */}
      <section className="py-24 bg-white dark:bg-[#0A1622] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-12 text-center text-slate-900 dark:text-white">Frequently asked questions</h2>
          
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            <FAQItem question="What is an HRMS and how does it help my business?" answer="An HRMS (Human Resources Management System) automates core HR tasks like payroll processing, time tracking, leave management, and employee onboarding. GlobalWorkSphere consolidates these functions into one unified cloud-based platform, reducing administrative overhead and ensuring 100% compliance across international borders." />
            <FAQItem question="How does GlobalWorkSphere handle global payroll compliance?" answer="Our global payroll software automatically updates tax codes and employment regulations across major international regions. We ensure that your local and international teams are paid accurately and on time, while automatically filing regional compliance forms to eliminate legal risks." />
            <FAQItem question="Can GlobalWorkSphere integrate with my existing software?" answer="Yes, GlobalWorkSphere offers seamless API integrations with leading accounting, ERP, and communication tools. Our platform connects effortlessly to tools like QuickBooks, NetSuite, and Slack to ensure data flows securely across your entire tech stack." />
            <FAQItem question="Is employee data secure in your HR management system?" answer="Absolutely. We employ enterprise-grade security including industry-standard encryption, strict role-based access control (RBAC), and secure data storage mechanisms. GlobalWorkSphere is designed with strict data privacy principles to keep your workforce data protected globally." />
            <FAQItem question="How quickly can we deploy GlobalWorkSphere in our organization?" answer="Most organizations are fully deployed within 2 to 4 weeks. Our dedicated customer success team provides white-glove data migration, customized workflow setup, and comprehensive training to ensure your team transitions smoothly from legacy systems." />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 lg:px-12 relative overflow-hidden bg-teal-800 dark:bg-teal-900">
        {/* Crisp Gradient Border to cleanly separate from Footer */}
        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500 z-20" />
        
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-teal-500/30 blur-[100px] rounded-full pointer-events-none"
          />
        </div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.h2 variants={fadeUpVariant} className="text-4xl lg:text-6xl font-extrabold text-white mb-6">Ready to transform your workplace?</motion.h2>
          <motion.p variants={fadeUpVariant} className="text-xl text-teal-50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of modern companies who have upgraded their HR stack to GlobalWorkSphere. It takes less than 5 minutes to get started.
          </motion.p>
          <motion.div variants={fadeUpVariant}>
            <button 
              onClick={() => navigate('/demo')}
              className="relative rounded-full bg-white text-teal-900 hover:bg-slate-50 px-10 py-5 text-lg font-bold shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-1 hover:scale-105 transition-all duration-300 group"
            >
              Get Started Now
              <span className="absolute inset-0 rounded-full ring-2 ring-white/40 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
          </motion.div>
        </motion.div>
      </section>

    </div>
  )
}
