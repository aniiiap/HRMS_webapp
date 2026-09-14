import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Users, Zap, Calendar, Receipt, FileText, 
  LineChart, ShieldCheck, Smartphone, CheckCircle2,
  Trophy, ArrowRight, Heart, Sparkles
} from 'lucide-react';

const products = [
  {
    id: 'core-hr-database',
    title: 'Core HR Database',
    tagline: 'The single source of truth for your people',
    desc: 'Maintain all your employee records in one unified, secure place. Say goodbye to scattered spreadsheets and hello to an organized, accessible, and compliant database.',
    features: ['Centralized Employee Profiles', 'Document Management', 'Organizational Charts', 'Custom Fields & Tags'],
    icon: <Users className="w-12 h-12 text-indigo-500" />,
    color: 'from-indigo-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'payroll-management',
    title: 'Payroll Management',
    tagline: 'Flawless payroll, every single time',
    desc: 'Automate salary processing, tax calculations, and compliance without the headache. Ensure your team gets paid accurately and on time, with transparent payslips.',
    features: ['1-Click Payroll Run', 'Automated Tax Calculations', 'Statutory Compliance', 'Digital Payslips'],
    icon: <Zap className="w-12 h-12 text-blue-500" />,
    color: 'from-blue-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    reverse: true
  },
  {
    id: 'leave-attendance',
    title: 'Leave & Attendance',
    tagline: 'Track time and absences effortlessly',
    desc: 'Customizable leave policies, automated accruals, and multi-level approval workflows. Track clock-ins with precision using web or biometric integrations.',
    features: ['Web & App Clock-in', 'Custom Leave Policies', 'Holiday Calendars', 'Automated Accruals'],
    icon: <Calendar className="w-12 h-12 text-emerald-500" />,
    color: 'from-emerald-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'expense-management',
    title: 'Expense Management',
    tagline: 'Control spend and reimburse faster',
    desc: 'Let employees capture receipts on the go. Route expenses through custom approval chains and automatically sync with payroll for swift reimbursement.',
    features: ['Receipt OCR Scanning', 'Multi-level Approvals', 'Expense Policies', 'Payroll Integration'],
    icon: <Receipt className="w-12 h-12 text-rose-500" />,
    color: 'from-rose-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',
    reverse: true
  },
  {
    id: 'document-center',
    title: 'Document Center',
    tagline: 'Automate HR letters and paperwork',
    desc: 'Generate offer letters, relieving letters, and custom templates populated instantly with employee data. Securely store and distribute company policies.',
    features: ['Dynamic Variables', 'E-Signatures', 'Bulk Generation', 'Policy Acknowledgements'],
    icon: <FileText className="w-12 h-12 text-amber-500" />,
    color: 'from-amber-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'performance-growth',
    title: 'Performance & Growth',
    tagline: 'Unlock your team\'s full potential',
    desc: 'Align teams with overarching goals, conduct 360-degree reviews, and foster continuous feedback. Build a culture of recognition and continuous improvement.',
    features: ['Goal Tracking (OKRs)', '360-Degree Feedback', 'Appraisal Cycles', '1-on-1 Meetings'],
    icon: <LineChart className="w-12 h-12 text-violet-500" />,
    color: 'from-violet-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
    reverse: true
  },
  {
    id: 'statutory-compliance',
    title: 'Statutory Compliance',
    tagline: 'Stay on the right side of the law',
    desc: 'Automatically generate required statutory reports (PF, PT, ESI, TDS). We keep track of changing labor laws so you never miss a compliance deadline.',
    features: ['PF & ESI Reports', 'TDS Challans', 'Form 16 Generation', 'Audit Trails'],
    icon: <ShieldCheck className="w-12 h-12 text-cyan-500" />,
    color: 'from-cyan-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'employee-self-service',
    title: 'Employee Self-Service',
    tagline: 'Empower your workforce on the go',
    desc: 'Give employees access to their own data, payslips, and requests through an intuitive mobile-friendly portal. Reduce HR queries and empower your team.',
    features: ['Mobile Friendly', 'View Payslips', 'Update Information', 'Raise IT/HR Tickets'],
    icon: <Smartphone className="w-12 h-12 text-fuchsia-500" />,
    color: 'from-fuchsia-500/10 to-transparent',
    imgSrc: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=800&q=80',
    reverse: true
  }
];

