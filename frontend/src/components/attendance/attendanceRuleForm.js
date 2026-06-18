export const ATTENDANCE_DEVICE_OPTIONS = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'web', label: 'Web' },
  { value: 'both', label: 'Both' },
]

export const WEEK_PATTERN_PRESETS = [
  { label: '5-day (Sat & Sun off)', sat: false, sun: false },
  { label: '6-day (Sat working)', sat: true, sun: false },
  { label: '7-day (no weekly off)', sat: true, sun: true },
]

export function minutesToHHMM(mins) {
  const m = Math.max(0, Number(mins) || 0)
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function hhmmToMinutes(val) {
  if (val == null || val === '') return 0
  const parts = String(val).split(':')
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  return h * 60 + m
}

export function formatTime12(t) {
  if (!t) return '—'
  const [hStr, mStr] = String(t).slice(0, 5).split(':')
  let h = Number(hStr)
  const m = mStr || '00'
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

export function weekPatternLabel(t) {
  if (!t) return 'Mon–Fri (Sat & Sun off)'
  if (t.saturday_working && t.sunday_working) return 'Mon–Sun (all days)'
  if (t.saturday_working) return 'Mon–Sat (Sunday off)'
  return 'Mon–Fri (Sat & Sun off)'
}

export function shiftTypeLabel(t) {
  if (!t) return 'Day shift'
  if (t.is_night_shift || t.enable_24_hour_shift) return 'Evening / night shift'
  return 'Day shift'
}

export function yesNo(v) {
  return v ? 'Yes' : 'No'
}

export function deviceLabel(v) {
  return ATTENDANCE_DEVICE_OPTIONS.find((o) => o.value === v)?.label || v || 'Both'
}

export const EMPTY_ATTENDANCE_RULE_FORM = {
  name: '',
  description: '',
  start_time: '10:00',
  end_time: '19:00',
  grace_minutes: '15',
  early_checkout_grace_minutes: '10',
  is_night_shift: false,
  saturday_working: false,
  sunday_working: false,
  enable_auto_deduction: false,
  manual_deduction_day: '31',
  enable_anomaly_tracking: true,
  track_in_time: true,
  track_out_time: true,
  track_work_duration: true,
  full_day_minutes: '08:00',
  half_day_minutes: '04:00',
  track_max_break_duration: false,
  max_break_duration_minutes: '01:00',
  track_max_break_count: false,
  max_break_count: '2',
  enable_auto_clock_out: false,
  auto_clock_out_after_minutes: '00:00',
  attendance_device: 'both',
  enable_overtime: false,
  enable_24_hour_shift: false,
  enable_ip_restriction: false,
  allowed_ip_addresses: '',
  enable_geofencing: true,
}

export function ruleToForm(rule) {
  if (!rule) return { ...EMPTY_ATTENDANCE_RULE_FORM }
  return {
    name: rule.name || '',
    description: rule.description || '',
    start_time: rule.start_time?.slice(0, 5) || '10:00',
    end_time: rule.end_time?.slice(0, 5) || '19:00',
    grace_minutes: String(rule.grace_minutes ?? 0),
    early_checkout_grace_minutes: String(rule.early_checkout_grace_minutes ?? 10),
    is_night_shift: !!rule.is_night_shift,
    saturday_working: !!rule.saturday_working,
    sunday_working: !!rule.sunday_working,
    enable_auto_deduction: !!rule.enable_auto_deduction,
    manual_deduction_day: String(rule.manual_deduction_day ?? 31),
    enable_anomaly_tracking: rule.enable_anomaly_tracking !== false,
    track_in_time: rule.track_in_time !== false,
    track_out_time: rule.track_out_time !== false,
    track_work_duration: rule.track_work_duration !== false,
    full_day_minutes: minutesToHHMM(rule.full_day_minutes ?? 480),
    half_day_minutes: minutesToHHMM(rule.half_day_minutes ?? 240),
    track_max_break_duration: !!rule.track_max_break_duration,
    max_break_duration_minutes: minutesToHHMM(rule.max_break_duration_minutes ?? 60),
    track_max_break_count: !!rule.track_max_break_count,
    max_break_count: String(rule.max_break_count ?? 2),
    enable_auto_clock_out: !!rule.enable_auto_clock_out,
    auto_clock_out_after_minutes: minutesToHHMM(rule.auto_clock_out_after_minutes ?? 0),
    attendance_device: rule.attendance_device || 'both',
    enable_overtime: !!rule.enable_overtime,
    enable_24_hour_shift: !!rule.enable_24_hour_shift,
    enable_ip_restriction: !!rule.enable_ip_restriction,
    allowed_ip_addresses: rule.allowed_ip_addresses || '',
    enable_geofencing: rule.enable_geofencing !== false,
  }
}

export function formToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    start_time: form.start_time,
    end_time: form.end_time,
    grace_minutes: form.grace_minutes === '' ? 0 : Number(form.grace_minutes),
    early_checkout_grace_minutes: form.early_checkout_grace_minutes === '' ? 10 : Number(form.early_checkout_grace_minutes),
    is_night_shift: form.is_night_shift,
    saturday_working: form.saturday_working,
    sunday_working: form.sunday_working,
    enable_auto_deduction: form.enable_auto_deduction,
    manual_deduction_day: form.manual_deduction_day === '' ? 31 : Number(form.manual_deduction_day),
    enable_anomaly_tracking: form.enable_anomaly_tracking,
    track_in_time: form.track_in_time,
    track_out_time: form.track_out_time,
    track_work_duration: form.track_work_duration,
    full_day_minutes: hhmmToMinutes(form.full_day_minutes),
    half_day_minutes: hhmmToMinutes(form.half_day_minutes),
    track_max_break_duration: form.track_max_break_duration,
    max_break_duration_minutes: hhmmToMinutes(form.max_break_duration_minutes),
    track_max_break_count: form.track_max_break_count,
    max_break_count: form.max_break_count === '' ? 2 : Number(form.max_break_count),
    enable_auto_clock_out: form.enable_auto_clock_out,
    auto_clock_out_after_minutes: hhmmToMinutes(form.auto_clock_out_after_minutes),
    attendance_device: form.attendance_device,
    enable_overtime: form.enable_overtime,
    enable_24_hour_shift: form.enable_24_hour_shift,
    enable_ip_restriction: form.enable_ip_restriction,
    allowed_ip_addresses: form.allowed_ip_addresses.trim(),
    enable_geofencing: form.enable_geofencing,
  }
}
