import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'
import { fmtInrFull } from '../../utils/payrollFormat'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function BonusIncentivePanel({ run, employees, onRecalculate }) {
  const [bonuses, setBonuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  
  const [form, setForm] = useState({
    employees: [],
    type: 'bonus',
    amount: '',
    reason: ''
  })
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!run) {
      setBonuses([])
      setLoading(false)
      return
    }
    setLoading(true)
    api.get('/api/payroll/bonuses/', { 
      params: { 
        period_year: run.period_year, 
        period_month: run.period_month 
      } 
    })
      .then(res => setBonuses(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => toast.error('Failed to load bonuses: ' + messageFromError(err)))
      .finally(() => setLoading(false))
  }, [run])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/api/payroll/bonuses/${deleteId}/`)
      setBonuses(bonuses.filter(b => b.id !== deleteId))
      toast.success('Deleted successfully.')
      if (onRecalculate) onRecalculate(run.id)
    } catch (err) {
      toast.error('Failed to delete: ' + messageFromError(err))
    } finally {
      setDeleteId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.employees || form.employees.length === 0) {
      toast.error('Please select at least one employee.')
      return
    }
    setSaving(true)
    try {
      const payloadBase = {
        type: form.type,
        amount: form.amount,
        reason: form.reason,
        period_year: run.period_year,
        period_month: run.period_month
      }
      
      const requests = form.employees.map(empId => 
        api.post('/api/payroll/bonuses/', { ...payloadBase, employee: empId })
      )
      
      const responses = await Promise.all(requests)
      const newBonuses = responses.map(r => r.data)
      
      setBonuses([...newBonuses, ...bonuses])
      setShowForm(false)
      setForm({ employees: [], type: 'bonus', amount: '', reason: '' })
      toast.success(`Successfully added for ${newBonuses.length} employee(s).`)
      if (onRecalculate) onRecalculate(run.id)
    } catch (err) {
      toast.error('Failed to add some or all: ' + messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  if (!run) {
    return <div className="p-8 text-center text-slate-500">Select a pay run to manage bonuses.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Bonuses & Incentives</h3>
          <p className="text-sm text-slate-500">Manage one-time payments for {run.period_year}-{String(run.period_month).padStart(2, '0')}. (Taxable, included in gross)</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add New
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Employees *</label>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                <label className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    checked={form.employees.length === employees?.length && employees?.length > 0}
                    onChange={(e) => setForm({ ...form, employees: e.target.checked ? employees.map(emp => emp.id) : [] })}
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select All</span>
                </label>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                {employees?.map(emp => (
                  <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                      checked={form.employees.includes(emp.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm(prev => ({
                          ...prev,
                          employees: checked 
                            ? [...prev.employees, emp.id]
                            : prev.employees.filter(id => id !== emp.id)
                        }))
                      }}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{emp.first_name} {emp.last_name} <span className="text-slate-500">({emp.employee_code})</span></span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select 
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" 
                  value={form.type} 
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="bonus">Bonus</option>
                  <option value="incentive">Incentive</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                <input 
                  required 
                  type="number" 
                  min="0" 
                  step="0.01"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason / Details</label>
              <input 
                type="text" 
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" 
                value={form.reason} 
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Diwali Bonus"
              />
            </div>
          </div>
        </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save & Recalculate'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading...</td></tr>
            ) : bonuses.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No bonuses or incentives added for this period.</td></tr>
            ) : (
              bonuses.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {b.employee_name} <span className="text-xs text-slate-500">({b.employee_code})</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{b.type}</td>
                  <td className="px-4 py-3 font-medium">{fmtInrFull(b.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{b.reason || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteId(b.id)} className="text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <ConfirmDialog
          title="Delete Bonus/Incentive"
          message="Are you sure you want to delete this payment? It will be removed from the employee's payroll and recalculation will happen automatically."
          confirmLabel="Delete"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
