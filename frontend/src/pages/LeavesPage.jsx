import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function LeavesPage() {
  const { isManagerPlus } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' })
  const [activeTab, setActiveTab] = useState('pending')

  async function load() {
    try {
      const { data } = await api.get('/api/leaves/')
      setRows(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => { void load() }, [])

  async function applyLeave(e) {
    e.preventDefault()
    try {
      await api.post('/api/leaves/', form)
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '' })
      toast.success('Leave request submitted.')
      await load()
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  async function review(id, status) {
    try {
      await api.post(`/api/leaves/${id}/review/`, { status })
      toast.success(`Leave ${status}.`)
      await load()
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  const filteredRows = useMemo(() => {
    if (!isManagerPlus) return rows
    if (activeTab === 'all') return rows
    return rows.filter((r) => r.status === activeTab)
  }, [activeTab, isManagerPlus, rows])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Leave Management</h2>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={applyLeave} className="card grid gap-3 p-4 md:grid-cols-5">
        <select className="rounded-xl border border-slate-300 px-3 py-2" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          <option value="annual">annual</option><option value="sick">sick</option><option value="casual">casual</option><option value="unpaid">unpaid</option><option value="other">other</option>
        </select>
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
        <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn-primary">Apply</button>
      </form>
      {isManagerPlus && (
        <div className="card overflow-hidden border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/90 px-3 py-2">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{r.employee_name}</td>
                <td className="px-4 py-3 capitalize">{r.leave_type}</td>
                <td className="px-4 py-3">{dayjs(r.start_date).format('DD MMM YYYY')} to {dayjs(r.end_date).format('DD MMM YYYY')}</td>
                <td className="px-4 py-3">{dayjs(r.end_date).diff(dayjs(r.start_date), 'day') + 1}</td>
                <td className="max-w-[260px] truncate px-4 py-3 text-xs text-slate-600">{r.reason || '-'}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
                <td className="px-4 py-3">
                  {isManagerPlus && r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => void review(r.id, 'approved')}>Approve</button>
                      <button className="btn-secondary" onClick={() => void review(r.id, 'rejected')}>Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="7">No leave requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
