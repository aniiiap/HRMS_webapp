import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'
import Pagination from '../components/Pagination'
import LeaveRulesPanel from '../components/leaves/LeaveRulesPanel'
import { useAuth } from '../context/AuthContext'

export default function LeavesPage() {
  const { isManagerPlus } = useAuth()
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ leave_type: 'paid_leave', start_date: '', end_date: '', reason: '' })
  const [activeTab, setActiveTab] = useState('requests')
  const [requestFilter, setRequestFilter] = useState('pending')
  const [requestPage, setRequestPage] = useState(1)
  const [requestPageSize, setRequestPageSize] = useState(10)
  const [applicableRules, setApplicableRules] = useState([])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const valid = ['requests', 'balances', ...(isManagerPlus ? ['rules'] : [])]
    if (tab && valid.includes(tab)) setActiveTab(tab)
  }, [searchParams, isManagerPlus])

  async function load() {
    try {
      const [leavesRes, balancesRes, rulesRes] = await Promise.all([
        api.get('/api/leaves/'),
        api.get('/api/leaves/balances/'),
        api.get('/api/leave-rules/applicable/'),
      ])
      const leavesData = leavesRes.data
      const balancesData = balancesRes.data
      const rulesData = rulesRes.data
      setRows(Array.isArray(leavesData) ? leavesData : leavesData.results || [])
      setBalances(Array.isArray(balancesData) ? balancesData : balancesData.results || [])
      setApplicableRules(Array.isArray(rulesData) ? rulesData : rulesData.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (!applicableRules.length) return
    setForm((f) => {
      if (applicableRules.some((r) => r.code === f.leave_type)) return f
      return { ...f, leave_type: applicableRules[0].code }
    })
  }, [applicableRules])

  async function applyLeave(e) {
    e.preventDefault()
    try {
      await api.post('/api/leaves/', form)
      setForm({ leave_type: applicableRules[0]?.code || 'paid_leave', start_date: '', end_date: '', reason: '' })
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
    let list = rows
    if (isManagerPlus && requestFilter !== 'all') {
      list = rows.filter((r) => r.status === requestFilter)
    }
    return list
  }, [isManagerPlus, requestFilter, rows])

  const requestTotalPages = Math.max(Math.ceil(filteredRows.length / requestPageSize), 1)

  const visibleRows = useMemo(
    () => filteredRows.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [filteredRows, requestPage, requestPageSize],
  )

  const leaveLabel = (lt, name) => {
    if (name) return name
    const labels = {
      paid_leave: 'Paid Leave',
      annual: 'Paid Leave',
      sick_leave: 'Sick Leave',
      sick: 'Sick Leave',
      casual_leave: 'Casual Leave',
      casual: 'Casual Leave',
      loss_of_pay: 'Loss Of Pay',
      unpaid: 'Loss Of Pay',
      work_from_home: 'Work From Home',
      maternity_leave: 'Maternity Leave',
      paternity_leave: 'Paternity Leave',
      on_duty_leave: 'On Duty Leave',
      event_leave: 'Event Leave',
      comp_off: 'Comp Off',
      other: 'Other',
    }
    return labels[lt] || String(lt || '').replace(/_/g, ' ')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Leave Management</h2>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="card overflow-hidden border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/90 px-3 py-2">
          {[
            { id: 'requests', label: 'Requests' },
            ...(isManagerPlus ? [{ id: 'rules', label: 'Rules' }] : []),
            { id: 'balances', label: 'Balances' },
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

      {activeTab === 'requests' && (
        <>
          <form onSubmit={applyLeave} className="card grid gap-3 p-4 md:grid-cols-5">
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              {applicableRules.map((r) => (
                <option key={r.id} value={r.code}>{r.name}</option>
              ))}
              {applicableRules.length === 0 && <option value="paid_leave">Paid Leave</option>}
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
                    onClick={() => { setRequestFilter(tab.id); setRequestPage(1) }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      requestFilter === tab.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'
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
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{r.employee_name}</td>
                    <td className="px-4 py-3">{r.leave_type_name || leaveLabel(r.leave_type)}</td>
                    <td className="px-4 py-3 text-xs">{r.policy_name || 'Unassigned'}</td>
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
                {visibleRows.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="8">No leave requests.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination
            page={requestPage}
            totalPages={requestTotalPages}
            total={filteredRows.length}
            pageSize={requestPageSize}
            onPageChange={setRequestPage}
            onPageSizeChange={(size) => { setRequestPageSize(size); setRequestPage(1) }}
          />
        </>
      )}

      {isManagerPlus && activeTab === 'rules' && (
        <div className="card overflow-hidden border border-slate-200/80 p-0">
          <LeaveRulesPanel onChanged={() => void load()} />
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Rules</th>
                <th className="px-4 py-3">Probation</th>
                <th className="px-4 py-3">Leave balances (used / quota)</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={`${b.employee_id}-${b.year}`} className="border-t border-slate-100">
                  <td className="px-4 py-3">{b.employee_code} - {b.employee_name}</td>
                  <td className="px-4 py-3 text-xs">{b.policy_name || '—'}</td>
                  <td className="px-4 py-3">{b.is_on_probation ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(b.balances || {}).map(([code, row]) => (
                        <span key={code}>
                          {row.name || leaveLabel(code)}: {row.used || 0}
                          {row.quota === null ? ' / Unlimited' : ` / ${row.quota || 0}`}
                          {row.remaining !== null && row.remaining !== undefined ? ` (left ${row.remaining})` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {balances.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="4">No leave balance records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
