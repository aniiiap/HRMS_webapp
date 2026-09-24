import dayjs from 'dayjs'
import ProfileSectionCard, { ProfileField } from './ProfileSectionCard'
import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { employeeDisplayName } from './profileUtils'

export default function EmployeePersonalTab({ employee, editForm, setEditForm, canEdit, saving, onSave }) {

  const [customFields, setCustomFields] = useState([])
  useEffect(() => {
    api.get('/api/organizations/').then(res => {
      const orgs = res.data.results || res.data;
      if (orgs && orgs.length > 0) {
        setCustomFields(orgs[0].custom_employee_fields || []);
      }
    }).catch(() => {})
  }, [])

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
          {canEdit ? (
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Official email</p>
              <input
                type="email"
                className="input-field mt-1"
                value={editForm.official_email || ''}
                onChange={(e) => setEditForm({ ...editForm, official_email: e.target.value })}
              />
            </label>
          ) : (
            <ProfileField label="Official email" value={employee.email} />
          )}

          {canEdit ? (
            <label className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Personal email</p>
              <input
                type="email"
                className="input-field mt-1"
                value={editForm.personal_email || ''}
                onChange={(e) => setEditForm({ ...editForm, personal_email: e.target.value })}
              />
            </label>
          ) : (
            <ProfileField label="Personal email" value={employee.personal_email} />
          )}

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

      {(customFields.length > 0 || (employee.custom_fields_data && Object.keys(employee.custom_fields_data).length > 0)) && (
        <ProfileSectionCard title="Custom Fields">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {canEdit ? (
              customFields.length > 0 ? customFields.map((cf) => (
                <label key={cf.name} className="block space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{cf.name}</p>
                  <input
                    type="text"
                    className="input-field mt-1"
                    value={(editForm.custom_fields_data || {})[cf.name] || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      custom_fields_data: {
                        ...(editForm.custom_fields_data || {}),
                        [cf.name]: e.target.value
                      }
                    })}
                  />
                </label>
              )) : Object.entries(employee.custom_fields_data || {}).map(([key, value]) => (
                <label key={key} className="block space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{key}</p>
                  <input
                    type="text"
                    className="input-field mt-1"
                    value={(editForm.custom_fields_data || {})[key] || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      custom_fields_data: {
                        ...(editForm.custom_fields_data || {}),
                        [key]: e.target.value
                      }
                    })}
                  />
                </label>
              ))
            ) : (
              Object.entries(employee.custom_fields_data || {}).map(([key, value]) => (
                <ProfileField key={key} label={key} value={value} />
              ))
            )}
          </div>
        </ProfileSectionCard>
      )}


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
