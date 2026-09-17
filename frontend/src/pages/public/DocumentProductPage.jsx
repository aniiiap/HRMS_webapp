import React, { useState } from 'react';
import { FolderOpen, FileSignature, Lock, Upload, FileText, CheckCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DocumentProductPage() {
  const [signed, setSigned] = useState(false);

  const handleSign = () => {
    toast.success("Applying secure digital signature...", { icon: '✍️' });
    setTimeout(() => {
      setSigned(true);
      toast.success("Document signed successfully!");
    }, 1200);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <div className="text-cyan-600 dark:text-cyan-400 font-bold tracking-wider text-sm uppercase mb-4">Document Center</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">Go entirely <span className="text-cyan-500">paperless</span></h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Generate auto-filled offer letters, securely store compliance documents, and collect legally-binding e-signatures from employees instantly.</p>
            <Link to="/demo" className="inline-flex px-8 py-4 text-lg font-semibold rounded-full text-white bg-cyan-600 hover:bg-cyan-700 transition-all hover:-translate-y-1">Explore Documents</Link>
          </div>

          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6 h-48 flex flex-col items-center justify-center relative overflow-hidden">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Non-Disclosure Agreement (NDA)</h4>
                <p className="text-xs text-slate-500">Waiting for your signature</p>
                {signed && <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center backdrop-blur-sm"><CheckCircle className="w-16 h-16 text-emerald-500" /></div>}
              </div>
              <button 
                onClick={handleSign}
                disabled={signed}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {signed ? "Signed & Locked" : <><FileSignature className="w-5 h-5" /> Click to E-Sign</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
