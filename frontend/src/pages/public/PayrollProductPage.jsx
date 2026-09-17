import React, { useState, useEffect } from 'react';
import { Calculator, Banknote, ShieldAlert, FileSpreadsheet, Send, ArrowRight, Activity, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function PayrollProductPage() {
  const prefersReducedMotion = useReducedMotion();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let interval;
    if (isProcessing) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (progress >= 100 && isProcessing) {
      setIsProcessing(false);
      setCompleted(true);
      toast.success("Payroll processed successfully for 142 employees!", { duration: 4000 });
    }
  }, [progress, isProcessing]);

  const handleRunPayroll = () => {
    if (isProcessing || completed) return;
    setIsProcessing(true);
    setProgress(0);
  };

  const resetPayroll = () => {
    setCompleted(false);
    setProgress(0);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="text-left">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-sm uppercase mb-4">
              Payroll Management
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
              Run payroll in <span className="text-emerald-500">minutes, not days</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Automate complex deductions, taxes, and compliances. Disburse salaries instantly with 100% accuracy and generate detailed payslips on autopilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/demo" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1">
                Explore Payroll
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-700 text-white overflow-hidden relative">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500 opacity-20 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold">Run Payroll</h3>
                  <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-sm font-medium">October 2026</span>
                </div>

                <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Total Employees</span>
                    <span className="font-bold">142</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Gross Payroll</span>
                    <span className="font-bold">$842,500.00</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-400">Net Payable</span>
                    <span className="font-bold text-emerald-400">$690,120.00</span>
                  </div>
                </div>

                {!completed ? (
                  <button 
                    onClick={handleRunPayroll}
                    disabled={isProcessing}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-slate-900 disabled:text-slate-500 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Activity className="w-5 h-5 animate-pulse" /> Processing... {progress}%
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" /> Process & Disburse
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold mb-2">Payroll Complete!</h4>
                    <button onClick={resetPayroll} className="text-sm text-slate-400 hover:text-white underline">Run another batch</button>
                  </div>
                )}
                
                {isProcessing && (
                  <div className="w-full bg-slate-800 h-2 mt-4 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-100" style={{ width: `${progress}%` }}></div>
                  </div>
                )}
              </div>
            </div>
            {!isProcessing && !completed && (
              <div className="absolute -bottom-4 -left-4 bg-amber-400 text-amber-900 font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce z-20">
                👆 Try running payroll!
              </div>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 grid md:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <Banknote className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">1-Click Payouts</h3>
          <p className="text-slate-600 dark:text-slate-400">Directly route salaries to employee bank accounts without downloading external bank files.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <ShieldAlert className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Auto-Compliance</h3>
          <p className="text-slate-600 dark:text-slate-400">Tax deductions, PF, PT, and ESI are calculated automatically ensuring you stay 100% compliant.</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
          <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Digital Payslips</h3>
          <p className="text-slate-600 dark:text-slate-400">Employees receive their detailed, branded payslips instantly on their mobile app or email.</p>
        </div>
      </div>

      {/* Visual Feature Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32 border-t border-slate-200 dark:border-slate-800 pt-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative rounded-3xl overflow-hidden shadow-2xl h-[400px]">
            <img src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2036&auto=format&fit=crop" alt="Accounting dashboard" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-emerald-600/20 mix-blend-multiply"></div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-6">
              Flawless Year-End Taxes & Reporting
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              Never worry about tax season again. Generate Form 16s, run compliance audits, and download detailed general ledger (GL) reports that sync directly with your accounting software.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Auto-generated Form 16 & tax declarations</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Seamless ERP/Accounting integrations (Tally, QuickBooks)</li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Encrypted employee salary data</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
