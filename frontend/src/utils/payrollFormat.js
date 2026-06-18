/** Client-side payroll display helpers (mirrors structure preview API; not payroll engine). */

export function fmtInr(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
}

export function fmtInrFull(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0))
}

export function indiaFY(d = new Date()) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  if (m >= 4) return `${y}-${String(y + 1).slice(-2)}`
  return `${y - 1}-${String(y).slice(-2)}`
}

/** Same split as backend preview-from-gross (40% basic, 10% DA, 40% HRA of basic, remainder special). */
export function previewFromGrossLocal(monthlyGross) {
  const gross = Math.round(Number(monthlyGross) || 0)
  if (gross <= 0) return null
  const basic = Math.round(gross * 0.4)
  const da = Math.round(gross * 0.1)
  const hra = Math.round(basic * 0.4)
  const special = Math.max(0, gross - basic - da - hra)
  return {
    monthly_gross: gross,
    lines: [
      { code: 'BASIC', name: 'Basic', amount: basic, mode: 'fixed' },
      { code: 'DEARNESS_ALLOWANCE', name: 'Dearness Allowance', amount: da, mode: 'fixed' },
      { code: 'HRA', name: 'HRA', amount: hra, mode: 'percent_basic', percent: '40' },
      { code: 'SPECIAL_ALLOWANCE', name: 'Special Allowance', amount: special, mode: 'fixed' },
    ],
    total_earnings: gross,
  }
}

/** Resolve monthly gross from monthly input or annual CTC. */
export function monthlyGrossFromCtc({ ctcType = 'monthly', monthlyGross, annualCtc }) {
  if (ctcType === 'annual') {
    const annual = Number(annualCtc) || 0
    return annual > 0 ? Math.round(annual / 12) : 0
  }
  return Math.round(Number(monthlyGross) || 0)
}

export function resolvePfWageFromAmounts({ basic = 0, da = 0, specialAllowance = 0 }, basis = 'basic_da') {
  const b = Number(basic) || 0
  const d = Number(da) || 0
  const s = Number(specialAllowance) || 0
  switch ((basis || 'basic_da').toLowerCase()) {
    case 'basic':
      return b
    case 'basic_special':
      return b + s
    case 'basic_da':
    default:
      return b + d
  }
}

/** Statutory defaults when org config is not passed to client preview. */
export const DEFAULT_STATUTORY_PREVIEW = {
  pf_enabled: true,
  pf_applicable: true,
  pf_employee_contribution_type: 'basic_da',
  pf_ceiling_enabled: true,
  pf_monthly_wage_ceiling: 15000,
  pf_employee_percent: 12,
  esi_enabled: true,
  esi_applicable: true,
  esi_employee_percent: 0.75,
  esi_gross_threshold: 21000,
  pt_enabled: false,
  pt_applicable: true,
  professional_tax_monthly: 200,
}

export function estimateBreakdown(previewOrGross, flags = {}) {
  const statutory = { ...DEFAULT_STATUTORY_PREVIEW, ...flags }
  const preview = typeof previewOrGross === 'object' && previewOrGross?.lines
    ? previewOrGross
    : previewFromGrossLocal(previewOrGross)
  if (!preview) {
    return { basic: 0, da: 0, hra: 0, specialAllowance: 0, gross: 0, pf: 0, esi: 0, pt: 0, totalDeductions: 0, net: 0 }
  }
  const gross = Number(preview.monthly_gross || preview.total_earnings || 0)
  const line = (code) => preview.lines?.find((l) => l.code === code)
  const basic = Number(line('BASIC')?.amount || gross * 0.4)
  const da = Number(line('DEARNESS_ALLOWANCE')?.amount || gross * 0.1)
  const hra = Number(line('HRA')?.amount || basic * 0.4)
  const specialAllowance = Number(line('SPECIAL_ALLOWANCE')?.amount || Math.max(0, gross - basic - da - hra))

  const basis = statutory.pf_employee_contribution_type || statutory.pf_wage_basis || 'basic_da'
  const pfEnabled = statutory.pf_enabled !== false && statutory.pf_applicable !== false
  const pfCeiling = statutory.pf_ceiling_enabled !== false
    ? Number(statutory.pf_monthly_wage_ceiling || 15000)
    : Number.POSITIVE_INFINITY
  const pfPct = Number(statutory.pf_employee_percent ?? 12) / 100
  const pfWage = resolvePfWageFromAmounts({ basic, da, specialAllowance }, basis)
  const pf = pfEnabled ? Math.round(Math.min(pfWage, pfCeiling) * pfPct) : 0

  const esiEnabled = statutory.esi_enabled !== false && statutory.esi_applicable !== false
  const esiThreshold = Number(statutory.esi_gross_threshold ?? 21000)
  const esiPct = Number(statutory.esi_employee_percent ?? 0.75) / 100
  const esi = esiEnabled && gross <= esiThreshold ? Math.round(gross * esiPct) : 0

  const pt =
    statutory.pt_enabled !== false && statutory.pt_applicable !== false
      ? Number(statutory.professional_tax_monthly ?? 200)
      : 0
  const totalDeductions = pf + esi + pt
  const net = Math.max(0, Math.round(gross - totalDeductions))

  return { basic, da, hra, specialAllowance, gross, pf, esi, pt, totalDeductions, net }
}

