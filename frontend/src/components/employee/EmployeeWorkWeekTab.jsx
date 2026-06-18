import dayjs from 'dayjs'
import ProfileSectionCard, { ProfileField } from './ProfileSectionCard'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEK_ROWS = [1, 2, 3, 4, 5]

const CELL_STYLES = {
  working: 'bg-emerald-500',
  off: 'bg-rose-500',
  half: 'bg-amber-400',
}

function formatTime12(t) {
  if (!t) return '—'
  const [h, m] = String(t).slice(0, 5).split(':')
  const hour = Number(h)
  if (Number.isNaN(hour)) return t
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m || '00'} ${ampm}`
}

function dayCellStatus(dayIndex, shiftTemplate) {
  const satWork = Boolean(shiftTemplate?.saturday_working)
  const sunWork = Boolean(shiftTemplate?.sunday_working)
  const name = (shiftTemplate?.name || '').toLowerCase()
  if (dayIndex < 5) return 'working'
  if (dayIndex === 5) {
    if (name.includes('half')) return 'half'
    return satWork ? 'working' : 'off'
  }
  return sunWork ? 'working' : 'off'
}

function workWeekDescription(shiftTemplate, employee) {
  const name = shiftTemplate?.name || employee?.shift_template_name
  if (!name) {
    return 'Standard Mon–Fri work week with Saturday and Sunday as weekly off.'
  }
  const satWork = Boolean(shiftTemplate?.saturday_working)
  const sunWork = Boolean(shiftTemplate?.sunday_working)
  const nameLower = name.toLowerCase()
  if (nameLower.includes('half')) {
    return 'This rule defines a work week with Saturday as half day and weekly off on Sunday.'
  }
  if (satWork && sunWork) return 'All seven days are configured as working days.'
  if (satWork) return 'Mon–Sat working days with Sunday as weekly off.'
  if (sunWork) return 'Mon–Fri and Sunday working; Saturday is weekly off.'
  return 'Mon–Fri working days with Saturday and Sunday as weekly off.'
}

function saturdayHalfDayRule(shiftTemplate) {
  const name = (shiftTemplate?.name || '').toLowerCase()
  return name.includes('half')
}

export default function EmployeeWorkWeekTab({ employee, shiftTemplate }) {
  const ruleName = shiftTemplate?.name || employee.shift_template_name || 'Default work week'
  const effectiveDate = employee.date_of_joining
    ? dayjs(employee.date_of_joining).format('DD MMM, YYYY')
    : '—'
  const start = employee.shift_start_time || shiftTemplate?.start_time
  const end = employee.shift_end_time || shiftTemplate?.end_time
  const isHalfSat = saturdayHalfDayRule(shiftTemplate)

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
        <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{ruleName}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {workWeekDescription(shiftTemplate, employee)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Effective date</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{effectiveDate}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Rule settings</h4>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isHalfSat}
                readOnly
                disabled
                className="rounded border-slate-300 text-brand-600"
              />
              Half day (Saturday)
            </label>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-center text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60">
                  <th className="px-3 py-2.5 text-left">Week</th>
                  {WEEKDAYS.map((d) => (
                    <th key={d} className="px-2 py-2.5">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEK_ROWS.map((week) => (
                  <tr key={week} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">{week}</td>
                    {WEEKDAYS.map((_, dayIndex) => {
                      const status = dayCellStatus(dayIndex, shiftTemplate)
                      return (
                        <td key={`${week}-${dayIndex}`} className="px-2 py-3">
                          <span
                            className={`inline-block h-7 w-7 rounded-md ${CELL_STYLES[status]}`}
                            title={status === 'working' ? 'Working day' : status === 'half' ? 'Half day' : 'Weekly off'}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-emerald-500" />
              Working day
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-rose-500" />
              Weekly off
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded bg-amber-400" />
              Half day
            </span>
          </div>
        </div>
      </div>

      <ProfileSectionCard title="Shift timings">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileField label="In time" value={formatTime12(start)} />
          <ProfileField label="Out time" value={formatTime12(end)} />
          <ProfileField
            label="In-time grace"
            value={
              (employee.grace_minutes ?? shiftTemplate?.grace_minutes) != null
                ? `${employee.grace_minutes ?? shiftTemplate?.grace_minutes} mins`
                : '—'
            }
          />
          <ProfileField
            label="Out-time grace"
            value={
              (employee.early_checkout_grace_minutes ?? shiftTemplate?.early_checkout_grace_minutes) != null
                ? `${employee.early_checkout_grace_minutes ?? shiftTemplate?.early_checkout_grace_minutes} mins`
                : '—'
            }
          />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          To change this rule, go to Attendance → Rules and assign a shift template to the employee.
        </p>
      </ProfileSectionCard>
    </div>
  )
}
