import React, { useState } from 'react';
import { User, MessageCircle, HelpCircle, Laptop, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ESSProductPage() {
  const [ticket, setTicket] = useState(false);

  const raiseTicket = () => {
    toast.success("Ticket raised to IT Support!", { icon: '🎫' });
    setTicket(true);
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="text-left">
            <div className="text-orange-600 dark:text-orange-400 font-bold tracking-wider text-sm uppercase mb-4">Employee Self-Service</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">Empower your <span className="text-orange-500">workforce</span></h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Give employees an intuitive portal to download payslips, raise helpdesk tickets, and update their own personal details.</p>
            <Link to="/demo" className="inline-flex px-8 py-4 text-lg font-semibold rounded-full text-white bg-orange-600 hover:bg-orange-700 transition-all hover:-translate-y-1">Explore ESS</Link>
          </div>

          <div className="relative">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white flex items-center gap-2"><HelpCircle className="w-5 h-5 text-orange-500" /> IT Helpdesk</h3>
              
              {!ticket ? (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Issue Category: <span className="font-normal">Hardware Replacement</span></p>
                  </div>
                  <textarea className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm" rows="3" placeholder="Describe your issue..." defaultValue="My laptop battery is draining very quickly. Requesting a replacement." readOnly></textarea>
                  <button onClick={raiseTicket} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg">Submit Ticket</button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <HeartHandshake className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Ticket #IT-8492 Logged</h4>
                  <p className="text-slate-500">IT Support has been notified and will reach out shortly.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
