import { useState, useCallback } from 'react';
import { UploadCloud, File, X } from 'lucide-react';

export default function DragDropUpload({ onFileSelect, file }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const removeFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
          ${isDragging 
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 scale-[1.02]' 
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800'}
        `}
      >
        <input 
          type="file" 
          onChange={handleChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          required={!file}
        />
        
        {file ? (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 z-10 w-full max-w-sm">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 rounded-lg shrink-0">
              <File className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={removeFile}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400 pointer-events-none">
            <div className={`p-3 rounded-full transition-colors duration-300 ${isDragging ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
              <span className="text-brand-600 dark:text-brand-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs">SVG, PNG, JPG or PDF (max. 10MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}
