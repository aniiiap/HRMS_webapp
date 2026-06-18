import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, LocateFixed, MailPlus, MapPin, Pencil, Power, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../api/client'
import PageHeader from '../components/ui/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { useSearchParams } from 'react-router-dom'

export default function EmployeesPage() {
  const { isPrivileged } = useAuth()
  const confirm = useConfirm()
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [templates, setTemplates] = useState([])
  const [activeTab, setActiveTab] = useState('employees')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'employee',
    department: '',
    designation: '',
    phone: '',
    date_of_birth: '',
    shift_template: '',
    location_restriction_enabled: true,
  })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    department: '',
    designation: '',
    phone: '',
    date_of_birth: '',
    shift_template: '',
    role: 'employee',
    location_restriction_enabled: true,
  })
  const [busyId, setBusyId] = useState(null)
  const [brokenProfileIds, setBrokenProfileIds] = useState({})
  const [locationForm, setLocationForm] = useState({
    name: 'Main Office',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 200,
    geofencing_enabled: true,
  })
  const [locationBusy, setLocationBusy] = useState(false)

  async function load() {
    try {
      const [{ data }, tplRes] = await Promise.all([
        api.get('/api/employees/'),
        isPrivileged ? api.get('/api/employees/shift-templates/') : Promise.resolve({ data: [] }),
      ])
      setRows(Array.isArray(data) ? data : data.results || [])
      setTemplates(Array.isArray(tplRes.data) ? tplRes.data : tplRes.data.results || [])
      if (isPrivileged) {
        const { data: loc } = await api.get('/api/employees/location-settings/')
        setLocationForm({
          name: loc?.name || 'Main Office',
          address: loc?.address || '',
          latitude: loc?.latitude ?? '',
          longitude: loc?.longitude ?? '',
          radius_meters: loc?.radius_meters ?? 200,
          geofencing_enabled: loc?.geofencing_enabled !== false,
        })
      }
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => { void load() }, [])

  const employeeRows = useMemo(() => {
    const all = rows || []
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    if (!q) return all
    return all.filter((r) => {
      const hay = [
        r.employee_code,
        r.first_name,
        r.last_name,
        r.email,
        r.department,
        r.designation,
        r.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, searchParams])
  async function onboard(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        shift_template: form.shift_template ? Number(form.shift_template) : null,
      }
      const { data } = await api.post('/api/employees/onboard/', payload)
      setForm({
        email: '',
        first_name: '',
        last_name: '',
        role: 'employee',
        department: '',
        designation: '',
        phone: '',
        date_of_birth: '',
        shift_template: '',
        location_restriction_enabled: true,
      })
      let msg = `Created ${data.employee_code} (${data.email}).`
      if (data.invite_sent) msg += ' Invite email sent for password setup.'
      else msg += ` Invite email failed: ${data.email_status || 'unknown error'}`
      toast.success(msg)
      await load()
    } catch (err) {
      const m = messageFromError(err)
      setError(m)
      toast.error(m)
    }
  }

  function startEdit(row) {
    setEditingId(row.id)
    setEditForm({
      department: row.department || '',
      designation: row.designation || '',
      phone: row.phone || '',
      date_of_birth: row.date_of_birth || '',
      shift_template: row.shift_template || '',
      role: row.role || 'employee',
      location_restriction_enabled: row.location_restriction_enabled !== false,
    })
    setError('')
  }

  async function saveEdit(rowId) {
    setError('')
    setBusyId(rowId)
    try {
      await api.patch(`/api/employees/${rowId}/`, {
        ...editForm,
        shift_template: editForm.shift_template ? Number(editForm.shift_template) : null,
      })
      toast.success('Employee updated successfully.')
      setEditingId(null)
      await load()
    } catch (err) {
      const m = messageFromError(err)
      setError(m)
      toast.error(m)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(row) {
    setError('')
    setBusyId(row.id)
    try {
      const next = !(row.is_active !== false)
      await api.post(`/api/employees/${row.id}/set-active/`, { is_active: next })
      toast.success(next ? 'Employee activated.' : 'Employee deactivated.')
      await load()
    } catch (err) {
      const m = messageFromError(err)
      setError(m)
      toast.error(m)
    } finally {
      setBusyId(null)
    }
  }

  async function deleteEmployee(row) {
    const ok = await confirm({
      title: 'Delete employee permanently?',
      message: `Delete ${row.first_name || ''} ${row.last_name || ''} (${row.employee_code})?\n\nThis will remove both the employee profile and login account.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    setError('')
    setBusyId(row.id)
    try {
      await api.delete(`/api/employees/${row.id}/`)
      toast.success('Employee deleted permanently.')
      if (editingId === row.id) setEditingId(null)
      await load()
    } catch (err) {
      const m = messageFromError(err)
      setError(m)
      toast.error(m)
    } finally {
      setBusyId(null)
    }
  }

  async function resendInvite(row) {
    setError('')
    setBusyId(row.id)
    try {
      const { data } = await api.post('/api/auth/invite/resend/', { employee_id: row.id })
      toast.success(data?.message || 'Invite resent.')
      await load()
    } catch (err) {
      const m = messageFromError(err)
      setError(m)
      toast.error(m)
    } finally {
      setBusyId(null)
    }
  }

  async function toggleLocationRestriction(row) {
    setBusyId(row.id)
    try {
      const next = !(row.location_restriction_enabled !== false)
      await api.patch(`/api/employees/${row.id}/`, { location_restriction_enabled: next })
      toast.success(next ? 'Location restriction enabled.' : 'Location restriction disabled.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function saveLocationPolicy() {
    setLocationBusy(true)
    try {
      await api.patch('/api/employees/location-settings/', {
        name: locationForm.name || 'Main Office',
        address: locationForm.address || '',
        latitude: locationForm.latitude === '' ? null : Number(locationForm.latitude),
        longitude: locationForm.longitude === '' ? null : Number(locationForm.longitude),
        radius_meters: Number(locationForm.radius_meters || 200),
        geofencing_enabled: !!locationForm.geofencing_enabled,
      })
      toast.success('Location policy updated.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLocationBusy(false)
    }
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }))
        toast.success('Current location captured.')
      },
      () => toast.error('Unable to read current location. Please allow location permission.'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle="Manage your team, onboarding, and office location. Configure shift rules under Attendance → Rules."
        badge="People"
        action={
          <div className="rounded-2xl border border-brand-200/80 bg-brand-50 px-5 py-3 text-center dark:border-brand-800 dark:bg-brand-950/40">
            <p className="text-3xl font-bold tabular-nums text-brand-700 dark:text-brand-300">{rows.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              {rows.length === 1 ? 'Employee' : 'Employees'}
            </p>
          </div>
        }
      />
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}
      {isPrivileged && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 border-b border-warm-200 bg-warm-50/90 px-3 py-2 dark:border-stone-700 dark:bg-stone-900/70">
            {[
              { id: 'employees', label: 'Employees' },
              { id: 'onboard', label: 'Onboard' },
              { id: 'location', label: 'Location setup' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isPrivileged && activeTab === 'onboard' && (
        <form onSubmit={onboard} className="card grid gap-3 p-4 md:grid-cols-4 motion-safe:animate-fade-up">
          <p className="col-span-full text-sm text-slate-600">
            Add employee details and send a secure invite for first-time password setup.
          </p>
          {[
            'email',
            'first_name',
            'last_name',
            'department',
            'designation',
            'phone',
            'date_of_birth',
          ].map((k) => (
            <input
              key={k}
              className="rounded-xl border border-slate-300 px-3 py-2"
              placeholder={
                k === 'date_of_birth'
                    ? 'Date of birth'
                    : k.replace('_', ' ')
              }
              type={k === 'date_of_birth' ? 'date' : 'text'}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              required={k === 'email'}
            />
          ))}
          <select className="rounded-xl border border-slate-300 px-3 py-2" value={form.shift_template} onChange={(e) => setForm({ ...form, shift_template: e.target.value })}>
            <option value="">Select shift template</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="rounded-xl border border-slate-300 px-3 py-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="employee">employee</option><option value="manager">manager</option><option value="hr">hr</option><option value="admin">admin</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.location_restriction_enabled} onChange={(e) => setForm({ ...form, location_restriction_enabled: e.target.checked })} />
            Restrict attendance to office location
          </label>
          <button className="btn-primary">Onboard</button>
        </form>
      )}

      {isPrivileged && activeTab === 'location' && (
        <div className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Office geo-fencing setup</p>
            <button type="button" className="btn-secondary inline-flex items-center gap-1" onClick={captureCurrentLocation}>
              <LocateFixed size={14} />
              Use current location
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!locationForm.geofencing_enabled}
                  onChange={(e) => setLocationForm({ ...locationForm, geofencing_enabled: e.target.checked })}
                />
                Enable geo-fencing globally
              </label>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Paste latitude and longitude directly (for example: <span className="font-semibold">25.346251</span>, <span className="font-semibold">74.636384</span>).
              </p>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Location name (example: Main Office)"
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                placeholder="Selected address"
                value={locationForm.address}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Office latitude"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                />
                <input
                  className="rounded-xl border border-slate-300 px-3 py-2"
                  placeholder="Office longitude"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Maximum attendance radius</span>
                  <span>{locationForm.radius_meters || 200} m</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="10"
                  className="w-full accent-brand-600"
                  value={locationForm.radius_meters}
                  onChange={(e) => setLocationForm({ ...locationForm, radius_meters: Number(e.target.value) })}
                />
              </div>
              <button type="button" className="btn-primary inline-flex items-center gap-1" onClick={() => void saveLocationPolicy()} disabled={locationBusy}>
                <MapPin size={14} />
                {locationBusy ? 'Saving...' : 'Save location policy'}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {locationForm.latitude !== '' && locationForm.longitude !== '' ? (
                <iframe
                  title="Office map preview"
                  className="h-[320px] w-full"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(locationForm.longitude) - 0.01}%2C${Number(locationForm.latitude) - 0.01}%2C${Number(locationForm.longitude) + 0.01}%2C${Number(locationForm.latitude) + 0.01}&layer=mapnik&marker=${Number(locationForm.latitude)}%2C${Number(locationForm.longitude)}`}
                />
              ) : (
                <iframe
                  title="Office map preview default"
                  className="h-[320px] w-full"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=77.1025%2C28.6047%2C77.3025%2C28.8047&layer=mapnik"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {(!isPrivileged || activeTab === 'employees') && (
        <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Designation</th>
              <th className="w-[120px] px-4 py-3">DOB</th>
              <th className="w-[120px] min-w-[120px] px-4 py-3">Shift</th>
              <th className="w-[120px] px-4 py-3">Status</th>
              <th className="w-[130px] px-4 py-3">Role</th>
              <th className="w-[130px] px-4 py-3">Location</th>
              {isPrivileged && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {employeeRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3 font-mono text-xs">{r.employee_code}</td>
                <td className="px-4 py-3 pr-8">
                  <div className="flex items-center gap-2">
                    {r.profile_image && !brokenProfileIds[r.id] ? (
                      <img
                        src={r.profile_image}
                        alt={`${r.first_name} ${r.last_name}`}
                        className="h-8 w-8 rounded-full object-cover"
                        onError={() => setBrokenProfileIds((prev) => ({ ...prev, [r.id]: true }))}
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-[11px] font-bold text-brand-800">
                        {`${r.first_name || ''} ${r.last_name || ''}`.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || r.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <Link to={`/employees/${r.id}`} className="font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100">
                      {r.first_name} {r.last_name}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-3">{r.email}</td>
                <td className="px-4 py-3">
                  {editingId === r.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      value={editForm.department}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    />
                  ) : (r.department || '-')}
                </td>
                <td className="px-4 py-3">
                  {editingId === r.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    />
                  ) : (r.designation || '-')}
                </td>
                <td className="w-[120px] px-4 py-3">
                  {editingId === r.id ? (
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                      value={editForm.date_of_birth || ''}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    />
                  ) : (r.date_of_birth || '-')}
                </td>
                <td className={`${editingId === r.id ? 'min-w-[150px]' : 'w-[120px]'} px-4 py-3`}>
                  {editingId === r.id ? (
                    <select className="w-full min-w-[130px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm" value={editForm.shift_template || ''} onChange={(e) => setEditForm({ ...editForm, shift_template: e.target.value })}>
                      <option value="">Select shift</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  ) : (
                    <div className="text-xs">
                      <p>{r.shift_template_name || '-'}</p>
                    </div>
                  )}
                </td>
                <td className="w-[120px] px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.onboarding_pending ? 'Invite pending' : (r.is_active !== false ? 'Active' : 'Inactive')}
                  </span>
                </td>
                <td className="w-[130px] px-4 py-3">
                  {editingId === r.id ? (
                    <select className="w-full min-w-[110px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm capitalize shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200" value={editForm.role || 'employee'} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="hr">HR</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="capitalize">{r.role}</span>
                  )}
                </td>
                <td className="w-[130px] px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void toggleLocationRestriction(r)}
                    className={`inline-flex h-6 w-12 items-center rounded-full px-1 transition ${
                      r.location_restriction_enabled !== false ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                    title="Toggle location restriction"
                  >
                    <span className="h-4 w-4 rounded-full bg-white shadow" />
                  </button>
                </td>
                {isPrivileged && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      {editingId === r.id ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"
                            disabled={busyId === r.id}
                            onClick={() => saveEdit(r.id)}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                            disabled={busyId === r.id}
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                          disabled={busyId === r.id}
                          onClick={() => startEdit(r)}
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {editingId !== r.id && (
                        <Link
                          to={`/employees/${r.id}?tab=compensation`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                          title="Payroll"
                        >
                          ₹
                        </Link>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700"
                        disabled={busyId === r.id}
                        onClick={() => toggleActive(r)}
                        title={r.is_active !== false ? 'Deactivate' : 'Activate'}
                      >
                        <Power size={14} />
                      </button>
                      {(r.onboarding_pending || !r.is_active) && (
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 text-brand-700"
                          disabled={busyId === r.id}
                          onClick={() => resendInvite(r)}
                          title="Resend invite"
                        >
                          <MailPlus size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-700"
                        disabled={busyId === r.id}
                        onClick={() => deleteEmployee(r)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {employeeRows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={isPrivileged ? 12 : 10}>No employees found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

    </div>
  )
}
