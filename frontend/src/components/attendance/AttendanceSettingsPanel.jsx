import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'

export default function AttendanceSettingsPanel() {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backdateDays, setBackdateDays] = useState(3)

  useEffect(() => {
    async function loadOrg() {
      try {
        const { data } = await api.get('/api/organizations/')
        const list = Array.isArray(data) ? data : data.results || []
        if (list.length > 0) {
          setOrg(list[0])
          setBackdateDays(list[0].attendance_anomaly_backdate_days ?? 3)
        }
      } catch (err) {
        toast.error(messageFromError(err))
      } finally {
        setLoading(false)
      }
    }
    void loadOrg()
  }, [])

  async function save() {
    if (!org) return
    setSaving(true)
    try {
      await api.patch(`/api/organizations/${org.id}/`, {
        attendance_anomaly_backdate_days: backdateDays,
      })
      toast.success('Attendance settings updated.')
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading settings...</p>
  }

  if (!org) {
    return <p className="p-6 text-sm text-slate-500">No active organization found.</p>
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Organization Settings</h3>
        <p className="text-sm text-slate-500">Configure global attendance rules for your company.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Anomaly &amp; Approval Window</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Max backdate days for anomaly correction requests
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={backdateDays}
              onChange={(e) => setBackdateDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full max-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-950"
            />
            <p className="mt-2 text-xs text-slate-500">
              Limits how far back in the past an employee can request a correction for missing check-outs, short hours, etc. Default is 3 days.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <button 
            type="button" 
            className="btn-primary" 
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
