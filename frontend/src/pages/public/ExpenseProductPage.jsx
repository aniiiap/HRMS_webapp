import React, { useState } from 'react';
import { Receipt, Camera, CreditCard, PieChart, UploadCloud, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ExpenseProductPage() {
  const prefersReducedMotion = useReducedMotion();
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    if (scanned) return;
    toast.success("Scanning receipt using OCR...", { icon: '🔍' });
    setTimeout(() => {
      setScanned(true);
      toast.success("Amount $42.50 auto-filled!", { icon: '✨' });
    }, 1500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <div className="text-rose-600 dark:text-rose-400 font-bold tracking-wider text-sm uppercase mb-4">Expense Management</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">Automate your <span className="text-rose-500">expense claims</span></h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Scan receipts with OCR, set automated approval hierarchies, and reimburse employees directly along with their payroll.</p>
            <Link to="/demo" className="inline-flex px-8 py-4 text-lg font-semibold rounded-full text-white bg-rose-600 hover:bg-rose-700 transition-all hover:-translate-y-1">Explore Expenses</Link>
          </div>

          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2"><Receipt className="w-5 h-5 text-rose-500" /> Upload Receipt</h3>
              {!scanned ? (
                <button onClick={handleScan} className="w-full h-48 border-2 border-dashed border-rose-300 dark:border-rose-700 rounded-2xl flex flex-col items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="font-bold">Snap a picture of your bill</span>
                  <span className="text-sm text-slate-500">AI will extract the details</span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between text-sm text-slate-500 mb-1"><span>Merchant</span><span>Date</span></div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white"><span>Starbucks Coffee</span><span>Oct 14, 2026</span></div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between text-sm text-slate-500 mb-1"><span>Category</span><span>Amount</span></div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white"><span>Meals & Entertainment</span><span className="text-rose-500">$42.50</span></div>
                  </div>
                  <button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Submit Claim
                  </button>
                </div>
              )}
            </div>
            {!scanned && <div className="absolute -bottom-4 -left-4 bg-amber-400 text-amber-900 font-bold px-4 py-2 rounded-full shadow-lg animate-bounce">👆 Try OCR Scan</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
