import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'

const PAYMENT_MODES = [
  { value: 'neft', label: 'NEFT' },
  { value: 'imps', label: 'IMPS' },
  { value: 'rtgs', label: 'RTGS' },
]

export default function EmployeeBankDetailsSection({ employeeId, readOnly = false }) {
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState(null)
  const [form, setForm] = useState({
    account_holder_name: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    payment_mode: 'neft',
    pan: '',
  })

  const load = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    try {
      const { data } = await api.get('/api/payroll/profiles/', { params: { employee: employeeId } })
      const list = Array.isArray(data) ? data : data.results || []
      const row = list[0]
      if (row) {
        setProfileId(row.id)
        setForm({
          account_holder_name: row.account_holder_name || '',
          bank_name: row.bank_name || '',
          bank_account_number: row.bank_account_number || '',
          bank_ifsc: row.bank_ifsc || '',
          payment_mode: row.payment_mode || 'neft',
          pan: row.pan || '',
        })
      } else {
        setProfileId(null)
      }
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(e) {
    e.preventDefault()
    try {
      const payload = { employee: employeeId, ...form }
      if (profileId) {
        await api.patch(`/api/payroll/profiles/${profileId}/`, payload)
      } else {
        const { data } = await api.post('/api/payroll/profiles/', payload)
        setProfileId(data.id)
      }
      toast.success('Bank details saved.')
      await load()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading bank details…</p>

  return (
    <form onSubmit={save} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
      <h4 className="font-semibold text-slate-900 dark:text-white">Bank account (salary payout)</h4>
      <p className="mt-1 text-xs text-slate-500">
        Required for NEFT bank transfer when payroll is finalized. Account holder name should match bank records.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Account holder name
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={form.account_holder_name}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Bank name
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={form.bank_name}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Account number
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={form.bank_account_number}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
          />
        </label>
        <label className="text-sm">
          IFSC code
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase dark:border-slate-600 dark:bg-slate-900"
            value={form.bank_ifsc}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })}
          />
        </label>
        <label className="text-sm">
          Payment mode
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
            value={form.payment_mode}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          PAN (optional)
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase dark:border-slate-600 dark:bg-slate-900"
            value={form.pan}
            disabled={readOnly}
            onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
          />
        </label>
      </div>
      {!readOnly && (
        <button type="submit" className="btn-primary mt-4 !py-2 text-sm">
          Save bank details
        </button>
      )}
    </form>
  )
}
