export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export const EMPTY_LEAVE_RULE_FORM = {
  name: '',
  description: '',
  short_name: '',
  annual_quota: '',
  count_weekends: false,
  count_holidays: false,
  accrual_basis: true,
  present_day_basis: false,
  accrual_frequency: 'monthly',
  accrual_period: 'start',
  allowed_under_probation: false,
  allowed_under_notice: false,
  probation_quota: '',
  encash_enabled: false,
  carry_forward_enabled: false,
  max_per_month: '',
  continuous_allowed: '',
  negative_allowed: false,
  future_dated_allowed: true,
  future_dated_after_days: 0,
  backdated_allowed: true,
  backdated_up_to_days: 90,
  apply_next_year_until_month: 2,
  is_active: true,
}

export function ruleToForm(rule) {
  if (!rule) return { ...EMPTY_LEAVE_RULE_FORM }
  return {
    name: rule.name || '',
    description: rule.description || '',
    short_name: rule.short_name || '',
    annual_quota: rule.annual_quota ?? '',
    count_weekends: !!rule.count_weekends,
    count_holidays: !!rule.count_holidays,
    accrual_basis: rule.accrual_basis !== false,
    present_day_basis: !!rule.present_day_basis,
    accrual_frequency: rule.accrual_frequency || 'monthly',
    accrual_period: rule.accrual_period || 'start',
    allowed_under_probation: !!rule.allowed_under_probation,
    allowed_under_notice: !!rule.allowed_under_notice,
    probation_quota: rule.probation_quota ?? '',
    encash_enabled: !!rule.encash_enabled,
    carry_forward_enabled: !!rule.carry_forward_enabled,
    max_per_month: rule.max_per_month ?? '',
    continuous_allowed: rule.continuous_allowed ?? '',
    negative_allowed: !!rule.negative_allowed,
    future_dated_allowed: rule.future_dated_allowed !== false,
    future_dated_after_days: rule.future_dated_after_days ?? 0,
    backdated_allowed: rule.backdated_allowed !== false,
    backdated_up_to_days: rule.backdated_up_to_days ?? 90,
    apply_next_year_until_month: rule.apply_next_year_until_month ?? 2,
    is_active: rule.is_active !== false,
  }
}

export function formToPayload(form) {
  const num = (v) => (v === '' || v == null ? null : Number(v))
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    short_name: form.short_name.trim(),
    annual_quota: num(form.annual_quota),
    count_weekends: form.count_weekends,
    count_holidays: form.count_holidays,
    accrual_basis: form.accrual_basis,
    present_day_basis: form.present_day_basis,
    accrual_frequency: form.accrual_frequency,
    accrual_period: form.accrual_period,
    allowed_under_probation: form.allowed_under_probation,
    allowed_under_notice: form.allowed_under_notice,
    probation_quota: num(form.probation_quota),
    encash_enabled: form.encash_enabled,
    carry_forward_enabled: form.carry_forward_enabled,
    max_per_month: num(form.max_per_month),
    continuous_allowed: num(form.continuous_allowed),
    negative_allowed: form.negative_allowed,
    future_dated_allowed: form.future_dated_allowed,
    future_dated_after_days: Number(form.future_dated_after_days) || 0,
    backdated_allowed: form.backdated_allowed,
    backdated_up_to_days: Number(form.backdated_up_to_days) || 0,
    apply_next_year_until_month: Number(form.apply_next_year_until_month) || 2,
    is_active: form.is_active,
  }
}

export const ACCRUAL_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'halfyearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
]

export function accrualFrequencyLabel(value) {
  return ACCRUAL_FREQUENCY_OPTIONS.find((o) => o.value === value)?.label
    || (value === 'yearly' ? 'Yearly' : value === 'halfyearly' ? 'Half Yearly' : 'Monthly')
}

export function accrualPeriodLabel(value) {
  return value === 'end' ? 'End' : 'Start'
}

export function monthLabel(n) {
  return MONTH_OPTIONS.find((m) => m.value === Number(n))?.label || '—'
}

export function yesNo(v) {
  return v ? 'Yes' : 'No'
}

export function countBetweenLabel(v) {
  return v ? 'Count as leave' : 'Not considered'
}

export function quotaDisplay(rule) {
  if (rule?.code === 'loss_of_pay') return 'Unlimited'
  if (rule?.annual_quota == null || rule?.annual_quota === '') return '—'
  return `${Number(rule.annual_quota).toFixed(1).replace(/\.0$/, '')}`
}
