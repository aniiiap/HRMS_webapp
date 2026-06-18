export function employeeDisplayName(emp) {
  return `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.email || 'Employee'
}

export function employeeInitials(emp) {
  const parts = employeeDisplayName(emp).split(' ').filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0]?.[0] || '?').toUpperCase()
}

export function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function formatTime12(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{1,2}:\d{2}/.test(value)) {
    const [h, m] = value.slice(0, 5).split(':')
    const hour = Number(h)
    if (Number.isNaN(hour)) return value
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m || '00'} ${ampm}`
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function minutesToDurationLabel(mins) {
  const n = Number(mins)
  if (Number.isNaN(n) || n < 0) return '00:00'
  const h = Math.floor(n / 60)
  const m = n % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function weekPatternLabel(t) {
  if (!t) return 'Mon–Fri (Sat & Sun off)'
  if (t.saturday_working && t.sunday_working) return 'Mon–Sun (all days)'
  if (t.saturday_working) return 'Mon–Sat (Sunday off)'
  return 'Mon–Fri (Sat & Sun off)'
}

export function formatDuration(workDuration) {
  if (!workDuration) return '—'
  const [h, m] = workDuration.split(':').map(Number)
  if (Number.isNaN(h)) return workDuration
  const parts = []
  if (h) parts.push(`${h} Hour${h !== 1 ? 's' : ''}`)
  if (m) parts.push(`${m} Min${m !== 1 ? 's' : ''}`)
  return parts.join(' ') || '0 Mins'
}

export function formatDurationHuman(workDuration) {
  if (!workDuration) return '—'
  const [h, m] = workDuration.split(':').map(Number)
  if (Number.isNaN(h)) return workDuration
  const parts = []
  if (h) parts.push(`${h} Hour${h !== 1 ? 's' : ''}`)
  parts.push(`${m || 0} Min${m !== 1 ? 's' : ''}`)
  return parts.join(' ')
}

export function attendanceStatusCode(row) {
  if (row.anomaly && row.anomaly !== 'none') return { code: 'AN', label: 'Anomaly', tone: 'rose' }
  if (row.check_in && row.check_out) return { code: 'P', label: 'Present', tone: 'emerald' }
  if (row.check_in) return { code: 'P', label: 'Present', tone: 'emerald' }
  return { code: 'A', label: 'Absent', tone: 'slate' }
}
