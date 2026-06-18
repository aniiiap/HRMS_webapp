import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { MapPin } from 'lucide-react'
import { api } from '../../api/client'
import { formatTime12, minutesToDurationLabel, weekPatternLabel } from './profileUtils'

function SectionBar({ title }) {  return (
    <div className="border-y border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
      {title}
    </div>
  )
}

function ReadOnlyToggle({ label, on }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
      <span className="text-[11px] text-slate-700 dark:text-slate-300">{label}</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
          on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            on ? 'left-4' : 'left-0.5'
          }`}
        />
        <span className="sr-only">{on ? 'On' : 'Off'}</span>
      </span>
    </div>
  )
}

function FieldRow({ label, value, multiline = false }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>
      {multiline ? (
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{value}</p>
      ) : (
        <p className="mt-0.5 border-b border-slate-200 pb-0.5 text-[11px] font-medium text-slate-900 dark:border-slate-700 dark:text-white">
          {value}
        </p>
      )}
    </div>
  )
}

export default function EmployeeAttendanceRulesSubTab({ employee, shiftTemplate }) {
  const [officeLocation, setOfficeLocation] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [selectedRuleId, setSelectedRuleId] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data } = await api.get('/api/employees/location-settings/')
        if (!cancelled) setOfficeLocation(data)
      } catch {
        if (!cancelled) setOfficeLocation(null)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!employee?.id) return undefined
    let cancelled = false
    async function loadAssignments() {
      try {
        const [assignRes, tplRes] = await Promise.all([
          api.get('/api/employees/shift-template-assignments/'),
          api.get('/api/employees/shift-templates/'),
        ])
        const list = Array.isArray(assignRes.data) ? assignRes.data : assignRes.data.results || []
        const tplList = Array.isArray(tplRes.data) ? tplRes.data : tplRes.data.results || []
        const tplById = Object.fromEntries(tplList.map((t) => [t.id, t]))
        const mine = list
          .filter((a) => Number(a.employee) === Number(employee.id))
          .map((a) => ({ ...a, template: tplById[a.shift_template] }))
        if (!cancelled) {
          setAssignments(mine)
          const primary = mine.find((a) => a.is_primary) || mine[0]
          setSelectedRuleId(primary?.shift_template ?? null)
        }
      } catch {
        if (!cancelled) {
          setAssignments([])
          setSelectedRuleId(shiftTemplate?.id ?? null)
        }
      }
    }
    void loadAssignments()
    return () => {
      cancelled = true
    }
  }, [employee?.id, shiftTemplate?.id])

  const selectedAssignment = useMemo(
    () => assignments.find((a) => Number(a.shift_template) === Number(selectedRuleId)) || null,
    [assignments, selectedRuleId],
  )

  const rule = selectedAssignment?.template || shiftTemplate
  const ruleName = rule?.name || employee?.shift_template_name || 'No rule assigned'
  const effectiveDate = employee?.date_of_joining
    ? dayjs(employee.date_of_joining).format('DD MMM, YYYY')
    : rule?.created_at
      ? dayjs(rule.created_at).format('DD MMM, YYYY')
      : '—'
  const startTime = employee?.shift_start_time || rule?.start_time
  const endTime = employee?.shift_end_time || rule?.end_time
  const graceIn = employee?.grace_minutes ?? rule?.grace_minutes ?? 0
  const graceOut = employee?.early_checkout_grace_minutes ?? rule?.early_checkout_grace_minutes ?? 10
  const geoEnabled = Boolean(employee?.location_restriction_enabled && officeLocation?.geofencing_enabled)

  if (!assignments.length && !rule && !employee?.shift_template_name) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-[11px] text-slate-600 dark:text-slate-400">No attendance rule is assigned to this employee.</p>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Assign a rule from Attendance → Rules on the main attendance page.
        </p>
      </div>
    )
  }

  return (
    <div className="grid max-h-[min(520px,calc(100vh-220px))] min-h-[360px] gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40 lg:grid-cols-[190px_1fr]">
      <aside className="shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/60 lg:border-b-0 lg:border-r">
        <p className="mb-2 text-[11px] font-bold text-slate-800 dark:text-slate-200">Rule list</p>
        <div className="space-y-1.5">
          {(assignments.length ? assignments : rule ? [{ shift_template: rule.id, template_name: ruleName, is_primary: true, created_at: rule.created_at }] : []).map((a) => {
            const rid = a.shift_template ?? rule?.id
            const name = a.template_name || ruleName
            const isActive = Number(selectedRuleId) === Number(rid)
            const effDate = a.created_at
              ? dayjs(a.created_at).format('DD MMM, YYYY')
              : effectiveDate
            return (
              <button
                key={rid}
                type="button"
                onClick={() => setSelectedRuleId(rid)}
                className={`w-full rounded border-l-[3px] px-2.5 py-2 text-left shadow-sm transition ${
                  isActive
                    ? 'border-brand-600 bg-white dark:bg-slate-800'
                    : 'border-transparent bg-white/60 hover:bg-white dark:bg-slate-800/40 dark:hover:bg-slate-800'
                }`}
              >
                <p className="text-[11px] font-semibold text-slate-900 dark:text-white">
                  {name}
                  {a.is_primary && <span className="ml-1 text-[9px] font-bold uppercase text-brand-600">· active</span>}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">Effective date: {effDate}</p>
              </button>
            )
          })}
        </div>
      </aside>
      <div className="flex min-h-0 flex-col">
        <div className="shrink-0 border-b border-slate-200 px-3 py-2 dark:border-slate-700">
          <span className="inline-block border-b-2 border-brand-600 pb-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
            Overview
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 text-xs scrollbar-thin">
          <FieldRow label="Rule name" value={ruleName} />
          <FieldRow
            label="Description"
            multiline
            value={`This rule defines shift timings and anomaly checks for ${weekPatternLabel(rule).toLowerCase()}.`}
          />

          <SectionBar title="Shift timings" />
          <div className="grid gap-2 py-2 sm:grid-cols-2">
            <FieldRow label="In time" value={formatTime12(startTime)} />
            <FieldRow label="Out time" value={formatTime12(endTime)} />
          </div>
          <ReadOnlyToggle label="Enable auto deduction" on={false} />
          <ReadOnlyToggle label="Enable anomaly tracking" on />

          <SectionBar title="Anomaly settings" />
          <div className="space-y-2 py-2">
            <AnomalyRow label="In time" checked graceLabel="In time grace period" graceValue={minutesToDurationLabel(graceIn)} />
            <AnomalyRow label="Out time" checked graceLabel="Out time grace period" graceValue={minutesToDurationLabel(graceOut)} />
            <AnomalyRow label="Work duration" checked />
            <p className="text-[10px] text-slate-400">
              Auto clock-out is not configured in this system. Missing check-out is flagged when an employee clocks in but does not clock out.
            </p>
          </div>

          <SectionBar title="Device & access settings" />
          <div className="py-2">
            <p className="mb-1.5 text-[10px] text-slate-500">Select the device for attendance</p>
            <div className="inline-flex rounded border border-slate-200 p-0.5 dark:border-slate-700">
              {['Mobile', 'Web', 'Both'].map((d, i) => (
                <span
                  key={d}
                  className={`rounded px-3 py-1 text-[10px] font-medium ${
                    i === 2 ? 'bg-brand-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-2 space-y-0">
              <ReadOnlyToggle label="Enable overtime" on={false} />
              <ReadOnlyToggle label="Enable 24 hour shift" on={Boolean(rule?.is_night_shift)} />
              <ReadOnlyToggle label="Enable IP restriction" on={false} />
            </div>
          </div>

          <SectionBar title="Geo fencing" />
          <div className="py-2">
            <ReadOnlyToggle label="Enable geo fencing" on={geoEnabled} />
            {geoEnabled && officeLocation && (
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-[10px] font-medium text-slate-500">Allowed locations</p>
                  <p className="mt-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                    {officeLocation.address || officeLocation.name || 'Office location'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Employees can clock in/out within {officeLocation.radius_meters || 200} meter radius.
                  </p>
                </div>
                <div className="flex h-28 items-center justify-center rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <div className="text-center text-slate-500">
                    <MapPin className="mx-auto h-6 w-6 text-rose-500" />
                    <p className="mt-1 text-[10px]">Office geofence</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="pt-1 text-[10px] text-slate-500">
            To edit this rule, go to Attendance → Rules on the main attendance page.
          </p>
        </div>
      </div>
    </div>
  )
}

function AnomalyRow({ label, checked, graceLabel, graceValue }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <label className="flex min-w-[100px] items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
        <input type="checkbox" checked={checked} readOnly disabled className="h-3 w-3 rounded border-slate-300 text-brand-600" />
        {label}
      </label>
      {graceLabel && (
        <div className="min-w-[160px] flex-1">
          <p className="text-[10px] text-slate-500">{graceLabel}</p>
          <p className="mt-0.5 border-b border-slate-200 pb-0.5 text-[11px] font-medium dark:border-slate-700">{graceValue}</p>
        </div>
      )}
    </div>
  )
}
