import { X, ExternalLink } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ReceiptViewerModal({ url, onClose }) {
  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!url) return null;

  const isPdf = url.toLowerCase().endsWith('.pdf');

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col max-h-full sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <h3 className="text-lg font-semibold text-white">Receipt Preview</h3>
          <div className="flex items-center gap-2">
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open Original</span>
            </a>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 sm:p-6 flex items-center justify-center min-h-0">
          {isPdf ? (
            <iframe 
              src={`${url}#toolbar=0`} 
              className="w-full h-full min-h-[50vh] rounded-lg bg-white"
              title="Receipt PDF"
            />
          ) : (
            <img 
              src={url} 
              alt="Receipt" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg" 
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
