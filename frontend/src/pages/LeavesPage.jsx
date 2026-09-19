import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'
import Pagination from '../components/Pagination'
import LeaveRulesPanel from '../components/leaves/LeaveRulesPanel'
import AuditLogPanel from '../components/AuditLogPanel'
import { useAuth } from '../context/AuthContext'
import { Pencil, Check, X, XCircle } from 'lucide-react'

dayjs.extend(isSameOrAfter)

export default function LeavesPage() {
  const { isManagerPlus, user } = useAuth()
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [editingLeave, setEditingLeave] = useState(null)
  const [cancelPromptId, setCancelPromptId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', half_day: 'none', reason: '' })
  const [activeTab, setActiveTab] = useState('approvals')
  const [requestFilter, setRequestFilter] = useState('pending')
  const [requestPage, setRequestPage] = useState(1)
  const [requestPageSize, setRequestPageSize] = useState(10)
  const [applicableRules, setApplicableRules] = useState([])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const valid = ['approvals', 'balances', ...(isManagerPlus ? ['rules'] : [])]
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

  async function applyLeave(e) {
    e.preventDefault()
    try {
      await api.post('/api/leaves/', form)
      setForm({ leave_type: '', start_date: '', end_date: '', half_day: 'none', reason: '' })
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

  async function requestCancel(id) {
    if (!cancelReason.trim()) {
      toast.error('Please enter a reason for cancellation.')
      return
    }
    try {
      await api.post(`/api/leaves/${id}/request_cancel/`, { reason: cancelReason })
      toast.success('Cancellation requested successfully.')
      setCancelPromptId(null)
      setCancelReason('')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const filteredRows = useMemo(() => {
    let list = rows
    
    if (isManagerPlus && activeTab === 'approvals' && requestFilter !== 'all') {
      if (requestFilter === 'cancel_requested') {
        list = list.filter((r) => r.cancel_requested)
      } else {
        list = list.filter((r) => r.status === requestFilter && !r.cancel_requested)
      }
    }
    return list
  }, [isManagerPlus, requestFilter, rows, activeTab, user?.employee_id])

  const requestTotalPages = Math.max(Math.ceil(filteredRows.length / requestPageSize), 1)

  const visibleRows = useMemo(
    () => filteredRows.slice((requestPage - 1) * requestPageSize, requestPage * requestPageSize),
    [filteredRows, requestPage, requestPageSize],
  )

  const getBalance = (employeeId, leaveType) => {
    const empBalance = balances.find((b) => b.employee_id === employeeId);
    if (!empBalance) return '—';
    const b = empBalance.balances[leaveType];
    if (!b || b.remaining == null) return '—';
    return `${b.remaining} left`;
  };

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
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Management</h2>
      {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="card overflow-hidden border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 px-3 py-2">
          {[
            { id: 'approvals', label: 'Approvals' },
            ...(isManagerPlus ? [{ id: 'rules', label: 'Rules' }] : []),
            { id: 'balances', label: 'Balances' },
            ...(user?.role === 'admin' || user?.role === 'hr' ? [{ id: 'history', label: 'History' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'approvals') {
                  setRequestPage(1)
                  setRequestFilter('all')
                }
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(activeTab === 'approvals') && (
        <>
          <form onSubmit={applyLeave} className="card grid gap-3 p-4 md:grid-cols-5">
            <select required className="rounded-xl border border-slate-300 px-3 py-2" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
              <option value="">Select leave type...</option>
              {applicableRules.map((r) => (
                <option key={r.id} value={r.code}>{r.name}</option>
              ))}
            </select>
            <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={form.start_date} min={new Date(new Date().setMonth(new Date().getMonth() - 2)).toISOString().split('T')[0]} onChange={(e) => {
              const start_date = e.target.value;
              setForm(f => ({ ...f, start_date, end_date: f.half_day !== 'none' ? start_date : (f.end_date < start_date ? start_date : f.end_date) }))
            }} required />
            <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={form.end_date} min={form.start_date} disabled={form.half_day !== 'none'} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            <select className="rounded-xl border border-slate-300 px-3 py-2" value={form.half_day} onChange={(e) => {
              const half_day = e.target.value;
              setForm(f => ({ ...f, half_day, end_date: half_day !== 'none' && f.start_date ? f.start_date : f.end_date }))
            }}>
              <option value="none">Full Day</option>
              <option value="first_half">First Half</option>
              <option value="second_half">Second Half</option>
            </select>
            <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <button className="btn-primary">Apply</button>
          </form>

          {isManagerPlus && (
            <div className="card overflow-hidden border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 px-3 py-2">
                {[
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                  { id: 'cancel_requested', label: 'Cancel Requests' },
                  { id: 'all', label: 'All' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setRequestFilter(tab.id); setRequestPage(1) }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      requestFilter === tab.id ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700/70'
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
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {visibleRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{r.employee_name}</td>
                    <td className="px-4 py-3">{r.leave_type_name || leaveLabel(r.leave_type)}</td>
                    <td className="px-4 py-3 text-xs">{r.policy_name || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-brand-700 dark:text-brand-300 font-semibold">{getBalance(r.employee, r.leave_type)}</td>
                    <td className="px-4 py-3">{dayjs(r.start_date).format('DD MMM YYYY')} to {dayjs(r.end_date).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-3">
                      {dayjs(r.end_date).diff(dayjs(r.start_date), 'day') + (r.half_day === 'first_half' || r.half_day === 'second_half' ? 0.5 : 1)}
                      {r.half_day === 'first_half' && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">(1st Half)</span>}
                      {r.half_day === 'second_half' && <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">(2nd Half)</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-normal break-words max-w-[300px]">
                      {r.reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {r.cancel_requested && (
                        <span className="block text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1 leading-tight">
                          Cancel Requested:<br />
                          <span className="font-normal text-slate-500 dark:text-slate-400">{r.cancel_reason}</span>
                        </span>
                      )}
                      {editingLeave?.id === r.id ? (
                        <select 
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                          value={editingLeave.status} 
                          onChange={e => setEditingLeave({...editingLeave, status: e.target.value})}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <span className="capitalize">{r.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isManagerPlus && r.employee !== user?.employee_id ? (
                        <div className="flex gap-2 items-center">
                          {editingLeave?.id === r.id ? (
                            <>
                              <button onClick={() => { review(r.id, editingLeave.status); setEditingLeave(null) }} className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-1 rounded-full transition-colors"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingLeave(null)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1 rounded-full transition-colors"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              {r.status === 'pending' && (
                                <>
                                  <button onClick={() => review(r.id, 'approved')} className="text-green-600 hover:text-green-700 font-medium text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">Approve</button>
                                  <button onClick={() => review(r.id, 'rejected')} className="text-red-600 hover:text-red-700 font-medium text-xs border border-red-200 bg-red-50 px-2 py-1 rounded">Reject</button>
                                </>
                              )}
                              {dayjs(r.start_date).isSameOrAfter(dayjs(), 'day') ? (
                                <button onClick={() => setEditingLeave({id: r.id, status: r.status})} className="text-slate-400 hover:text-brand-600 transition-colors p-1 ml-1" title="Edit Status">
                                  <Pencil className="w-4 h-4" />
                                </button>
                              ) : (
                                r.status !== 'pending' && <span className="text-[11px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 ml-1">Past</span>
                              )}
                            </>
                          )}
                        </div>
                      ) : r.employee === user?.employee_id ? (
                        cancelPromptId === r.id ? (
                          <div className="flex flex-col gap-1 w-40">
                            <input 
                              type="text" 
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs w-full"
                              placeholder="Reason..." 
                              value={cancelReason}
                              onChange={e => setCancelReason(e.target.value)}
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button onClick={() => void requestCancel(r.id)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded flex-1">Confirm</button>
                              <button onClick={() => { setCancelPromptId(null); setCancelReason('') }} className="text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-2 py-1 rounded">Cancel</button>
                            </div>
                          </div>
                        ) : dayjs(r.start_date).isSameOrAfter(dayjs(), 'day') && r.status !== 'rejected' && !r.cancel_requested ? (
                          <button onClick={() => setCancelPromptId(r.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Request Cancel
                          </button>
                        ) : r.cancel_requested ? (
                          <span className="text-[11px] text-slate-400 italic">Cancel Pending</span>
                        ) : <span className="text-xs text-slate-400">-</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="9">No leave requests.</td></tr>}
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
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-left text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Rules</th>
                <th className="px-4 py-3">Probation</th>
                <th className="px-4 py-3">Leave balances (used / quota)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {balances.map((b) => (
                <tr key={`${b.employee_id}-${b.year}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">{b.employee_code} - {b.employee_name}</td>
                  <td className="px-4 py-3 text-xs">{b.policy_name || '—'}</td>
                  <td className="px-4 py-3">{b.is_on_probation ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(b.balances || {}).map(([code, row]) => (
                        <span key={code}>
                          {row.name || leaveLabel(code)}: {row.used || 0}
                          {row.quota === null ? ' / Unlimited' : ` / ${row.quota || 0}`}
                          {row.carry_forward ? ` (incl. ${row.carry_forward} carry forward)` : ''}
                          {row.remaining !== null && row.remaining !== undefined ? ` (left ${row.remaining})` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {balances.length === 0 && <tr><td className="px-4 py-8 text-center text-slate-500 dark:text-slate-400" colSpan="4">No leave balance records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {(user?.role === 'admin' || user?.role === 'hr') && activeTab === 'history' && (
        <AuditLogPanel resourceType="Leave" />
      )}
    </div>
  )
}