/** @deprecated use estimateBreakdown */
export function estimateNetFromGross(preview, flags = {}) {
  const b = estimateBreakdown(preview, flags)
  return { gross: b.gross, deductions: b.totalDeductions, net: b.net }
}

export function groupResultLines(row) {
  const lines = row?.lines || []
  const earnings = lines.filter((l) => l.kind === 'earning' || !l.kind)
  const deductions = lines.filter((l) => l.kind === 'deduction')

  const amount = (code) => {
    const ln = lines.find((l) => (l.component_code || '').toUpperCase() === code)
    return ln ? Number(ln.amount_prorated || 0) : 0
  }

  const basic = amount('BASIC')
  const hra = amount('HRA')
  const allowanceCodes = ['SPECIAL_ALLOWANCE', 'CONVEYANCE', 'BONUS', 'INCENTIVE', 'OVERTIME', 'ARREARS']
  let allowances = 0
  earnings.forEach((ln) => {
    const c = (ln.component_code || '').toUpperCase()
    if (c !== 'BASIC' && c !== 'HRA') allowances += Number(ln.amount_prorated || 0)
  })

  return {
    basic,
    hra,
    allowances,
    gross: Number(row?.gross_prorated || 0),
    pf: Number(row?.pf_employee || 0),
    esi: Number(row?.esi_employee || 0),
    pt: Number(row?.professional_tax || 0),
    tds: Number(row?.tds || 0),
    net: Number(row?.net_pay || 0),
    earnings,
    deductions,
  }
}

export const STANDARD_EARNING_COMPONENTS = [
  { code: 'BASIC', name: 'Basic salary', category: 'basic_structure', pf_wage_part: true, hint: '40% of monthly gross / CTC' },
  { code: 'DEARNESS_ALLOWANCE', name: 'Dearness allowance (DA)', category: 'basic_structure', pf_wage_part: true, hint: '10% of gross — Basic + DA = 50%' },
  { code: 'HRA', name: 'HRA', category: 'recurring', hint: '40% of Basic (non-metro) or 50% (metro)' },
  { code: 'TRANSPORT_ALLOWANCE', name: 'Transport allowance', category: 'recurring', hint: 'Fixed ₹/month (default ₹1,600)' },
  { code: 'MEDICAL_ALLOWANCE', name: 'Medical allowance', category: 'recurring', hint: 'Fixed ₹/month (default ₹1,000)' },
  { code: 'LTA', name: 'LTA', category: 'recurring', hint: 'Typically 8–10% of Basic; claim with travel bills' },
  { code: 'CEA', name: 'Children education allowance', category: 'recurring', taxable: false, hint: '₹100/child/month (max 2 children)' },
  { code: 'MEAL_ALLOWANCE', name: 'Meal / food allowance', category: 'recurring', taxable: false, hint: 'Tax-free up to ₹50/meal × 2 × working days' },
  { code: 'MOBILE_INTERNET', name: 'Mobile / internet', category: 'adhoc', taxable: false, esi_wage_part: false, prorate_with_attendance: false, hint: 'Bill-based reimbursement' },
  { code: 'UNIFORM_ALLOWANCE', name: 'Uniform allowance', category: 'adhoc', taxable: false, esi_wage_part: false, prorate_with_attendance: false, hint: 'Bill-based; mandatory uniform only' },
  { code: 'SPECIAL_ALLOWANCE', name: 'Special allowance', category: 'recurring', pf_wage_part: true, hint: 'Balancing component — remainder of gross' },
  { code: 'VARIABLE_PAY', name: 'Variable / performance pay', category: 'variable', prorate_with_attendance: false, hint: '5–20% of CTC; quarterly or annual' },
  { code: 'CONVEYANCE', name: 'Conveyance', category: 'recurring', hint: 'Transport allowance' },
  { code: 'BONUS', name: 'Bonus', category: 'adhoc', prorate_with_attendance: false },
  { code: 'INCENTIVE', name: 'Incentive', category: 'variable', prorate_with_attendance: false },
  { code: 'OVERTIME', name: 'Overtime', category: 'variable', prorate_with_attendance: false },
  { code: 'ARREARS', name: 'Arrears', category: 'adhoc', prorate_with_attendance: false },
]

export const STANDARD_DEDUCTION_COMPONENTS = [
  { code: 'PF', name: 'Provident Fund (employee)', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false, hint: '12% of Basic — auto-computed on pay run' },
  { code: 'ESI', name: 'ESI', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false, hint: '0.75% if gross ≤ ₹21,000 — auto-computed' },
  { code: 'PT', name: 'Professional tax', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false, hint: 'State slab (e.g. ₹200/month)' },
  { code: 'TDS', name: 'TDS (income tax)', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false, hint: 'FY26 new regime — nil if taxable ≤ ₹12L/year; slab-based above' },
  { code: 'LOAN_RECOVERY', name: 'Loan recovery', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false },
  { code: 'SALARY_ADVANCE', name: 'Salary advance recovery', category: 'statutory', esi_wage_part: false, prorate_with_attendance: false },
]
