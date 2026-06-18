import { useEffect, useState } from 'react'
import { Building2, Mail, Plus, Trash2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import StatusBadge from '../../components/ui/StatusBadge'
import { useConfirm } from '../../context/ConfirmContext'

const PLANS = ['trial', 'starter', 'growth', 'enterprise']

const emptyForm = {
  name: '',
  legal_name: '',
  contact_email: '',
  admin_email: '',
  admin_first_name: '',
  admin_last_name: '',
  plan: 'trial',
  is_active: true,
  send_invite: true,
}

export default function PlatformOrganizationsPage() {
  const confirm = useConfirm()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmName, setConfirmName] = useState('')
  const [resendingId, setResendingId] = useState(null)

  async function load() {
    const { data } = await api.get('/api/platform/organizations/')
    setRows(Array.isArray(data) ? data : data.results || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function createOrg(e) {
    e.preventDefault()
    const adminEmail = form.admin_email.trim() || form.contact_email.trim()
    if (form.send_invite && !adminEmail) {
      toast.error('Enter admin email or contact email to send the signup invite.')
      return
    }
    try {
      const payload = {
        name: form.name,
        legal_name: form.legal_name,
        contact_email: form.contact_email,
        plan: form.plan,
        is_active: form.is_active,
        send_invite: form.send_invite,
      }
      if (form.admin_email.trim()) payload.admin_email = form.admin_email.trim()
      if (form.admin_first_name.trim()) payload.admin_first_name = form.admin_first_name.trim()
      if (form.admin_last_name.trim()) payload.admin_last_name = form.admin_last_name.trim()

      const { data } = await api.post('/api/platform/organizations/', payload)
      const invite = data.admin_invite
      if (invite?.invite_sent) {
        toast.success(`Company created. Signup invite sent to ${invite.email}.`)
      } else if (invite) {
        toast.success(`Company created. Admin account created but email failed: ${invite.detail || 'check Resend config'}.`)
      } else {
        toast.success('Organization created.')
      }
      setForm(emptyForm)
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function toggleActive(org) {
    try {
      await api.post(`/api/platform/organizations/${org.id}/set-active/`, { is_active: !org.is_active })
      toast.success(org.is_active ? 'Organization deactivated.' : 'Organization activated.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function resendInvite(org) {
    setResendingId(org.id)
    try {
      const { data } = await api.post(`/api/platform/organizations/${org.id}/resend-admin-invite/`, {})
      toast.success(data.invite_sent ? `Invite resent to ${data.email}.` : data.message || 'Invite created; email may have failed.')
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setResendingId(null)
    }
  }

  async function deleteOrg() {
    if (!deleteTarget) return
    const hasEmployees = (deleteTarget.employee_count ?? 0) > 0
    if (hasEmployees && confirmName.trim() !== deleteTarget.name) {
      toast.error('Type the exact company name to confirm permanent deletion.')
      return
    }
    if (!hasEmployees) {
      const ok = await confirm({
        title: 'Delete organization?',
        message: `Delete "${deleteTarget.name}" permanently? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      })
      if (!ok) return
    }

    try {
      const params = hasEmployees ? { force: 'true' } : {}
      await api.delete(`/api/platform/organizations/${deleteTarget.id}/`, {
        params,
        data: hasEmployees ? { confirm_name: confirmName.trim() } : {},
      })
      toast.success('Organization deleted.')
      setDeleteTarget(null)
      setConfirmName('')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Organizations</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create a company and email its admin a signup link. After they set a password, they get the full company admin dashboard.
        </p>
      </div>

      <form onSubmit={createOrg} className="card space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Building2 className="text-brand-600" size={20} />
          <h3 className="font-semibold">New organization + admin invite</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Company name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Legal name"
            value={form.legal_name}
            onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
          />
          <input
            type="email"
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            placeholder="Contact email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
          <select
            className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="text-brand-600" size={18} />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Organization admin (signup email)</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Admin email (or uses contact email)"
              value={form.admin_email}
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Admin first name"
              value={form.admin_first_name}
              onChange={(e) => setForm({ ...form, admin_first_name: e.target.value })}
            />
            <input
              className="rounded-lg border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Admin last name"
              value={form.admin_last_name}
              onChange={(e) => setForm({ ...form, admin_last_name: e.target.value })}
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={form.send_invite}
              onChange={(e) => setForm({ ...form, send_invite: e.target.checked })}
            />
            Send signup link by email (activate account → login to admin dashboard)
          </label>
        </div>

        <button type="submit" className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} />
          Create company & send invite
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Employees</th>
              <th className="px-4 py-3">Admins</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">
                  <p className="font-medium">{o.name}</p>
                  <p className="font-mono text-xs text-slate-500">{o.slug}</p>
                  {o.contact_email && <p className="text-xs text-slate-500">{o.contact_email}</p>}
                </td>
                <td className="px-4 py-3 capitalize">{o.plan}</td>
                <td className="px-4 py-3">{o.employee_count ?? 0}</td>
                <td className="px-4 py-3">
                  {o.admin_count ?? 0}
                  {(o.pending_admin_count ?? 0) > 0 && (
                    <span className="ml-1 text-xs text-amber-600">({o.pending_admin_count} pending)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.is_active ? 'approved' : 'rejected'} label={o.is_active ? 'Active' : 'Inactive'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className="text-xs font-semibold text-brand-600" onClick={() => toggleActive(o)}>
                      {o.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {(o.pending_admin_count ?? 0) > 0 && (
                      <button
                        type="button"
                        disabled={resendingId === o.id}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-400"
                        onClick={() => void resendInvite(o)}
                      >
                        <Mail size={14} />
                        {resendingId === o.id ? 'Sending…' : 'Resend invite'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                      onClick={() => {
                        setDeleteTarget(o)
                        setConfirmName('')
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-4 p-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete organization</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Permanently remove <strong>{deleteTarget.name}</strong>
              {(deleteTarget.employee_count ?? 0) > 0 && (
                <> and all <strong>{deleteTarget.employee_count}</strong> employee record(s), payroll data, and linked users.</>
              )}
              . This cannot be undone.
            </p>
            {(deleteTarget.employee_count ?? 0) > 0 && (
              <label className="block text-xs text-slate-500">
                Type <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{deleteTarget.name}</span> to confirm
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={deleteTarget.name}
                />
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => { setDeleteTarget(null); setConfirmName('') }}>
                Cancel
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700" onClick={() => void deleteOrg()}>
                <Trash2 size={16} />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
