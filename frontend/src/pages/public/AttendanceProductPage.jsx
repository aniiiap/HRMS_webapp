import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Fingerprint, CalendarCheck, ArrowRight, LogIn, LogOut, Smartphone, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AttendanceProductPage() {
  const prefersReducedMotion = useReducedMotion();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockedOut, setClockedOut] = useState(false);
  const [inTime, setInTime] = useState('-');
  const [outTime, setOutTime] = useState('-');
  
  const handleClockIn = () => {
    if (clockedIn) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInTime(now);
    setClockedIn(true);
    toast.success(`Clocked in successfully at ${now}`, {
      icon: '👋',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  const handleClockOut = () => {
    if (!clockedIn || clockedOut) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOutTime(now);
    setClockedOut(true);
    toast.success(`Clocked out successfully at ${now}`, {
      icon: '🏠',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={!prefersReducedMotion ? "hidden" : "show"}
            animate="show"
            variants={stagger}
            className="text-left"
          >
            <motion.div variants={fadeIn} className="text-brand-600 dark:text-brand-400 font-bold tracking-wider text-sm uppercase mb-4">
              Time & Attendance
            </motion.div>
            <motion.div variants={fadeIn}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                Smart attendance for the <span className="text-brand-500">modern workforce</span>
              </h1>
            </motion.div>
            <motion.div variants={fadeIn}>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Eliminate buddy punching and manual errors. Track time seamlessly with geo-fencing, facial recognition, and one-tap web clock-ins.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
              <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all hover:-translate-y-1">
                Get Started
              </Link>
            </motion.div>
          </motion.div>

          {/* Interactive Mockup */}
          <motion.div 
            initial={!prefersReducedMotion ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="relative perspective-1000"
          >
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_-12px_rgba(15,122,108,0.4)] text-white relative overflow-hidden">
              
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">Hi John,</h2>
                    <p className="text-brand-100 text-lg">Your workspace — attendance and leave</p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Smartphone className="w-6 h-6 text-brand-50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    onClick={handleClockIn}
                    disabled={clockedIn}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      !clockedIn 
                        ? 'bg-white text-brand-700 hover:bg-brand-50 hover:scale-[1.02] active:scale-95 shadow-lg' 
                        : 'bg-white/20 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    <LogIn className="w-5 h-5" />
                    Clock in
                  </button>
                  <button 
                    onClick={handleClockOut}
                    disabled={!clockedIn || clockedOut}
                    className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
                      clockedIn && !clockedOut
                        ? 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-[1.02] active:scale-95 shadow-lg'
                        : 'bg-slate-800/40 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    <LogOut className="w-5 h-5" />
                    Clock out
                  </button>
                </div>

                <div className="bg-black/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-sm border border-white/10">
                  <div className="text-brand-100 font-medium">
                    Today: <span className="text-white font-bold ml-1">{inTime}</span> <span className="mx-2 opacity-50">|</span> Out: <span className="text-white font-bold">{outTime}</span>
                  </div>
                  <Clock className="w-5 h-5 text-brand-200" />
                </div>
              </div>
            </div>
            
            {/* Try it out floating badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 bg-amber-400 text-amber-900 font-bold px-4 py-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800 flex items-center gap-2"
            >
              <span>👆 Try it out!</span>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
            Everything you need to track time accurately
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Our powerful attendance module integrates smoothly with payroll and leaves.
          </p>
        </div>

        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {/* Feature 1 */}
          <motion.div variants={fadeIn} className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6">
              <MapPin className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Geo-Fencing & Tracking</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Restrict clock-ins to specific office locations. For field staff, track live locations during check-ins and check-outs with pinpoint accuracy.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div variants={fadeIn} className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center mb-6">
              <Fingerprint className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Biometric Integration</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Seamlessly connect with standard biometric devices. Automatically pull logs into the cloud without manual data transfers.
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div variants={fadeIn} className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center mb-6">
              <CalendarCheck className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Overtime & Shifts</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Set up complex shift rosters, night-shift allowances, and automate overtime calculations that feed directly into payroll.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Visual Feature Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 border-t border-slate-200 dark:border-slate-800 pt-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden shadow-2xl h-[400px]">
            <img src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop" alt="Team meeting" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-brand-600/20 mix-blend-multiply"></div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
              Face Recognition & Geofencing for the Remote World
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              Empower your field workforce and remote teams. Let employees mark their attendance straight from their mobile phones, while AI verifies their identity through a quick selfie and records their GPS coordinates.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-brand-500" /> Advanced anti-spoofing AI algorithms</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-brand-500" /> Customizable geofence radius for specific office zones</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-brand-500" /> Offline sync support for bad network areas</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
