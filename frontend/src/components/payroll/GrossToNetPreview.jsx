import { useMemo } from 'react'
import { estimateBreakdown, fmtInr, fmtInrFull, previewFromGrossLocal } from '../../utils/payrollFormat'

/** Live earnings + statutory estimate panel (display only). */
export default function GrossToNetPreview({ monthlyGross, preview, compFlags = {}, variant = 'card' }) {
  const livePreview = useMemo(() => {
    if (preview?.lines?.length) return preview
    return previewFromGrossLocal(monthlyGross)
  }, [preview, monthlyGross])

  const b = useMemo(() => estimateBreakdown(livePreview, compFlags), [livePreview, compFlags])

  if (!b.gross) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
        Enter monthly gross to see live breakdown
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="grid gap-2 text-sm">
        <Row label="Basic (40%)" value={fmtInrFull(b.basic)} />
        <Row label="DA (10%)" value={fmtInrFull(b.da)} />
        <Row label="HRA" value={fmtInrFull(b.hra)} />
        <Row label="Special Allowance" value={fmtInrFull(b.specialAllowance)} />
        <Row label="Gross salary" value={fmtInrFull(b.gross)} bold />
        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
        <Row label="Est. PF" value={`− ${fmtInrFull(b.pf)}`} muted />
        <Row label="Est. ESI" value={`− ${fmtInrFull(b.esi)}`} muted />
        <Row label="Est. PT" value={`− ${fmtInrFull(b.pt)}`} muted />
        <Row label="Est. net salary" value={fmtInrFull(b.net)} bold accent />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-5 text-white shadow-glow">
        <p className="text-xs font-medium uppercase tracking-wider text-white/75">Estimated net salary</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{fmtInr(b.net)}</p>
        <p className="mt-1 text-sm text-white/80">Before attendance proration & pay run</p>
      </div>

      <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Earnings</p>
        <div className="mt-3 space-y-2">
          <Row label="Basic (40%)" value={fmtInrFull(b.basic)} />
          <Row label="Dearness allowance (10%)" value={fmtInrFull(b.da)} />
          <Row label="HRA (40% of Basic)" value={fmtInrFull(b.hra)} />
          <Row label="Special Allowance" value={fmtInrFull(b.specialAllowance)} />
          <Row label="Gross salary" value={fmtInrFull(b.gross)} bold />
        </div>
      </div>

      <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300">Estimated deductions</p>
        <div className="mt-3 space-y-2">
          <Row label="Provident Fund (PF)" value={`− ${fmtInrFull(b.pf)}`} muted />
          <Row label="ESI" value={`− ${fmtInrFull(b.esi)}`} muted />
          <Row label="Professional Tax (PT)" value={`− ${fmtInrFull(b.pt)}`} muted />
          <Row label="Total deductions" value={`− ${fmtInrFull(b.totalDeductions)}`} bold />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, muted, accent }) {
  return (
    <div
      className={`flex justify-between gap-3 text-sm ${
        bold ? 'font-semibold text-slate-900 dark:text-white' : muted ? 'text-slate-600 dark:text-slate-400' : accent ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
