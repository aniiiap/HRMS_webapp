import React, { useState } from 'react';
import { Users, Database, ShieldCheck, Search, CheckCircle2, UserCircle, Briefcase, FileText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CoreHRProductPage() {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState('personal');

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    toast.success(`Viewing ${tab} details`, { icon: '👁️', style: { borderRadius: '10px', background: '#333', color: '#fff' }});
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div initial={!prefersReducedMotion ? "hidden" : "show"} animate="show" variants={stagger} className="text-left">
            <motion.div variants={fadeIn} className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wider text-sm uppercase mb-4">
              Core HR Database
            </motion.div>
            <motion.div variants={fadeIn}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                A single source of truth for <span className="text-indigo-500">your people</span>
              </h1>
            </motion.div>
            <motion.div variants={fadeIn}>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Centralize all employee data, documents, and history in one secure, searchable directory. Say goodbye to scattered spreadsheets.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4">
              <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1">
                Explore Core HR
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xl">
                  SJ
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Sarah Jenkins</h3>
                  <p className="text-slate-500 dark:text-slate-400">Senior Product Designer • EMP-042</p>
                </div>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button onClick={() => handleTabClick('personal')} className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'personal' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  Personal
                </button>
                <button onClick={() => handleTabClick('job')} className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'job' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  Job
                </button>
                <button onClick={() => handleTabClick('documents')} className={`pb-3 px-4 font-medium transition-colors ${activeTab === 'documents' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  Documents
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 min-h-[160px] border border-slate-100 dark:border-slate-700">
                {activeTab === 'personal' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900 dark:text-white">sarah.j@company.com</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-900 dark:text-white">+1 (555) 123-4567</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-medium text-slate-900 dark:text-white">New York, USA</span></div>
                  </motion.div>
                )}
                {activeTab === 'job' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-medium text-slate-900 dark:text-white">Design</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Manager</span><span className="font-medium text-slate-900 dark:text-white">Marcus Webb</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Join Date</span><span className="font-medium text-slate-900 dark:text-white">Oct 12, 2022</span></div>
                  </motion.div>
                )}
                {activeTab === 'documents' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"><FileText className="w-4 h-4"/> Offer_Letter.pdf</div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"><FileText className="w-4 h-4"/> ID_Proof.jpg</div>
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"><FileText className="w-4 h-4"/> NDA_Signed.pdf</div>
                  </motion.div>
                )}
              </div>
            </div>
            
            <div className="absolute -bottom-4 -left-4 bg-amber-400 text-amber-900 font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
              👆 Click the tabs!
            </div>
          </motion.div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 grid md:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <Database className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Custom Fields</h3>
          <p className="text-slate-600 dark:text-slate-400">Add unlimited custom fields to track assets, t-shirt sizes, or anything unique to your company.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <Search className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Smart Directory</h3>
          <p className="text-slate-600 dark:text-slate-400">Instantly find co-workers, view the org chart, and understand reporting structures globally.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-10 h-10 text-indigo-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Access Control</h3>
          <p className="text-slate-600 dark:text-slate-400">Role-based permissions ensure employees only see what they are authorized to see.</p>
        </div>
      </div>

      {/* Visual Feature Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 border-t border-slate-200 dark:border-slate-800 pt-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
              Complete Employee Lifecycle Management
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              From onboarding to offboarding, maintain a seamless trail of documents, assets, and role changes. Get a bird's eye view of your entire organization with dynamic org charts.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Automated onboarding workflows</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Asset allocation tracking</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-indigo-500" /> Real-time organizational charting</li>
            </ul>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl h-[400px]">
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop" alt="Team collaboration" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-indigo-600/20 mix-blend-multiply"></div>
          </div>
        </div>
      </div>

    </div>
  );
}