// Tailwind representation of the Value Chain Graphic (Gorgeous Stepper Design)
const ValueChain = () => {
  const steps = [
    { title: "Good Employee Experience", color: "text-amber-500", shadow: "shadow-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-400", icon: <Users size={26} className="text-amber-500" /> },
    { title: "Improved Employee Engagement", color: "text-orange-500", shadow: "shadow-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-400", icon: <LineChart size={26} className="text-orange-500" /> },
    { title: "Good Customer Experience", color: "text-fuchsia-500", shadow: "shadow-fuchsia-500", bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30", border: "border-fuchsia-400", icon: <Heart size={26} className="text-fuchsia-500" /> },
    { title: "Unlocking Business Growth", color: "text-blue-500", shadow: "shadow-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-400", icon: <Trophy size={26} className="text-blue-500" /> }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 relative">
      {/* Connecting Line - perfectly centered behind the circles (which are 96px tall, so top is 48px from the relative container containing the circles) */}
      <div className="hidden md:block absolute top-[80px] left-[15%] right-[15%] h-2 bg-slate-200 dark:bg-slate-800 rounded-full z-0">
         <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-blue-500 rounded-full opacity-60 blur-sm"></div>
         <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-blue-500 rounded-full"></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between relative z-10 gap-16 md:gap-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex flex-col items-center flex-1 text-center group">
            {/* Icon Circle */}
            <div className={`w-24 h-24 rounded-full bg-white dark:bg-slate-900 shadow-xl ${step.shadow}/30 border-[6px] ${step.border} flex items-center justify-center mb-6 transform transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2 group-hover:rotate-[10deg]`}>
              <div className={`w-14 h-14 rounded-full ${step.bg} flex items-center justify-center`}>
                {step.icon}
              </div>
            </div>
            
            {/* Text Content */}
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 max-w-[200px] leading-tight">
              {step.title}
            </h4>
            
            {/* Mobile Arrow */}
            {idx < steps.length - 1 && (
              <ArrowRight className="md:hidden mt-8 text-slate-300" size={24} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function FeaturesPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = React.useState('');

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        // slight delay to ensure layout is done
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      window.scrollTo(0,0);
    }
  }, [location]);

  // ScrollSpy to highlight active section dynamically
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -50% 0px' }
    );

    products.forEach((p) => {
      const el = document.getElementById(p.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-white dark:bg-[#0b0f19] min-h-screen pt-24 pb-20 font-sans">
      
      {/* The Value Chain Graphic */}
      <div className="mt-8 mb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-black tracking-widest uppercase mb-6 shadow-sm border border-brand-100 dark:border-brand-800">
            <Sparkles size={16} /> Our Philosophy
          </div>
          <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            The Path to <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">Growth</span>
          </h3>
          <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium">
            Discover how a flawless employee experience translates directly into outstanding customer satisfaction and unstoppable business growth.
          </p>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-900/30 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 border border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden">
          {/* Decorative background blobs for the container */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-300/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-300/10 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>
          
          <ValueChain />
        </div>
      </div>

      {/* Products Mapping */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
        {products.map((product) => {
          const isActive = activeSection === product.id;
          return (
          <div 
            id={product.id} 
            key={product.id} 
            className={`scroll-mt-32 p-8 md:p-12 rounded-[3rem] transition-all duration-700 ${isActive ? 'bg-brand-50/50 dark:bg-brand-900/20 ring-4 ring-brand-500/30 scale-[1.01] shadow-2xl' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'} flex flex-col ${product.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 lg:gap-24`}
          >
            
            {/* Text Content */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-2">
                {product.icon}
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
                {product.title}
              </h2>
              <h3 className="text-xl font-medium text-brand-600 dark:text-brand-400">
                {product.tagline}
              </h3>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                {product.desc}
              </p>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {product.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Image / Graphic */}
            <div className="flex-1 w-full">
              <div className={`relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-tr ${product.color} p-1`}>
                <div className="relative rounded-[22px] overflow-hidden bg-white dark:bg-slate-900 aspect-video md:aspect-square lg:aspect-[4/3]">
                  <img 
                    src={product.imgSrc} 
                    alt={product.title} 
                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-500 hover:scale-105 transform"
                  />
                  {/* Decorative Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
                </div>
              </div>
            </div>

          </div>
        );
        })}
      </div>
      
    </div>
  );
}
