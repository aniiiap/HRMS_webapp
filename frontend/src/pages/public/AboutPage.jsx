import React from 'react';
import { Globe, Target, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  const values = [
    { icon: <Target className="h-8 w-8 text-brand-600" />, title: 'Mission-Driven', desc: 'We believe that managing people should be the easiest part of running a business.' },
    { icon: <Globe className="h-8 w-8 text-brand-600" />, title: 'Global First', desc: 'Built for the modern, distributed workforce spanning multiple timezones and countries.' },
    { icon: <Award className="h-8 w-8 text-brand-600" />, title: 'Excellence', desc: 'We sweat the small stuff to deliver a premium, flawless experience.' },
    { icon: <Users className="h-8 w-8 text-brand-600" />, title: 'Customer Centric', desc: 'Your feedback drives our roadmap. We build what you actually need.' },
  ];

  return (
    <div className="py-20 bg-white dark:bg-slate-900">
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
             <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 to-indigo-600/20 mix-blend-multiply z-10" />
             <img 
               src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80" 
               alt="Team in a modern office" 
               className="w-full h-full object-cover relative z-0"
               onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Team&background=0D8ABC&color=fff&size=800' }}
             />
          </div>
        </div>
      </div>

      {/* Values - Now full width background */}
      <div className="py-24 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Our Core Values</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">The principles that guide how we build our product and support our customers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((v, i) => (
              <div 
                key={i} 
                className="text-center group p-8 rounded-3xl bg-white dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-slate-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-800"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 mb-6 group-hover:scale-110 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-all duration-500">
                  {React.cloneElement(v.icon, { className: "h-8 w-8 text-brand-600 transition-colors" })}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{v.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        {/* CTA */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-10 md:p-16 text-center border border-amber-100 dark:border-amber-800/50 mt-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 text-left">
            <div className="bg-brand-600 rounded-full p-4 shrink-0 shadow-lg shadow-brand-500/30">
              <Globe className="h-10 w-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Want to join us on this journey?</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Experience the platform we've poured our hearts into building.
              </p>
            </div>
          </div>
          <Link to="/demo" className="shrink-0 px-8 py-4 text-lg font-semibold rounded-full text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 hover:border-brand-600 hover:text-brand-600 dark:hover:border-brand-400 dark:hover:text-brand-400 transition-colors bg-white dark:bg-slate-800">
            Request a Demo
          </Link>
        </div>
      </div>
    </div>
  );
}
