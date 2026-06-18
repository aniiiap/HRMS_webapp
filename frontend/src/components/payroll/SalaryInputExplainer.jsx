/** Plain-language help: monthly gross vs CTC (shown on salary structure). */
export default function SalaryInputExplainer({ inputMode = 'gross' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
      <p className="font-semibold text-slate-900 dark:text-white">Monthly salary vs CTC — what&apos;s the difference?</p>
      {inputMode === 'gross' ? (
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-xs leading-relaxed">
          <li>
            <strong>Monthly gross salary</strong> = what you usually mean by &quot;salary is ₹20,000&quot;. It is the total
            <strong> earnings on the payslip</strong> (Basic + HRA + allowances…) <em>before</em> PF, PT and TDS are deducted.
          </li>
          <li>
            <strong>Monthly CTC</strong> = total cost to the <strong>company</strong>. It is <em>higher</em> than gross because
            the company also pays employer PF, gratuity and health insurance on top.
          </li>
          <li>
            <strong>Net in bank</strong> = gross minus PF, professional tax, TDS — what the employee actually receives.
          </li>
        </ul>
      ) : inputMode === 'annual' ? (
        <p className="mt-2 text-xs leading-relaxed">
          You entered <strong>annual CTC</strong> (full company cost per year). The system splits it into in-hand gross +
          employer costs. Gross will be <em>less than</em> monthly CTC — that is normal.
        </p>
      ) : (
        <p className="mt-2 text-xs leading-relaxed">
          You entered <strong>monthly CTC</strong> (full company cost per month). In-hand gross is calculated after removing
          employer PF, gratuity and insurance.
        </p>
      )}
      <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-slate-900/50">
        <strong>Example:</strong> Employee gross ₹20,000 → company CTC is roughly ₹23,000–₹24,000 (extra ~₹3k for employer PF
        etc.) → after employee PF &amp; PT, net in bank ≈ ₹18,000–₹19,000.
      </p>
    </div>
  )
}
