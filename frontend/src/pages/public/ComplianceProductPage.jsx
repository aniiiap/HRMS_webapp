import React, { useState } from 'react';
import { Scale, FileCheck, ShieldAlert, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ComplianceProductPage() {
  const [fixed, setFixed] = useState(false);

  const handleFix = () => {
    toast.success("Recalculating PF contributions...", { icon: '⚙️' });
    setTimeout(() => {
      setFixed(true);
      toast.success("Compliance issue resolved!", { icon: '✅' });
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <div className="text-blue-600 dark:text-blue-400 font-bold tracking-wider text-sm uppercase mb-4">Statutory Compliance</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">Stay ahead of <span className="text-blue-500">regulations</span></h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Automatically calculate and file PF, ESI, TDS, and PT. Our engine updates in real-time with changing local laws.</p>
            <Link to="/demo" className="inline-flex px-8 py-4 text-lg font-semibold rounded-full text-white bg-blue-600 hover:bg-blue-700 transition-all hover:-translate-y-1">Explore Compliance</Link>
          </div>

          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Compliance Health</h3>
              
              {!fixed ? (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold mb-2">
                    <AlertCircle className="w-5 h-5" /> Action Required
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">3 employees have missing PAN details causing TDS anomalies in the upcoming payroll.</p>
                  <button onClick={handleFix} className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Auto-Fix with Default Rate</button>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold mb-2">
                    <CheckCircle className="w-5 h-5" /> All Clear
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Your organization is 100% compliant for the current payroll cycle.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
