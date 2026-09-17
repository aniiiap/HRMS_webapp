import React, { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

export default function RequestDemoPage() {
  const prefersReducedMotion = useReducedMotion();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    employees: '1-50',
    message: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/api/public/contact-us/', formData);
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        employees: '1-50',
        message: '',
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden pt-24 pb-20">
      {/* Decorative Background Orbs */}
      <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* Left Column - Contact Info */}
          <motion.div 
            variants={!prefersReducedMotion ? containerVariants : {}}
            initial="hidden"
            animate="show"
            className="pt-8"
          >
            <motion.div variants={itemVariants} className="text-brand-600 dark:text-brand-400 font-bold tracking-wider text-sm uppercase mb-4">
              Get in touch
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
                Let's transform your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-indigo-500">workplace</span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed">
                Whether you're looking for a personalized demo, need pricing details, or have technical questions—our team of HR specialists is here to help.
              </p>
            </motion.div>

            <div className="space-y-8">
              <motion.div variants={itemVariants} className="group flex items-start gap-5 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:shadow-brand-500/10 transition-all cursor-default">
                <div className="h-14 w-14 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Email us</h3>
                  <p className="text-slate-600 dark:text-slate-400">globalworksphere@gmail.com</p>
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants} className="group flex items-start gap-5 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:shadow-brand-500/10 transition-all cursor-default">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Call us</h3>
                  <p className="text-slate-600 dark:text-slate-400">+91 9351060628</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="group flex items-start gap-5 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:shadow-brand-500/10 transition-all cursor-default">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Global Headquarters</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    6203 San Ignacio Avenue Suite 110<br />
                    San Jose, CA 95119
                  </p>
                </div>
              </motion.div>
            </div>

          </motion.div>

          {/* Right Column - Floating Form */}
          <motion.div 
            initial={!prefersReducedMotion ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative lg:mt-0 mt-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500 to-indigo-500 rounded-[2.5rem] transform rotate-3 scale-[1.02] opacity-20 blur-sm dark:opacity-40"></div>
            
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-700 relative overflow-hidden z-10 backdrop-blur-xl">
              {success ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md z-20"
                >
                  <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Request Sent!</h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                    Thank you for reaching out. A member of our team will get back to you shortly to schedule your demo.
                  </p>
                  <button 
                    onClick={() => setSuccess(false)}
                    className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold hover:text-brand-700 transition-colors"
                  >
                    Send another request <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : null}

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Send a Message</h2>
                  <p className="text-slate-500 text-sm">Fill out the form below</p>
                </div>
              </div>
              
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Company Name</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Work Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Employee Count</label>
                  <select
                    name="employees"
                    value={formData.employees}
                    onChange={handleChange}
                    className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="1-50">1 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="201-500">201 - 500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">How can we help? *</label>
                  <textarea
                    name="message"
                    required
                    rows="4"
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all resize-none"
                    placeholder="Tell us a bit about your current HR setup and what you're looking for..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 rounded-xl bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? 'Sending Request...' : 'Submit Request'}
                </button>
                <p className="text-center text-xs text-slate-500 font-medium">By submitting this form, you agree to our Privacy Policy.</p>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
