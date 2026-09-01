import { useState } from 'react'
import dayjs from 'dayjs'
import StatusBadge from '../ui/StatusBadge'
import ProfileSectionCard from './ProfileSectionCard'
import { Pencil, X, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../api/client'

const LEAVE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  other: 'Other leave',
  unpaid: 'Unpaid leave',
}

import { createPortal } from 'react-dom'

export default function EmployeeLeaveTab({ leaves = [], leaveBalance }) {
  const [subTab, setSubTab] = useState('balances')
  const { isManagerPlus, isPrivileged } = useAuth()
  const [editModal, setEditModal] = useState(null) // { type, currentQuota, name }
  const [newQuota, setNewQuota] = useState('')
  const [newApplied, setNewApplied] = useState('')
  const [newRemaining, setNewRemaining] = useState('')
  const [newCarryForward, setNewCarryForward] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [applyModal, setApplyModal] = useState(false)
  const [applyForm, setApplyForm] = useState({ leave_type: Object.keys(leaveBalance?.balances || {})[0] || 'paid_leave', start_date: '', end_date: '', half_day: 'none', reason: '', status: 'approved' })
  const [applying, setApplying] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const balances = leaveBalance?.balances || {}

  async function handleDeleteLeave(e) {
    e.preventDefault()
    if (!deleteModal) return
    try {
      setDeleting(true)
      await api.delete(`/api/leaves/${deleteModal}/`)
      window.location.reload()
    } catch (err) {
      console.error(err)
      alert('Failed to delete leave request')
    } finally {
      setDeleting(false)
      setDeleteModal(null)
    }
  }

  async function handleApplyLeave(e) {
    e.preventDefault()
    if (!leaveBalance?.employee_id) return
    try {
      setApplying(true)
      await api.post('/api/leaves/', { ...applyForm, employee: leaveBalance.employee_id })
      window.location.reload()
    } catch (err) {
      console.error(err.response?.data)
      const data = err.response?.data || {}
      const msg = data.detail || data.non_field_errors?.[0] || Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Failed to apply leave'
      alert(msg)
    } finally {
      setApplying(false)
    }
  }

  async function handleSaveQuota(e) {
    e.preventDefault()
    if (!editModal || !leaveBalance?.employee_id) return
    try {
      setSaving(true)
      await api.post('/api/leaves/balances/override/', {
        employee_id: leaveBalance.employee_id,
        leave_type: editModal.type,
        quota: newQuota,
        applied: newApplied,
        carry_forward: newCarryForward
      })
      window.location.reload()
    } catch (err) {
      alert(err.response?.data?.quota || 'Failed to update quota')
    } finally {
      setSaving(false)
    }
  }

  function handleQuotaChange(val, carryForwardVal = newCarryForward) {
    setNewQuota(val)
    if (val !== '' && newApplied !== '') {
      // Total effective is what they type in Total Quota, no automatic sum needed here if they manually edit Total
      setNewRemaining(Math.max(0, parseFloat(val) - parseFloat(newApplied)))
    }
  }

  function handleCarryForwardChange(val) {
    setNewCarryForward(val)
    const baseQuota = Math.max(0, parseFloat(newQuota || 0) - parseFloat(newCarryForward || 0));
    const newTotal = baseQuota + parseFloat(val || 0);
    setNewQuota(newTotal);
    if (newApplied !== '') {
      setNewRemaining(Math.max(0, newTotal - parseFloat(newApplied)));
    }
  }

  function handleAppliedChange(val) {
    setNewApplied(val)
    if (val !== '' && newQuota !== '') {
      setNewRemaining(Math.max(0, parseFloat(newQuota) - parseFloat(val)))
    }
  }

  function handleRemainingChange(val) {
    setNewRemaining(val)
    if (val !== '' && newQuota !== '') {
      setNewApplied(Math.max(0, parseFloat(newQuota) - parseFloat(val)))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/50">
          {[
            { id: 'balances', label: 'Leave balance' },
            { id: 'logs', label: 'Logs' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                subTab === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {leaveBalance?.policy_name && (
            <p className="text-xs text-slate-500">
              Rule: <span className="font-medium text-slate-700 dark:text-slate-300">{leaveBalance.policy_name}</span>
              {leaveBalance.is_on_probation ? ' · On probation' : ''}
            </p>
          )}
          {isPrivileged && (
            <button
              onClick={() => setApplyModal(true)}
              className="btn-primary text-xs !py-1.5"
            >
              Apply Leave
            </button>
          )}
        </div>
      </div>

      {subTab === 'balances' && (
        <>
          {!leaveBalance ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              No leave rule assigned. Assign one under Leaves → Rules.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(balances).map(([type, b]) => {
                if (type === 'loss_of_pay' || type === 'unpaid') return null
                const remaining = b.remaining
                return (
                  <div
                    key={type}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50 flex justify-between items-center">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {b.name || LEAVE_LABELS[type] || type.replace(/_/g, ' ')}
                      </p>
                      {isPrivileged && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditModal({ type, name: b.name || LEAVE_LABELS[type] || type.replace(/_/g, ' '), currentQuota: b.quota })
                            setNewQuota(b.quota ?? '')
                            setNewCarryForward(b.carry_forward ?? 0)
                            setNewApplied(b.used ?? 0)
                            setNewRemaining(b.remaining ?? 0)
                          }}
                          className="text-slate-400 hover:text-brand-600 transition"
                          title="Edit total quota"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex">
                      <div className="flex-1 space-y-2 p-4 text-xs text-slate-600 dark:text-slate-400">
                        <Row label="Total quota" value={b.quota ?? '—'} />
                        {b.carry_forward > 0 && (
                          <>
                            <div className="pl-2 space-y-2 border-l-2 border-slate-100 dark:border-slate-800">
                              <Row label="Regular" value={Number(b.quota - b.carry_forward).toFixed(b.quota % 1 ? 2 : 0)} />
                              <Row label="Carry forward" value={b.carry_forward} />
                            </div>
                          </>
                        )}
                        <Row label="Applied" value={b.used ?? 0} />
                        <Row label="Remaining" value={remaining ?? '—'} />
                      </div>
                      <div className="flex w-24 flex-col items-center justify-center border-l border-slate-100 bg-brand-50/30 dark:border-slate-800 dark:bg-brand-950/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Balance</p>
                        <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                          {remaining != null ? Number(remaining).toFixed(remaining % 1 ? 2 : 0) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'logs' && (
        <ProfileSectionCard title="Leave requests">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">From</th>
                  <th className="px-3 py-2.5">To</th>
                  <th className="px-3 py-2.5">Days</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Applied</th>
                  {isPrivileged && <th className="px-3 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-3">{l.leave_type_name || l.leave_type?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3">{l.start_date}</td>
                    <td className="px-3 py-3">{l.end_date}</td>
                    <td className="px-3 py-3">
                      {l.start_date && l.end_date ? dayjs(l.end_date).diff(dayjs(l.start_date), 'day') + 1 : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {l.created_at ? dayjs(l.created_at).format('DD MMM YYYY') : '—'}
                    </td>
                    {isPrivileged && (
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDeleteModal(l.id)}
                          className="text-slate-400 hover:text-red-500"
                          title="Remove leave"
                        >
                          <X className="h-4 w-4 inline" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={isPrivileged ? 7 : 6} className="px-3 py-10 text-center text-slate-500">
                      No leave requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ProfileSectionCard>
      )}

      {editModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <form
              onSubmit={handleSaveQuota}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 motion-safe:animate-fade-in-up"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Quota: {editModal.name}</h3>
                <button type="button" onClick={() => setEditModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Total Quota</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  value={newQuota}
                  onChange={(e) => handleQuotaChange(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Carry Forward / Probation</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  value={newCarryForward}
                  onChange={(e) => handleCarryForwardChange(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">Automatically adds to Total Quota</p>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Applied</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  value={newApplied}
                  onChange={(e) => handleAppliedChange(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Remaining</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  value={newRemaining}
                  onChange={(e) => handleRemainingChange(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  <Check size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

        {deleteModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 motion-safe:animate-fade-in-up">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Remove Leave</h3>
                <button type="button" onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                Are you sure you want to remove this leave request? This will automatically refund the employee's leave balance.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLeave}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Removing...' : 'Remove Leave'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {applyModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <form
              onSubmit={handleApplyLeave}
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 motion-safe:animate-fade-in-up"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply Leave</h3>
                <button type="button" onClick={() => setApplyModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    value={applyForm.leave_type}
                    onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                  >
                    {Object.keys(balances).map((lt) => (
                      <option key={lt} value={lt}>
                        {balances[lt]?.name || LEAVE_LABELS[lt] || lt.replace(/_/g, ' ')}
                      </option>
                    ))}
                    {Object.keys(balances).length === 0 && <option value="paid_leave">Paid Leave</option>}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">From</label>
                    <input
                      type="date"
                      required
                      min={new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().split('T')[0]}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                      value={applyForm.start_date}
                      onChange={(e) => {
                        const start_date = e.target.value
                        setApplyForm((f) => ({
                          ...f,
                          start_date,
                          end_date: f.half_day !== 'none' ? start_date : f.end_date < start_date ? start_date : f.end_date,
                        }))
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
                    <input
                      type="date"
                      required
                      min={applyForm.start_date}
                      disabled={applyForm.half_day !== 'none'}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 disabled:opacity-50"
                      value={applyForm.end_date}
                      onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Duration</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    value={applyForm.half_day}
                    onChange={(e) => {
                      const half_day = e.target.value
                      setApplyForm((f) => ({
                        ...f,
                        half_day,
                        end_date: half_day !== 'none' && f.start_date ? f.start_date : f.end_date,
                      }))
                    }}
                  >
                    <option value="none">Full Day</option>
                    <option value="first_half">First Half</option>
                    <option value="second_half">Second Half</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                    placeholder="E.g., Sick leave"
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button type="submit" disabled={applying} className="btn-primary flex items-center gap-2">
                  <Check size={16} />
                  {applying ? 'Applying...' : 'Apply & Approve'}
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  )
}
