import { Mail, MessageSquare } from 'lucide-react'
import { PUBLISH_DATE_HINT } from '../../utils/announcementForm'

const ROLE_OPTIONS = ['employee', 'manager', 'hr', 'admin']

export default function AnnouncementEditorFields({
  values,
  onChange,
  employees = [],
  filteredEmployees = [],
  empSearch = '',
  onEmpSearchChange,
  onToggleEmployee,
  showActiveToggle = false,
  idPrefix = 'ann',
}) {
  const set = (patch) => onChange((prev) => ({ ...prev, ...patch }))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          id={`${idPrefix}-title`}
          className="rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          placeholder="Title"
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          maxLength={180}
          required
        />
        <select
          id={`${idPrefix}-priority`}
          className="rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
          value={values.priority}
          onChange={(e) => set({ priority: e.target.value })}
        >
          <option value="normal">Normal priority</option>
          <option value="important">Important</option>
          <option value="critical">Critical</option>
        </select>
        <textarea
          id={`${idPrefix}-message`}
          className="min-h-[88px] rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2 dark:border-slate-600 dark:bg-slate-900"
          placeholder="Message"
          value={values.message}
          onChange={(e) => set({ message: e.target.value })}
          maxLength={2000}
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Send to</span>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
            value={values.target_audience}
            onChange={(e) =>
              set({
                target_audience: e.target.value,
                target_value: '',
                target_employee_ids: [],
              })
            }
          >
            <option value="all">All employees</option>
            <option value="employees">Selected employees</option>
            <option value="department">Department</option>
            <option value="role">Role</option>
          </select>
        </label>

        {values.target_audience === 'department' && (
          <label className="text-sm">
            <span className="mb-1 block font-medium">Department</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
              value={values.target_value}
              onChange={(e) => set({ target_value: e.target.value })}
              required
            />
          </label>
        )}

        {values.target_audience === 'role' && (
          <label className="text-sm">
            <span className="mb-1 block font-medium">Role</span>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
              value={values.target_value}
              onChange={(e) => set({ target_value: e.target.value })}
              required
            >
              <option value="" disabled>
                Select role
              </option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm">
          <span className="mb-1 block font-medium">Publish date</span>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-900"
            value={values.publish_on}
            onChange={(e) => set({ publish_on: e.target.value })}
            required
          />
          <span className="mt-1 block text-xs text-slate-500">{PUBLISH_DATE_HINT}</span>
        </label>
      </div>

      {values.target_audience === 'employees' && (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <input
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Search employees to add…"
            value={empSearch}
            onChange={(e) => onEmpSearchChange?.(e.target.value)}
          />
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {filteredEmployees.map((emp) => (
              <label
                key={emp.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={(values.target_employee_ids || []).includes(emp.id)}
                  onChange={() => onToggleEmployee?.(emp.id)}
                />
                <span className="text-sm">
                  {emp.employee_code} — {emp.first_name} {emp.last_name}
                  {emp.department ? ` · ${emp.department}` : ''}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{(values.target_employee_ids || []).length} selected</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {showActiveToggle && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.is_active !== false}
              onChange={(e) => set({ is_active: e.target.checked })}
            />
            Active (visible to employees)
          </label>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={Boolean(values.send_email)}
            onChange={(e) => set({ send_email: e.target.checked })}
          />
          <Mail className="h-4 w-4 text-slate-500" />
          Also send email
        </label>
      </div>
    </div>
  )
}
