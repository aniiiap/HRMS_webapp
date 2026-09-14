import { Eye, EyeOff, Moon, Sparkles, Sun, ArrowRight, CheckCircle2, Users, Building, ShieldCheck, Zap, LineChart, PieChart, Smartphone, Wallet, DollarSign, Heart } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { messageFromError, tokenStore } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import SmartButton from '../../components/ui/SmartButton'
import { useTheme } from '../../context/ThemeContext'

const FEATURES = [
  {
    title: 'Core HR & People',
    description: 'Centralize your employee data, documents, and directories in one secure platform.',
    icon: Users,
    cardGradient: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/30',
    shadowColor: 'shadow-emerald-900/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-emerald-950 dark:text-emerald-50',
    descColor: 'text-emerald-800/80 dark:text-emerald-100/70',
    Visual: () => (
      <div className="mt-8 flex flex-col gap-3 opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-1">
        <div className="flex items-center gap-3 bg-emerald-900/5 dark:bg-white/10 p-2.5 rounded-xl border border-emerald-900/5 dark:border-white/5 backdrop-blur-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-900/10 dark:bg-white/30 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-3/4 bg-emerald-900/20 dark:bg-white/40 rounded-full" />
            <div className="h-1.5 w-1/2 bg-emerald-900/10 dark:bg-white/20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3 bg-emerald-900/5 dark:bg-white/5 p-2.5 rounded-xl border border-emerald-900/5 dark:border-white/5 backdrop-blur-sm ml-4">
          <div className="w-8 h-8 rounded-full bg-emerald-900/10 dark:bg-white/20 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2 w-2/3 bg-emerald-900/20 dark:bg-white/30 rounded-full" />
            <div className="h-1.5 w-1/3 bg-emerald-900/10 dark:bg-white/10 rounded-full" />
          </div>
        </div>
      </div>
    )
  },
  {
    title: 'Smart Payroll',
    description: 'Automate salary processing, tax calculations, and compliance without the headache.',
    icon: Zap,
    cardGradient: 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/30',
    shadowColor: 'shadow-indigo-900/5',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    textColor: 'text-indigo-950 dark:text-indigo-50',
    descColor: 'text-indigo-800/80 dark:text-indigo-100/70',
    Visual: () => (
      <div className="mt-8 flex items-end gap-2 h-20 opacity-60 group-hover:opacity-100 transition-all duration-500">
        <div className="w-full bg-indigo-900/10 dark:bg-white/20 rounded-t-lg h-[40%] group-hover:h-[50%] transition-all duration-700" />
        <div className="w-full bg-indigo-900/20 dark:bg-white/40 rounded-t-lg h-[60%] group-hover:h-[75%] transition-all duration-700 delay-75" />
        <div className="w-full bg-indigo-900/10 dark:bg-white/20 rounded-t-lg h-[30%] group-hover:h-[40%] transition-all duration-700 delay-150" />
        <div className="w-full bg-indigo-900/30 dark:bg-white/60 rounded-t-lg h-[80%] group-hover:h-[100%] transition-all duration-700 delay-200 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-white animate-ping" />
        </div>
      </div>
    )
  },
  {
    title: 'Time & Attendance',
    description: 'Track clock-ins, manage shifts, and handle leave requests with automated workflows.',
    icon: ShieldCheck,
    cardGradient: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/30',
    shadowColor: 'shadow-rose-900/5',
    iconColor: 'text-rose-600 dark:text-rose-400',
    textColor: 'text-rose-950 dark:text-rose-50',
    descColor: 'text-rose-800/80 dark:text-rose-100/70',
    Visual: () => (
      <div className="mt-8 grid grid-cols-5 gap-2 opacity-60 group-hover:opacity-100 transition-all duration-500 transform group-hover:scale-105 origin-left">
        {[...Array(10)].map((_, i) => (
          <div 
            key={i} 
            className={\spect-square rounded-md \\} 
          />
        ))}
      </div>
    )
  },
  {
    title: 'Performance & Growth',
    description: 'Align teams with goals, conduct reviews, and foster continuous feedback.',
    icon: LineChart,
    cardGradient: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/30',
    shadowColor: 'shadow-amber-900/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-950 dark:text-amber-50',
    descColor: 'text-amber-800/80 dark:text-amber-100/70',
    Visual: () => (
      <div className="mt-8 flex flex-col gap-4 opacity-60 group-hover:opacity-100 transition-all duration-500">
        <div className="w-full bg-amber-900/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-amber-900/40 dark:bg-white/70 h-full rounded-full w-[65%] group-hover:w-[85%] transition-all duration-1000 ease-out" />
        </div>
        <div className="w-full bg-amber-900/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-amber-900/20 dark:bg-white/40 h-full rounded-full w-[40%] group-hover:w-[60%] transition-all duration-1000 ease-out delay-100" />
        </div>
        <div className="w-full bg-amber-900/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
          <div className="bg-amber-900/50 dark:bg-white/90 h-full rounded-full w-[85%] group-hover:w-[100%] transition-all duration-1000 ease-out delay-200" />
        </div>
      </div>
    )
  }
]
