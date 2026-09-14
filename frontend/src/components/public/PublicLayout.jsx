import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Globe, Menu, X, ArrowRight, Twitter, Linkedin, Github, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function MobileNavItem({ link }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between">
        <Link
          to={link.path}
          className="text-base font-medium text-slate-800 dark:text-slate-200 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex-1"
        >
          {link.name}
        </Link>
        {link.dropdown && (
          <button 
            onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
            className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {link.dropdown && isOpen && (
        <div className="ml-4 flex flex-col gap-1 border-l-2 border-slate-100 dark:border-slate-800 pl-4 mt-1">
          {link.dropdown.map(item => (
            <Link 
              key={item}
              to={`/features#${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 py-2 hover:text-brand-600 dark:hover:text-brand-400"
            >
              {item}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and scroll to top on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = [
    { 
      name: 'Products', 
      path: '/products',
      dropdown: [
        'Core HR Database',
        'Payroll Management',
        'Leave & Attendance',
        'Expense Management',
        'Document Center',
        'Performance & Growth',
        'Statutory Compliance',
        'Employee Self-Service'
      ]
    },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent ${
          isScrolled 
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-sm py-3' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center group">
              <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-14 sm:h-20 w-auto object-contain group-hover:scale-105 transition-transform -ml-4 sm:-ml-6 lg:-ml-8" />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <div key={link.name} className="relative group py-4">
                    <Link
                      to={link.path}
                      className={`text-sm font-medium transition-colors ${
                        isActive 
                          ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 pb-1' 
                          : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400'
                      }`}
                    >
                      {link.name}
                      {link.dropdown && <ChevronDown className="inline-block w-4 h-4 ml-1 opacity-60" />}
                    </Link>
                    
                    {link.dropdown && (
                      <div className="absolute top-full left-0 mt-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        {link.dropdown.map(item => (
                          <Link 
                            key={item} 
                            to={`/features#${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                            className="block px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                          >
                            {item}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <Link
                  to={user.is_superuser && !user.organization_id ? '/platform' : '/dashboard'}
                  className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 transition-colors"
                >
                  Log in
                </Link>
              )}
              <Link
                to="/demo"
                className="text-sm font-medium bg-brand-600 text-white px-5 py-2.5 rounded-full hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/25 transition-all flex items-center gap-2"
              >
                Request a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-slate-600 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl p-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <MobileNavItem key={link.name} link={link} />
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
            {user ? (
              <Link
                to={user.is_superuser && !user.organization_id ? '/platform' : '/dashboard'}
                className="text-base font-medium text-slate-800 dark:text-slate-200 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-base font-medium text-slate-800 dark:text-slate-200 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Log in
              </Link>
            )}
            <Link
              to="/demo"
              className="text-center text-base font-medium bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors mt-2"
            >
              Request a Demo
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-12">
            
            <div className="md:col-span-5 lg:col-span-4">
              <Link to="/" className="flex items-center mb-6">
                <img src="/Sw%20logo/globalworkspherelogo.png" alt="GlobalWorkSphere" className="h-16 sm:h-24 w-auto object-contain -ml-4 sm:-ml-6 lg:-ml-8" />
              </Link>
              <p className="text-base leading-relaxed mb-6 max-w-sm">
                The premium multi-tenant HRMS solution designed for modern enterprises. Simplify payroll, attendance, and leave management effortlessly.
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="font-semibold text-white">Email:</span>
                <a href="mailto:globalworksphere@gmail.com" className="hover:text-brand-400 transition-colors">
                  globalworksphere@gmail.com
                </a>
              </div>
            </div>

            <div className="md:col-span-7 lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Product</h3>
                <ul className="space-y-4 text-sm">
                  <li><Link to="/products" className="hover:text-brand-400 transition-colors">Features</Link></li>
                  <li><Link to="/pricing" className="hover:text-brand-400 transition-colors">Pricing</Link></li>
                  <li><Link to="/demo" className="hover:text-brand-400 transition-colors">Request Demo</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Company</h3>
                <ul className="space-y-4 text-sm">
                  <li><Link to="/about" className="hover:text-brand-400 transition-colors">About Us</Link></li>
                  <li><Link to="/contact" className="hover:text-brand-400 transition-colors">Contact</Link></li>
                  <li>
                    {user ? (
                      <Link to={user.is_superuser && !user.organization_id ? '/platform' : '/dashboard'} className="hover:text-brand-400 transition-colors">Dashboard</Link>
                    ) : (
                      <Link to="/login" className="hover:text-brand-400 transition-colors">Sign In</Link>
                    )}
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Legal</h3>
                <ul className="space-y-4 text-sm">
                  <li><Link to="#" className="hover:text-brand-400 transition-colors">Privacy Policy</Link></li>
                  <li><Link to="#" className="hover:text-brand-400 transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>

          </div>
          
          <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              Â© {new Date().getFullYear()} GlobalWorkSphere. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
