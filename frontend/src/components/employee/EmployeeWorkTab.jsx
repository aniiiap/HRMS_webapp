import dayjs from 'dayjs'
import ProfileSectionCard, { ProfileField } from './ProfileSectionCard'

export default function EmployeeWorkTab({ employee, editForm, setEditForm, canEdit, saving, onSave }) {
  const doj = employee.date_of_joining ? dayjs(employee.date_of_joining).format('DD/MM/YYYY') : '—'

  return (
    <div className="space-y-5">
      <ProfileSectionCard title="Work information">
        {canEdit ? (
          <form
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault()
              onSave()
            }}
          >
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Department</p>
              <input
                className="input-field mt-1"
                value={editForm.department || ''}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              />
            </label>
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Designation</p>
              <input
                className="input-field mt-1"
                value={editForm.designation || ''}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              />
            </label>
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date of joining</p>
              <input
                type="date"
                className="input-field mt-1"
                value={editForm.date_of_joining || ''}
                onChange={(e) => setEditForm({ ...editForm, date_of_joining: e.target.value })}
              />
            </label>
            <ProfileField label="Reporting manager" value={employee.manager_name} />
            <ProfileField label="Shift rule" value={employee.shift_template_name} />
            <ProfileField label="Organization" value={employee.organization_name} />
            <ProfileField label="Employee code" value={employee.employee_code} />
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save work details'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ProfileField label="Department" value={employee.department} />
            <ProfileField label="Designation" value={employee.designation} />
            <ProfileField label="Date of joining" value={doj} />
            <ProfileField label="Reporting manager" value={employee.manager_name} />
            <ProfileField label="Shift rule" value={employee.shift_template_name} />
            <ProfileField label="Organization" value={employee.organization_name} />
            <ProfileField label="Employee code" value={employee.employee_code} />
          </div>
        )}
      </ProfileSectionCard>
    </div>
  )
}
