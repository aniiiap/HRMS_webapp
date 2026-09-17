import React, { useState } from 'react';
import { CalendarDays, Plane, Clock, ShieldCheck, Settings, BellRing, PlaneTakeoff, Check, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LeaveProductPage() {
  const prefersReducedMotion = useReducedMotion();
  const [leaveStatus, setLeaveStatus] = useState('idle'); // idle, requesting, approved

  const handleRequest = () => {
    if (leaveStatus !== 'idle') return;
    setLeaveStatus('requesting');
    
    // Simulate manager approval delay
    setTimeout(() => {
      setLeaveStatus('approved');
      toast.success("Manager approved your leave request!", { icon: '✅' });
    }, 1500);
  };

  const resetLeave = () => {
    setLeaveStatus('idle');
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="text-left">
            <div className="text-amber-600 dark:text-amber-400 font-bold tracking-wider text-sm uppercase mb-4">
              Leave Management
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
              Time-off made <span className="text-amber-500">effortless</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Customizable policies, multi-level approval workflows, and a unified calendar so everyone knows who is out and when.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition-all hover:-translate-y-1">
                Explore Leaves
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PlaneTakeoff className="w-5 h-5 text-amber-500" /> Apply Leave
                </h3>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">Balance: 12 days</span>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Leave Type</label>
                  <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200">
                    Annual Vacation
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">From Date</label>
                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200">
                      Dec 15, 2026
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">To Date</label>
                    <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200">
                      Dec 22, 2026
                    </div>
                  </div>
                </div>
              </div>

              {leaveStatus === 'idle' && (
                <button 
                  onClick={handleRequest}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20"
                >
                  Submit Request
                </button>
              )}
              
              {leaveStatus === 'requesting' && (
                <button disabled className="w-full bg-amber-200 text-amber-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 animate-spin" /> Pending Manager Approval...
                </button>
              )}

              {leaveStatus === 'approved' && (
                <div className="text-center">
                  <div className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mb-2">
                    <Check className="w-5 h-5" /> Leave Approved!
                  </div>
                  <button onClick={resetLeave} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline mt-2">Reset Mockup</button>
                </div>
              )}
            </div>
            
            {leaveStatus === 'idle' && (
              <div className="absolute -top-4 -right-4 bg-indigo-500 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce z-20">
                👇 Submit it!
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 grid md:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <Settings className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Custom Policies</h3>
          <p className="text-slate-600 dark:text-slate-400">Create complex accrual rules, comp-offs, carry-forward limits, and encashments unique to your org.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <CalendarDays className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Unified Calendar</h3>
          <p className="text-slate-600 dark:text-slate-400">Managers get a single view of all upcoming leaves to prevent understaffing before approving.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <BellRing className="w-10 h-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Slack/Teams Sync</h3>
          <p className="text-slate-600 dark:text-slate-400">Approve requests via chat and automatically set OOO statuses across your communication tools.</p>
        </div>
      </div>

      {/* Visual Feature Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 border-t border-slate-200 dark:border-slate-800 pt-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
              Year-End Processing on Autopilot
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              Closing out the year is effortless. Automatically calculate leave encashments, lapsing balances, and carry-forwards based on your exact company policy, directly syncing with January's payroll.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-amber-500" /> Automated carry-forward logic</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-amber-500" /> Prorated accruals for mid-year joiners</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-amber-500" /> Custom encashment formulas</li>
            </ul>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[400px]">
            <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2070&auto=format&fit=crop" alt="Planning calendar" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-amber-600/20 mix-blend-multiply"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
