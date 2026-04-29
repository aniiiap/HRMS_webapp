import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const TABS = [
  { id: 'personal', label: 'Personal' },
  { id: 'work', label: 'Work' },
  { id: 'team', label: 'Team' },
  { id: 'workweek', label: 'Work Week' },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('personal')
  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
  })
  const [profileFile, setProfileFile] = useState(null)
  const [profileImageBroken, setProfileImageBroken] = useState(false)

  const initials = useMemo(() => {
    const name = `${profile?.first_name || user?.first_name || ''} ${profile?.last_name || user?.last_name || ''}`.trim()
    if (!name) return (user?.email?.[0] || '?').toUpperCase()
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [profile, user])

  async function load() {
    try {
      const { data } = await api.get('/api/employees/me/')
      setProfile(data)
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        address: data.address || '',
        date_of_birth: data.date_of_birth || '',
      })
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setProfileImageBroken(false)
  }, [profile?.profile_image])

  async function save() {
    setError('')
    try {
      if (profileFile) {
        const payload = new FormData()
        Object.entries(form).forEach(([k, v]) => payload.append(k, v || ''))
        payload.append('profile_image', profileFile)
        await api.patch('/api/employees/me/', payload)
      } else {
        await api.patch('/api/employees/me/', form)
      }
      toast.success('Profile updated.')
      setEditMode(false)
      setProfileFile(null)
      await load()
    } catch (err) {
      const m = messageFromError(err)
      if (String(m).toLowerCase().includes('unauthorized') || String(m).toLowerCase().includes('token')) {
        toast.error('Session expired. Please login again.')
        navigate('/login', { replace: true })
        return
      }
      setError(m)
      toast.error(m)
    }
  }

  const tabBody =
    activeTab === 'personal' ? (
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          First name
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            disabled={!editMode}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Last name
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            disabled={!editMode}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Phone
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={!editMode}
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Date of birth
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={form.date_of_birth || ''}
            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            disabled={!editMode}
          />
        </label>
        <label className="md:col-span-2 text-sm text-slate-600 dark:text-slate-300">
          Address
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            disabled={!editMode}
          />
        </label>
      </div>
    ) : activeTab === 'work' ? (
      <div className="grid gap-3 md:grid-cols-2 text-sm">
        <p><span className="font-semibold">Employee code:</span> {profile?.employee_code || '-'}</p>
        <p><span className="font-semibold">Role:</span> {profile?.role || '-'}</p>
        <p><span className="font-semibold">Department:</span> {profile?.department || '-'}</p>
        <p><span className="font-semibold">Designation:</span> {profile?.designation || '-'}</p>
        <p><span className="font-semibold">Shift:</span> {profile?.shift_template_name || `${profile?.shift_start_time || '--:--'} to ${profile?.shift_end_time || '--:--'}`}</p>
      </div>
    ) : activeTab === 'team' ? (
      <div className="text-sm text-slate-600 dark:text-slate-300">
        <p><span className="font-semibold">Team lead:</span> {profile?.manager_name || 'Not assigned'}</p>
      </div>
    ) : (
      <div className="text-sm text-slate-600 dark:text-slate-300">
        <p>Default work week: Monday - Friday</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">This can be extended with shift settings later.</p>
      </div>
    )

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-4">
          {profile?.profile_image && !profileImageBroken ? (
            <img src={profile.profile_image} alt="Profile" className="h-14 w-14 rounded-full object-cover" onError={() => setProfileImageBroken(true)} />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-700 text-lg font-bold text-white">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user?.email}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.role || user?.role}</p>
          </div>
          {editMode && (
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Profile image
              <input
                type="file"
                accept="image/*"
                className="mt-1 block text-xs"
                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
          <div className="ml-auto flex gap-2">
            {!editMode ? (
              <button className="btn-secondary" onClick={() => setEditMode(true)}>Edit profile</button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => { setEditMode(false); void load() }}>Cancel</button>
                <button className="btn-primary" onClick={save}>Save</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${activeTab === tab.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {tabBody}
      </div>
    </div>
  )
}
