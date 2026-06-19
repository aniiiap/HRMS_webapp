import { Check, X } from 'lucide-react'
import {
  ATTENDANCE_DEVICE_OPTIONS,
  WEEK_PATTERN_PRESETS,
} from './attendanceRuleForm'

function SectionBar({ title }) {
  return (
    <div className="border-y border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
      {title}
    </div>
  )
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 dark:border-slate-800">
      <span>
        <span className="block text-sm text-slate-700 dark:text-slate-300">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </label>
  )
}

function AnomalyToggle({ label, checked, onChange, children }) {
  return (
    <div className="border-b border-slate-100 py-2 dark:border-slate-800">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {checked && children && <div className="mt-2 pl-5">{children}</div>}
    </div>
  )
}

export default function AttendanceRuleEditForm({
  rule,
  form,
  setForm,
  detailTab,
  setDetailTab,
  saving,
  onSave,
  onCancel,
  isNew,
}) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isNew ? 'Create attendance rule' : `Edit - ${rule?.name || form.name}`}
        </h3>
        <div className="flex gap-1">
          <button type="submit" className="btn-primary !px-2.5 !py-1 !text-sm" disabled={saving}>
            <Check className="mr-1 inline h-3 w-3" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn-secondary !px-2 !py-1 !text-sm" onClick={onCancel}>
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-200 px-3 dark:border-slate-700">
        <div className="flex gap-4">
          {[
            { id: 'general', label: 'General rules' },
            { id: 'advanced', label: 'Advanced rules' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailTab(t.id)}
              className={`border-b-2 py-2 text-sm font-semibold transition ${
                detailTab === t.id
                  ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 scrollbar-thin">
        {detailTab === 'general' && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-slate-500">Rule name</span>
              <input className="input-field mt-1 !py-1.5 !text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Description</span>
              <textarea className="input-field mt-1 min-h-[56px] !py-1.5 !text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe when this rule applies..." />
            </label>

            <SectionBar title="Shift timings" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-slate-500">In time</span>
                <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Out time</span>
                <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_night_shift} onChange={(e) => setForm({ ...form, is_night_shift: e.target.checked })} />
              Evening / night shift (crosses midnight)
            </label>

            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500">Weekly off</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEK_PATTERN_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`rounded border px-2 py-1 text-xs font-medium ${
                      form.saturday_working === p.sat && form.sunday_working === p.sun
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                    onClick={() => setForm({ ...form, saturday_working: p.sat, sunday_working: p.sun })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <SectionBar title="Deduction & tracking" />
            <Toggle
              label="Enable auto deduction"
              checked={form.enable_auto_deduction}
              onChange={(v) => setForm({ ...form, enable_auto_deduction: v })}
              hint="Automatically apply attendance-based deductions on the configured date."
            />
            {form.enable_auto_deduction && (
              <label className="block">
                <span className="text-xs text-slate-500">Manual deduction date (day of month)</span>
                <input type="number" min="1" max="31" className="input-field mt-1 !w-24 !py-1.5 !text-sm" value={form.manual_deduction_day} onChange={(e) => setForm({ ...form, manual_deduction_day: e.target.value })} />
              </label>
            )}
            <Toggle
              label="Enable anomaly tracking"
              checked={form.enable_anomaly_tracking}
              onChange={(v) => setForm({ ...form, enable_anomaly_tracking: v })}
            />

            {form.enable_anomaly_tracking && (
              <>
                <SectionBar title="Anomaly settings" />
                <AnomalyToggle label="In time" checked={form.track_in_time} onChange={(v) => setForm({ ...form, track_in_time: v })}>
                  <label className="block">
                    <span className="text-xs text-slate-500">In time grace period (minutes)</span>
                    <input type="number" min="0" max="180" className="input-field mt-1 !w-24 !py-1.5 !text-sm" value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })} />
                  </label>
                </AnomalyToggle>
                <AnomalyToggle label="Out time" checked={form.track_out_time} onChange={(v) => setForm({ ...form, track_out_time: v })}>
                  <label className="block">
                    <span className="text-xs text-slate-500">Out time grace period (minutes)</span>
                    <input type="number" min="0" max="180" className="input-field mt-1 !w-24 !py-1.5 !text-sm" value={form.early_checkout_grace_minutes} onChange={(e) => setForm({ ...form, early_checkout_grace_minutes: e.target.value })} />
                  </label>
                </AnomalyToggle>
                <AnomalyToggle label="Work duration" checked={form.track_work_duration} onChange={(v) => setForm({ ...form, track_work_duration: v })}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs text-slate-500">Full day (HH:MM)</span>
                      <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.full_day_minutes} onChange={(e) => setForm({ ...form, full_day_minutes: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="text-xs text-slate-500">Half day (HH:MM)</span>
                      <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.half_day_minutes} onChange={(e) => setForm({ ...form, half_day_minutes: e.target.value })} />
                    </label>
                  </div>
                </AnomalyToggle>
                <AnomalyToggle label="Maximum total break duration" checked={form.track_max_break_duration} onChange={(v) => setForm({ ...form, track_max_break_duration: v })}>
                  <label className="block">
                    <span className="text-xs text-slate-500">Max break duration (HH:MM)</span>
                    <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.max_break_duration_minutes} onChange={(e) => setForm({ ...form, max_break_duration_minutes: e.target.value })} />
                  </label>
                </AnomalyToggle>
                <AnomalyToggle label="Maximum no. of breaks" checked={form.track_max_break_count} onChange={(v) => setForm({ ...form, track_max_break_count: v })}>
                  <label className="block">
                    <span className="text-xs text-slate-500">Max breaks</span>
                    <input type="number" min="1" max="20" className="input-field mt-1 !w-20 !py-1.5 !text-sm" value={form.max_break_count} onChange={(e) => setForm({ ...form, max_break_count: e.target.value })} />
                  </label>
                </AnomalyToggle>
                <AnomalyToggle label="Auto clock-out" checked={form.enable_auto_clock_out} onChange={(v) => setForm({ ...form, enable_auto_clock_out: v })}>
                  <label className="block">
                    <span className="text-xs text-slate-500">After shift end (HH:MM)</span>
                    <input type="time" className="input-field mt-1 !py-1.5 !text-sm" value={form.auto_clock_out_after_minutes} onChange={(e) => setForm({ ...form, auto_clock_out_after_minutes: e.target.value })} />
                    <p className="mt-1 text-xs text-slate-400">System clocks out employees who forget to punch out.</p>
                  </label>
                </AnomalyToggle>
              </>
            )}
          </div>
        )}

        {detailTab === 'advanced' && (
          <div className="space-y-3">
            <SectionBar title="Device & access" />
            <label className="block">
              <span className="text-xs text-slate-500">Attendance device</span>
              <div className="mt-1 inline-flex rounded border border-slate-200 p-0.5 dark:border-slate-700">
                {ATTENDANCE_DEVICE_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`rounded px-3 py-1 text-xs font-medium ${
                      form.attendance_device === d.value ? 'bg-brand-600 text-white' : 'text-slate-500'
                    }`}
                    onClick={() => setForm({ ...form, attendance_device: d.value })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </label>
            <Toggle label="Enable overtime" checked={form.enable_overtime} onChange={(v) => setForm({ ...form, enable_overtime: v })} />
            <Toggle label="Enable 24 hour shift" checked={form.enable_24_hour_shift} onChange={(v) => setForm({ ...form, enable_24_hour_shift: v })} />
            <Toggle label="Enable IP restriction" checked={form.enable_ip_restriction} onChange={(v) => setForm({ ...form, enable_ip_restriction: v })} />
            {form.enable_ip_restriction && (
              <label className="block">
                <span className="text-xs text-slate-500">Allowed IP addresses (comma-separated)</span>
                <textarea className="input-field mt-1 min-h-[48px] !py-1.5 !text-sm" value={form.allowed_ip_addresses} onChange={(e) => setForm({ ...form, allowed_ip_addresses: e.target.value })} placeholder="192.168.1.1, 10.0.0.5" />
              </label>
            )}

            <SectionBar title="Geo fencing" />
            <Toggle
              label="Enable geo fencing"
              checked={form.enable_geofencing}
              onChange={(v) => setForm({ ...form, enable_geofencing: v })}
              hint="Employees must punch within the office geofence configured under location settings."
            />
          </div>
        )}
      </div>
    </form>
  )
}

