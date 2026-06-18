import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Pencil, Save, Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import AnnouncementEditorFields from '../components/announcements/AnnouncementEditorFields'
import { fromDateInputValue, todayDateValue, toDateInputValue } from '../utils/announcementForm'

function createEmptyForm() {
  return {
    title: '',
    message: '',
    is_active: true,
    priority: 'normal',
    target_audience: 'all',
    target_value: '',
    target_employee_ids: [],
    send_email: false,
    send_sms: false,
    publish_on: todayDateValue(),
  }
}

function buildPayload(values) {
  return {
    title: values.title.trim(),
    message: values.message.trim(),
    is_active: values.is_active !== false,
    priority: values.priority,
    target_audience: values.target_audience,
    target_value:
      values.target_audience === 'all' || values.target_audience === 'employees'
        ? ''
        : (values.target_value || '').trim(),
    target_employee_ids: values.target_audience === 'employees' ? values.target_employee_ids || [] : [],
    send_email: Boolean(values.send_email),
    send_sms: Boolean(values.send_sms),
    publish_on: fromDateInputValue(values.publish_on),
  }
}

function validateAnnouncement(values) {
  if (!values.title?.trim() || !values.message?.trim()) {
    return 'Title and message are required.'
  }
  if (values.target_audience === 'employees' && !(values.target_employee_ids || []).length) {
    return 'Select at least one employee.'
  }
  if (values.target_audience === 'department' && !(values.target_value || '').trim()) {
    return 'Department is required.'
  }
  if (values.target_audience === 'role' && !(values.target_value || '').trim()) {
    return 'Role is required.'
  }
  return ''
}

