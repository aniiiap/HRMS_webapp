import { Pencil, Star } from 'lucide-react'
import {
  deviceLabel,
  formatTime12,
  minutesToHHMM,
  shiftTypeLabel,
  weekPatternLabel,
  yesNo,
} from './attendanceRuleForm'

function SectionBar({ title }) {
  return (
    <div className="border-y border-slate-200 bg-slate-50 px-2 py-1.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
      {title}
    </div>
  )
}

function FieldRow({ label, value, multiline }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2 dark:border-slate-800 sm:grid-cols-[140px_1fr]">
      <p className="text-xs text-slate-500">{label}</p>
      {multiline ? (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{value || 'â€”'}</p>
      ) : (
        <p className="text-sm font-medium text-slate-900 dark:text-white">{value ?? 'â€”'}</p>
      )}
    </div>
  )
}

function ToggleRead({ label, on }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <span className={`text-xs font-semibold ${on ? 'text-brand-600' : 'text-slate-400'}`}>{on ? 'On' : 'Off'}</span>
    </div>
  )
}

function AnomalyRow({ label, checked, children }) {
  return (
    <div className="border-b border-slate-100 py-2 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        <span className={`h-3.5 w-3.5 rounded border ${checked ? 'border-brand-600 bg-brand-600' : 'border-slate-300'}`} />
        {label}
      </div>
      {checked && children && <div className="mt-2 pl-5">{children}</div>}
    </div>
  )
}

export default function AttendanceRuleDetailView({
  rule,
  detailTab,
  setDetailTab,
  onEdit,
  onAssign,
  onSetDefault,
  settingDefault,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
          {rule.is_company_default && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <Star className="h-3 w-3" />
              Default
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!rule.is_company_default && (
            <button
              type="button"
              className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:border-brand-800 dark:text-brand-300"
              onClick={onSetDefault}
              disabled={settingDefault}
            >
              {settingDefault ? 'Settingâ€¦' : 'Set as company default'}
            </button>
          )}
          <button
            type="button"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            onClick={onEdit}
            title="Edit attendance rule"
          >
            <Pencil className="h-3.5 w-3.5" />
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
          <div>
            <FieldRow label="Rule name" value={rule.name} />
            <FieldRow label="Description" value={rule.description || 'No description'} multiline />

            <SectionBar title="Shift timings" />
            <div className="py-2">
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-200">
                {shiftTypeLabel(rule)}
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                <FieldRow label="In time" value={formatTime12(rule.start_time)} />
                <FieldRow label="Out time" value={formatTime12(rule.end_time)} />
                <FieldRow label="Working week" value={weekPatternLabel(rule)} />
              </div>
            </div>

            <SectionBar title="Deduction & tracking" />
            <ToggleRead label="Enable auto deduction" on={rule.enable_auto_deduction} />
            {rule.enable_auto_deduction && (
              <FieldRow label="Manual deduction date" value={`Day ${rule.manual_deduction_day} of month`} />
            )}
            <ToggleRead label="Enable anomaly tracking" on={rule.enable_anomaly_tracking} />

            {rule.enable_anomaly_tracking && (
              <>
                <SectionBar title="Anomaly settings" />
                <AnomalyRow label="In time" checked={rule.track_in_time}>
                  <FieldRow label="In time grace period" value={minutesToHHMM(rule.grace_minutes)} />
                </AnomalyRow>
                <AnomalyRow label="Out time" checked={rule.track_out_time}>
                  <FieldRow label="Out time grace period" value={minutesToHHMM(rule.early_checkout_grace_minutes)} />
                </AnomalyRow>
                <AnomalyRow label="Work duration" checked={rule.track_work_duration}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FieldRow label="Full day" value={minutesToHHMM(rule.full_day_minutes)} />
                    <FieldRow label="Half day" value={minutesToHHMM(rule.half_day_minutes)} />
                  </div>
                </AnomalyRow>
                <AnomalyRow label="Maximum total break duration" checked={rule.track_max_break_duration}>
                  <FieldRow label="Max break duration" value={minutesToHHMM(rule.max_break_duration_minutes)} />
                </AnomalyRow>
                <AnomalyRow label="Maximum no. of breaks" checked={rule.track_max_break_count}>
                  <FieldRow label="Max breaks" value={String(rule.max_break_count)} />
                </AnomalyRow>
                <AnomalyRow label="Auto clock-out" checked={rule.enable_auto_clock_out}>
                  <FieldRow
                    label="Clock-out after shift end"
                    value={minutesToHHMM(rule.auto_clock_out_after_minutes)}
                  />
                </AnomalyRow>
              </>
            )}

            <button type="button" className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700" onClick={onAssign}>
              Assign this rule to employees â†’
            </button>
          </div>
        )}

        {detailTab === 'advanced' && (
          <div>
            <SectionBar title="Device & access" />
            <FieldRow label="Attendance device" value={deviceLabel(rule.attendance_device)} />
            <ToggleRead label="Enable overtime" on={rule.enable_overtime} />
            <ToggleRead label="Enable 24 hour shift" on={rule.enable_24_hour_shift} />
            <ToggleRead label="Enable IP restriction" on={rule.enable_ip_restriction} />
            {rule.enable_ip_restriction && (
              <FieldRow label="Allowed IP addresses" value={rule.allowed_ip_addresses || 'â€”'} multiline />
            )}

            <SectionBar title="Geo fencing" />
            <ToggleRead label="Enable geo fencing" on={rule.enable_geofencing} />

            <SectionBar title="Summary" />
            <FieldRow label="Night shift (crosses midnight)" value={yesNo(rule.is_night_shift)} />
            <FieldRow label="Employees on this rule" value={String(rule.employee_count ?? 0)} />
          </div>
        )}
      </div>
    </div>
  )
}

