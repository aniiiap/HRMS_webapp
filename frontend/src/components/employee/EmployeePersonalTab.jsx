import dayjs from 'dayjs'
import ProfileSectionCard, { ProfileField } from './ProfileSectionCard'
import { employeeDisplayName } from './profileUtils'

export default function EmployeePersonalTab({ employee, editForm, setEditForm, canEdit, saving, onSave }) {
  const dob = employee.date_of_birth ? dayjs(employee.date_of_birth).format('DD/MM/YYYY') : '—'

  return (
    <div className="space-y-5">
      <ProfileSectionCard title="Personal info">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Name" value={employeeDisplayName(employee)} />
          {canEdit ? (
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date of birth</p>
              <input
                type="date"
                className="input-field mt-1"
                value={editForm.date_of_birth || ''}
                onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
              />
            </label>
          ) : (
            <ProfileField label="Date of birth" value={dob} />
          )}
          <ProfileField label="Employee code" value={employee.employee_code} />
          <ProfileField label="Role" value={employee.role} />
          <ProfileField label="Status" value={employee.is_active !== false ? 'Active' : 'Inactive'} />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Contact info">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label="Official email" value={employee.email} />
          {canEdit ? (
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Phone</p>
              <input
                type="tel"
                className="input-field mt-1"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </label>
          ) : (
            <ProfileField label="Phone" value={employee.phone} />
          )}
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard title="Address">
        {canEdit ? (
          <label className="block">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Residential address</p>
            <textarea
              className="input-field mt-1 min-h-[88px]"
              value={editForm.address || ''}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
          </label>
        ) : (
          <ProfileField label="Residential address" value={employee.address} />
        )}
      </ProfileSectionCard>

      {canEdit && (
        <div className="flex justify-end">
          <button type="button" className="btn-primary" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save personal details'}
          </button>
        </div>
      )}
    </div>
  )
}
