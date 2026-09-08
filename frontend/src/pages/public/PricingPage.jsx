import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Sparkles, Building2, Zap, ShieldCheck } from 'lucide-react';

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [currency, setCurrency] = useState('INR'); // 'INR' or 'USD'

  const plans = [
    {
      name: 'Starter',
      desc: 'Perfect for small teams getting started with digital HR.',
      price: {
        INR: annual ? '59' : '89',
        USD: annual ? '0.49' : '0.79'
      },
      period: '/ employee / month',
      popular: false,
      icon: <Building2 className="h-6 w-6 text-blue-500" />,
      features: [
        'Core HR Database',
        'Basic Attendance Tracking',
        'Leave Management',
        'Employee Self-Service Portal',
        'Standard Email Support',
      ],
      missing: [
        'Automated Payroll Processing',
        'Advanced Analytics',
        'Custom Roles & Permissions',
      ]
    },
    {
      name: 'Professional',
      desc: 'The complete suite for growing companies.',
      price: {
        INR: annual ? '99' : '129',
        USD: annual ? '0.89' : '1.19'
      },
      period: '/ employee / month',
      popular: true,
      icon: <Zap className="h-6 w-6 text-amber-500" />,
      features: [
        'Everything in Starter',
        'Automated Payroll & Payslips',
        'Biometric Integration Support',
        'Advanced Custom Reports',
        'Helpdesk & Ticketing System',
        'Custom Roles & Permissions',
        'Priority Support',
      ],
      missing: []
    },
    {
      name: 'Enterprise',
      desc: 'For large organizations needing scale and customization.',
      price: {
        INR: 'Custom',
        USD: 'Custom'
      },
      period: '',
      popular: false,
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
      features: [
        'Everything in Professional',
        'Multi-Entity Management',
        'Dedicated Account Manager',
        'Custom API Integrations',
        'White-labeling Options',
        'SLA Guarantees',
        'On-premise Deployment available',
      ],
      missing: []
    }
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans pb-24">
      {/* Background Mesh Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-brand-50 via-white to-transparent dark:from-brand-950/30 dark:via-slate-950 dark:to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brand-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-semibold mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Simple & Transparent Pricing</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Plans built for <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
              ambitious teams.
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            No hidden fees. No surprise charges. Choose the plan that best fits your company's needs and scale effortlessly.
          </p>
          
          {/* Toggles Container */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 w-fit mx-auto">
            {/* Currency Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setCurrency('INR')}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currency === 'INR' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                INR (₹)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${currency === 'USD' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                USD ($)
              </button>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Billing Toggle */}
            <div className="flex items-center gap-3 px-4">
              <span className={`text-sm font-bold ${!annual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</span>
              <button 
                onClick={() => setAnnual(!annual)}
                className="relative inline-flex h-8 w-16 items-center rounded-full bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${annual ? 'translate-x-9' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-bold flex items-center gap-2 ${annual ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                Annually
                <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-1 rounded-full border border-green-200 dark:border-green-800">
                  Save 20%
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start relative z-10">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 ${
                plan.popular 
                  ? 'border-2 border-brand-500 shadow-2xl shadow-brand-500/15 transform lg:-translate-y-4 z-20' 
                  : 'border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-slate-300 transition-all z-10'
              } flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest py-2 px-6 rounded-full shadow-lg border border-brand-400/30">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed min-h-[40px]">{plan.desc}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700">
                  {plan.icon}
                </div>
              </div>
              
              <div className="mb-8">
                <div className="flex items-end gap-1">
                  {plan.price[currency] !== 'Custom' && (
                    <span className="text-2xl font-bold text-slate-400 mb-1">
                      {currency === 'INR' ? '₹' : '$'}
                    </span>
                  )}
                  <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {plan.price[currency]}
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2 h-5">
                  {plan.period}
                </div>
              </div>
              
              <Link
                to="/demo"
                className={`w-full py-4 px-6 rounded-2xl font-bold text-center transition-all duration-300 mb-8 ${
                  plan.popular
                    ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25 active:scale-[0.98]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98]'
                }`}
              >
                {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </Link>
              
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">What's included in {plan.name}</p>
                <ul className="space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 bg-green-100 dark:bg-green-900/30 rounded-full p-0.5 shrink-0">
                        <Check className="h-3 w-3 text-green-600 dark:text-green-400" strokeWidth={3} />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                  {plan.missing && plan.missing.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 opacity-40">
                      <div className="mt-0.5 bg-slate-200 dark:bg-slate-700 rounded-full p-0.5 shrink-0">
                        <X className="h-3 w-3 text-slate-500 dark:text-slate-400" strokeWidth={3} />
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 text-sm font-medium line-through">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        {/* FAQ Section */}
        <div className="mt-32 max-w-4xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything you need to know about the product and billing.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Can I change my plan later?</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Absolutely. You can upgrade or downgrade your plan at any time. Prorated charges or credits will be automatically applied to your account.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">What happens if we add more employees?</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Our pricing automatically scales with your team. As you add employees to the system, your monthly or annual billing will adjust automatically.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Do you offer a free trial?</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Instead of a generic trial, we prefer to give you a personalized demo using your actual use-cases, so you can see exactly how it works for your company.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">What is included in Enterprise?</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Enterprise includes custom API integrations, dedicated account management, white-labeling, and on-premise deployment options. Contact sales to discuss.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
