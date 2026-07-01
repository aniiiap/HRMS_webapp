import { Loader2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SmartButton({ 
  children, 
  loading = false, 
  success = false, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Determine base styles
  let baseClass = 'btn-primary';
  if (variant === 'secondary') baseClass = 'btn-secondary';
  if (variant === 'ghost') baseClass = 'btn-ghost';
  if (variant === 'danger') baseClass = 'px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors';
  if (variant === 'success') baseClass = 'px-3 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-medium transition-colors';
  
  // Custom states
  const isDisabled = disabled || loading || showSuccess;

  return (
    <button 
      className={`${baseClass} relative overflow-hidden flex items-center justify-center gap-2 transition-all duration-300 ${className}`}
      disabled={isDisabled}
      {...props}
    >
      <div className={`flex items-center gap-2 transition-transform duration-300 ${loading || showSuccess ? 'scale-0 opacity-0 absolute' : 'scale-100 opacity-100'}`}>
        {children}
      </div>

      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${loading && !showSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>

      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 bg-emerald-500 text-white ${showSuccess ? 'opacity-100 scale-100' : 'opacity-0 scale-150'}`}>
        <Check className="w-5 h-5" />
      </div>
    </button>
  );
}
