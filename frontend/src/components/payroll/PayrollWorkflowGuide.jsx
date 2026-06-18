export default function PayrollWorkflowGuide() {
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-6 shadow-sm dark:border-brand-900/50 dark:bg-brand-950/20">
      <h3 className="mb-4 text-lg font-semibold text-brand-900 dark:text-brand-100">Payroll Workflow Guide</h3>
      <p className="mb-6 text-sm text-brand-700 dark:text-brand-300">
        Follow these steps in order to accurately process payroll for your organization.
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">1</span>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Payroll Setup</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure PF/ESI limits, define salary components, and create structure templates.</p>
        </div>

        <div className="hidden md:block text-slate-300 dark:text-slate-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        <div className="flex-1 rounded-lg border border-brand-300 bg-brand-50 p-4 shadow-sm dark:border-brand-700 dark:bg-brand-900/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-200 text-xs font-bold text-brand-700 dark:bg-brand-800 dark:text-brand-200">2</span>
            <h4 className="font-semibold text-brand-900 dark:text-brand-100">Assign Structure</h4>
          </div>
          <p className="text-xs text-brand-700 dark:text-brand-300">Assign the salary structure to employees with their agreed CTC amount.</p>
        </div>

        <div className="hidden md:block text-slate-300 dark:text-slate-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </div>

        <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 p-4 shadow-sm dark:border-emerald-700 dark:bg-emerald-900/40">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">3</span>
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Run Payroll</h4>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Generate draft runs, verify payslips, and finalize for payout.</p>
        </div>

      </div>
    </div>
  )
}
