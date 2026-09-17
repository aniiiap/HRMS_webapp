import React from 'react';
import { Globe, Target, Award, Users, ShieldCheck, CheckCircle2, Layers, Server, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const values = [
    { 
      icon: Target, 
      title: 'Mission-Driven', 
      desc: 'We believe that managing people should be the easiest part of running a business.',
      cardGradient: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-950 dark:text-emerald-50',
      descColor: 'text-emerald-800/80 dark:text-emerald-100/70',
    },
    { 
      icon: Globe, 
      title: 'Global First', 
      desc: 'Built for the modern, distributed workforce spanning multiple timezones and countries.',
      cardGradient: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-800/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      textColor: 'text-indigo-950 dark:text-indigo-50',
      descColor: 'text-indigo-800/80 dark:text-indigo-100/70',
    },
    { 
      icon: Award, 
      title: 'Excellence', 
      desc: 'We sweat the small stuff to deliver a premium, flawless experience.',
      cardGradient: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-950 dark:text-amber-50',
      descColor: 'text-amber-800/80 dark:text-amber-100/70',
    },
    { 
      icon: Users, 
      title: 'Customer Centric', 
      desc: 'Your feedback drives our roadmap. We build what you actually need.',
      cardGradient: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-rose-950 dark:text-rose-50',
      descColor: 'text-rose-800/80 dark:text-rose-100/70',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-950">
      <div className="py-20 bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
              Building the future of work
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400">
              GlobalWorkSphere was founded with a single mission: to eliminate the friction between HR administrators and employees.
            </p>
          </div>

          {/* Story */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Our Story</h2>
              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-400">
                <p>
                  We started GlobalWorkSphere after experiencing firsthand the pain of managing growing teams using fragmented tools, spreadsheets, and legacy software that felt like it was built in the 90s.
                </p>
                <p>
                  We realized that modern companies need modern tools. They need a system that is secure enough for the enterprise, but intuitive enough that employees actually enjoy using it.
                </p>
                <p>
                  Today, we're proud to power the HR operations of forward-thinking companies around the world, helping them focus on what matters most: their people.
                </p>
              </div>
            </div>
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-square md:aspect-[4/3]">
               <div className="absolute inset-0 bg-gradient-to-tr from-teal-600/20 to-indigo-600/20 mix-blend-multiply z-10" />
               <img 
                 src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80" 
                 alt="Team in a modern office" 
                 className="w-full h-full object-cover relative z-0"
                 onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Team&background=0D8ABC&color=fff&size=800' }}
               />
            </div>
          </div>
        </div>
      </div>

      {/* Values - Now full width background */}
      <div className="py-24 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Our Core Values</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">The principles that guide how we build our product and support our customers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div 
                  key={i} 
                  className={`relative group p-8 rounded-3xl transition-all duration-500 transform hover:-translate-y-2 overflow-hidden flex flex-col items-start border ${v.cardGradient} hover:shadow-xl`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-white/60 dark:bg-slate-900/50 flex items-center justify-center mb-6 shadow-sm border border-white/40 dark:border-slate-800/50 group-hover:scale-110 transition-transform duration-500 ${v.iconColor}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold mb-3 ${v.textColor}`}>{v.title}</h3>
                  <p className={`text-sm leading-relaxed ${v.descColor}`}>{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestones / Traction */}
      <div className="py-16 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4"><Layers className="w-6 h-6 text-teal-600 dark:text-teal-400" /></div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Modern</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Architecture</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4"><Globe className="w-6 h-6 text-teal-600 dark:text-teal-400" /></div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Global</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4"><ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400" /></div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Secure</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Infrastructure</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4"><Activity className="w-6 h-6 text-teal-600 dark:text-teal-400" /></div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Always-On</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Availability</div>
            </div>
          </div>
        </div>
      </div>


      {/* Security & Trust */}
      <div className="py-24 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-8">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Built with Security in Mind</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10">
            We take your data seriously. GlobalWorkSphere is designed with a secure architecture, utilizing industry-standard encryption and strict access controls to ensure your workforce data remains protected.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-500" /> Role-Based Access
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-500" /> Secure Architecture
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-500" /> Data Privacy
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-24 px-6 lg:px-12 relative overflow-hidden bg-teal-800 dark:bg-teal-900">
        {/* Crisp Gradient Border to cleanly separate from Footer */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500 z-20" />
        
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-teal-500/30 blur-[100px] rounded-full pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">Want to join us on this journey?</h2>
          <p className="text-xl text-teal-50 mb-10 max-w-2xl mx-auto leading-relaxed">
            Experience the platform we've poured our hearts into building.
          </p>
          <div>
            <Link 
              to="/demo"
              className="inline-flex items-center justify-center relative rounded-full bg-white text-teal-900 hover:bg-slate-50 px-10 py-5 text-lg font-bold shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-1 hover:scale-105 transition-all duration-300 group"
            >
              Request a Demo
              <span className="absolute inset-0 rounded-full ring-2 ring-white/40 group-hover:animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