export default function AnnouncementsPage() {
  const { isManagerPlus } = useAuth()
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(createEmptyForm)
  const [empSearch, setEmpSearch] = useState('')
  const [editEmpSearch, setEditEmpSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/announcements/')
      setRows(Array.isArray(data) ? data : data.results || [])
      setError('')
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [])

  const loadEmployees = useCallback(async () => {
    if (!isManagerPlus) return
    try {
      const { data } = await api.get('/api/employees/')
      setEmployees(Array.isArray(data) ? data : data.results || [])
    } catch {
      setEmployees([])
    }
  }, [isManagerPlus])

  useEffect(() => {
    void load()
    void loadEmployees()
  }, [load, loadEmployees])

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
      return (
        name.includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
      )
    })
  }, [employees, empSearch])

  const filteredEditEmployees = useMemo(() => {
    const q = editEmpSearch.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) => {
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase()
      return (
        name.includes(q) ||
        (e.employee_code || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
      )
    })
  }, [employees, editEmpSearch])

  function toggleEmployeeInForm(id) {
    setForm((prev) => {
      const set = new Set(prev.target_employee_ids)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, target_employee_ids: Array.from(set) }
    })
  }

  function toggleEmployeeInEdit(id) {
    setEditing((prev) => {
      if (!prev) return prev
      const set = new Set(prev.target_employee_ids || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, target_employee_ids: Array.from(set) }
    })
  }

  function startEdit(row) {
    setEditing({
      id: row.id,
      title: row.title || '',
      message: row.message || '',
      is_active: row.is_active !== false,
      priority: row.priority || 'normal',
      target_audience: row.target_audience || 'all',
      target_value: row.target_value || '',
      target_employee_ids: Array.isArray(row.target_employee_ids) ? row.target_employee_ids : [],
      send_email: Boolean(row.send_email),
      send_sms: Boolean(row.send_sms),
      publish_on: toDateInputValue(row.publish_on),
    })
    setEditEmpSearch('')
  }

  async function publish(e) {
    e.preventDefault()
    const validationError = validateAnnouncement(form)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      const { data } = await api.post('/api/announcements/', buildPayload(form))
      const d = data.delivery || {}
      const parts = [`${d.notifications || 0} notified`]
      if (form.send_email) parts.push(`${d.emails_sent || 0} emailed`)
      if (form.send_sms) parts.push(`${d.sms_sent || 0} SMS`)
      toast.success(`Announcement published — ${parts.join(', ')}.`)
      setForm(createEmptyForm())
      setEmpSearch('')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(e) {
    e?.preventDefault?.()
    if (!editing?.id) return
    const validationError = validateAnnouncement(editing)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      const { data } = await api.patch(`/api/announcements/${editing.id}/`, buildPayload(editing))
      const d = data.delivery || {}
      if (d.notifications) {
        toast.success(`Announcement updated — ${d.notifications} notified.`)
      } else {
        toast.success('Announcement updated.')
      }
      setEditing(null)
      setEditEmpSearch('')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    const ok = await confirm({
      title: 'Delete announcement?',
      message: 'This announcement will be removed for everyone.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/announcements/${id}/`)
      toast.success('Announcement deleted.')
      if (editing?.id === id) setEditing(null)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const activeRows = useMemo(() => rows.filter((r) => r.is_active !== false), [rows])
  const displayRows = isManagerPlus ? rows : activeRows

  const editModal =
    editing &&
    createPortal(
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-stone-900/45 backdrop-blur-sm"
          aria-label="Close edit dialog"
          onClick={() => !saving && setEditing(null)}
        />
        <div
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-announcement-title"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 id="edit-announcement-title" className="text-lg font-semibold text-slate-900 dark:text-white">
              Edit announcement
            </h3>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => !saving && setEditing(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={saveEdit} className="space-y-4">
            <AnnouncementEditorFields
              idPrefix="edit-ann"
              values={editing}
              onChange={setEditing}
              employees={employees}
              filteredEmployees={filteredEditEmployees}
              empSearch={editEmpSearch}
              onEmpSearchChange={setEditEmpSearch}
              onToggleEmployee={toggleEmployeeInEdit}
              showActiveToggle
            />
            <p className="text-xs text-slate-500">
              Updating an announcement will show the popup again to employees who already dismissed it.
            </p>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body,
    )

  return (
    <div className="space-y-5">
      {editModal}

      <div>
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-brand-600 dark:text-brand-400" />
          <h2 className="text-2xl font-bold">Announcements</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {isManagerPlus
            ? 'Publish updates to your team. Recipients get an in-app notification and a one-time popup.'
            : 'Company updates from your HR team.'}
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      {isManagerPlus && (
        <form onSubmit={publish} className="card space-y-4 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Publish announcement</h3>
          <AnnouncementEditorFields
            idPrefix="new-ann"
            values={form}
            onChange={setForm}
            employees={employees}
            filteredEmployees={filteredEmployees}
            empSearch={empSearch}
            onEmpSearchChange={setEmpSearch}
            onToggleEmployee={toggleEmployeeInForm}
          />
          <p className="text-xs text-slate-500">
            In-app notification and popup are always sent. Email uses your Resend setup. SMS requires Twilio configuration.
          </p>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Publishing…' : 'Publish announcement'}
          </button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Channels</th>
              <th className="px-4 py-3">Publish date</th>
              {isManagerPlus && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-semibold">{r.title}</td>
                <td className="max-w-xs px-4 py-3 text-slate-600 dark:text-slate-300">{r.message}</td>
                <td className="px-4 py-3 text-xs">{r.created_by_name || 'System'}</td>
                <td className="px-4 py-3 text-xs capitalize">{r.priority || 'normal'}</td>
                <td className="px-4 py-3 text-xs">
                  {r.target_audience === 'department'
                    ? `Dept: ${r.target_value || '—'}`
                    : r.target_audience === 'role'
                      ? `Role: ${r.target_value || '—'}`
                      : r.target_audience === 'employees'
                        ? `${(r.target_employee_ids || r.target_employee_names || []).length || 'Selected'} employee(s)`
                        : 'All employees'}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                      r.is_active !== false
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {r.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  App{r.send_email ? ' · Email' : ''}
                  {r.send_sms ? ' · SMS' : ''}
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.publish_on ? dayjs(r.publish_on).format('DD MMM YYYY') : '—'}
                </td>
                {isManagerPlus && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1"
                        title="Edit announcement"
                        onClick={() => startEdit(r)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1"
                        title="Delete announcement"
                        onClick={() => void remove(r.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={isManagerPlus ? 9 : 8} className="px-4 py-8 text-center text-slate-500">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
