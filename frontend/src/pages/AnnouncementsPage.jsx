import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Pencil, Save, Trash2, X } from 'lucide-react'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function AnnouncementsPage() {
  const { isManagerPlus } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    title: '',
    message: '',
    is_active: true,
    priority: 'normal',
    target_audience: 'all',
    target_value: '',
    expires_at: '',
  })
  const roleOptions = ['employee', 'manager', 'hr', 'admin']

  async function load() {
    try {
      const { data } = await api.get('/api/announcements/')
      setRows(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function publish(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return
    setSaving(true)
    try {
      await api.post('/api/announcements/', {
        title: form.title.trim(),
        message: form.message.trim(),
        is_active: form.is_active,
        priority: form.priority,
        target_audience: form.target_audience,
        target_value: form.target_audience === 'all' ? '' : form.target_value.trim(),
        expires_at: form.expires_at ? dayjs(form.expires_at).toISOString() : null,
      })
      toast.success('Announcement published.')
      setForm({
        title: '',
        message: '',
        is_active: true,
        priority: 'normal',
        target_audience: 'all',
        target_value: '',
        expires_at: '',
      })
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing?.id) return
    setSaving(true)
    try {
      await api.patch(`/api/announcements/${editing.id}/`, {
        title: editing.title,
        message: editing.message,
        is_active: editing.is_active,
        priority: editing.priority,
        target_audience: editing.target_audience,
        target_value: editing.target_audience === 'all' ? '' : (editing.target_value || '').trim(),
        expires_at: editing.expires_at ? dayjs(editing.expires_at).toISOString() : null,
      })
      toast.success('Announcement updated.')
      setEditing(null)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await api.delete(`/api/announcements/${id}/`)
      toast.success('Announcement deleted.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const activeRows = useMemo(() => rows.filter((r) => r.is_active !== false), [rows])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Megaphone size={20} className="text-brand-600 dark:text-brand-400" />
        <h2 className="text-2xl font-bold">Announcements</h2>
      </div>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      {isManagerPlus && (
        <form onSubmit={publish} className="card grid gap-3 p-4 md:grid-cols-6">
          <input
            className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2 dark:border-slate-600 dark:bg-slate-900"
            placeholder="Announcement title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            maxLength={180}
            required
          />
          <input
            className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2 dark:border-slate-600 dark:bg-slate-900"
            placeholder="Write update message"
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            maxLength={2000}
            required
          />
          <select
            className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-1 dark:border-slate-600 dark:bg-slate-900"
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="critical">Critical</option>
          </select>
          <select
            className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-1 dark:border-slate-600 dark:bg-slate-900"
            value={form.target_audience}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                target_audience: e.target.value,
                target_value: e.target.value === 'all' ? '' : prev.target_value,
              }))
            }
          >
            <option value="all">All employees</option>
            <option value="department">Department</option>
            <option value="role">Role</option>
          </select>
          {form.target_audience === 'department' ? (
            <input
              className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-1 dark:border-slate-600 dark:bg-slate-900"
              placeholder="Department"
              value={form.target_value}
              onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))}
              required
            />
          ) : form.target_audience === 'role' ? (
            <select
              className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-1 dark:border-slate-600 dark:bg-slate-900"
              value={form.target_value}
              onChange={(e) => setForm((prev) => ({ ...prev, target_value: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select role
              </option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 md:col-span-1 dark:border-slate-700 dark:bg-slate-800"
              value="All employees"
              readOnly
            />
          )}
          <input
            type="datetime-local"
            className="rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-1 dark:border-slate-600 dark:bg-slate-900"
            value={form.expires_at}
            onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value }))}
          />
          <button className="btn-primary md:col-span-1" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Announced by</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3">Status</th>
              {isManagerPlus && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(isManagerPlus ? rows : activeRows).map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  {editing?.id === r.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900"
                      value={editing.title}
                      onChange={(e) => setEditing((prev) => ({ ...prev, title: e.target.value }))}
                    />
                  ) : (
                    <span className="font-semibold text-slate-900 dark:text-white">{r.title}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editing?.id === r.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900"
                      value={editing.message}
                      onChange={(e) => setEditing((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">{r.message}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{r.created_by_name || 'System'}</td>
                <td className="px-4 py-3 text-xs">
                  {editing?.id === r.id ? (
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                      value={editing.priority || 'normal'}
                      onChange={(e) => setEditing((prev) => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                      <option value="critical">Critical</option>
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.priority === 'critical'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        : r.priority === 'important'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {String(r.priority || 'normal')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {editing?.id === r.id ? (
                    <div className="flex min-w-[220px] gap-1.5">
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                        value={editing.target_audience || 'all'}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            target_audience: e.target.value,
                            target_value: e.target.value === 'all' ? '' : prev.target_value || '',
                          }))
                        }
                      >
                        <option value="all">All</option>
                        <option value="department">Department</option>
                        <option value="role">Role</option>
                      </select>
                      {editing.target_audience === 'department' ? (
                        <input
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                          value={editing.target_value || ''}
                          onChange={(e) => setEditing((prev) => ({ ...prev, target_value: e.target.value }))}
                        />
                      ) : editing.target_audience === 'role' ? (
                        <select
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                          value={editing.target_value || ''}
                          onChange={(e) => setEditing((prev) => ({ ...prev, target_value: e.target.value }))}
                        >
                          <option value="" disabled>
                            Select role
                          </option>
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          All employees
                        </span>
                      )}
                    </div>
                  ) : (
                    <span>
                      {r.target_audience === 'department'
                        ? `Dept: ${r.target_value || '-'}`
                        : r.target_audience === 'role'
                          ? `Role: ${r.target_value || '-'}`
                          : 'All employees'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {editing?.id === r.id ? (
                    <input
                      type="datetime-local"
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                      value={editing.expires_at ? dayjs(editing.expires_at).format('YYYY-MM-DDTHH:mm') : ''}
                      onChange={(e) =>
                        setEditing((prev) => ({ ...prev, expires_at: e.target.value ? dayjs(e.target.value).toISOString() : null }))
                      }
                    />
                  ) : (
                    r.expires_at ? dayjs(r.expires_at).format('DD MMM YYYY, HH:mm') : 'No expiry'
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{r.published_at ? dayjs(r.published_at).format('DD MMM YYYY, HH:mm') : '-'}</td>
                <td className="px-4 py-3">
                  {editing?.id === r.id ? (
                    <select
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                      value={editing.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setEditing((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${r.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                {isManagerPlus && (
                  <td className="px-4 py-3">
                    {editing?.id === r.id ? (
                      <div className="flex gap-2">
                        <button className="btn-secondary !px-2 !py-1" type="button" onClick={() => void saveEdit()}><Save size={14} /></button>
                        <button className="btn-secondary !px-2 !py-1" type="button" onClick={() => setEditing(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary !px-2 !py-1"
                          type="button"
                          onClick={() =>
                            setEditing({
                              id: r.id,
                              title: r.title,
                              message: r.message,
                              is_active: r.is_active,
                              priority: r.priority || 'normal',
                              target_audience: r.target_audience || 'all',
                              target_value: r.target_value || '',
                              expires_at: r.expires_at || null,
                            })
                          }
                        >
                          <Pencil size={14} />
                        </button>
                        <button className="btn-secondary !px-2 !py-1" type="button" onClick={() => void remove(r.id)}><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {(isManagerPlus ? rows : activeRows).length === 0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={isManagerPlus ? 9 : 8}>No announcements yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
