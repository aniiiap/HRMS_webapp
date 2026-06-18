import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../../api/client'

const PCT_FIELDS = [
  ['basic_pct_of_ctc', 'Basic salary (% of monthly CTC)'],
  ['da_pct_of_ctc', 'Dearness allowance / DA (% of monthly CTC)'],
  ['hra_pct_of_basic', 'HRA (% of Basic)'],
  ['variable_pay_pct_of_ctc', 'Variable pay (% of monthly CTC)'],
  ['gratuity_pct_of_basic', 'Gratuity provision (% of Basic)'],
  ['health_insurance_pct_of_ctc', 'Health insurance (% of monthly CTC)'],
]

const FIXED_FIELDS = [
  ['transport_allowance', 'Transport allowance (₹/month)'],
  ['cea_monthly', 'Children education allowance (₹/month)'],
  ['meal_allowance', 'Meal / food allowance (₹/month)'],
  ['lta_monthly', 'LTA (₹/month)'],
  ['mobile_internet', 'Mobile / internet (₹/month)'],
  ['uniform_allowance', 'Uniform allowance (₹/month)'],
  ['medical_allowance', 'Medical allowance (₹/month)'],
]

const TOGGLES = [
  ['include_transport', 'Transport'],
  ['include_cea', 'CEA'],
  ['include_meal', 'Meal'],
  ['include_lta', 'LTA'],
  ['include_mobile', 'Mobile / internet'],
  ['include_uniform', 'Uniform'],
  ['include_medical', 'Medical'],
  ['include_variable_pay', 'Variable pay'],
]

export default function PayrollCtcTemplatePanel({ organizationId, canEdit = true }) {
  const [tpl, setTpl] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const { data } = await api.get('/api/payroll/ctc-template/for-organization/', {
        params: { organization: organizationId },
      })
      setTpl(data)
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void load()
  }, [load])

  async function save(e) {
    e.preventDefault()
    if (!tpl?.id) return
    try {
      const { data } = await api.patch(`/api/payroll/ctc-template/${tpl.id}/`, tpl)
      setTpl(data)
      toast.success('CTC formulas saved.')
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading CTC formulas…</p>
  if (!tpl) return null

  return (
    <form onSubmit={save} className="card space-y-5 p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">CTC formulas (organization defaults)</h3>
        <p className="mt-1 text-sm text-slate-500">
          <strong>Formula:</strong> Monthly CTC = in-hand gross + employer costs (PF, gratuity, health). Basic & DA are % of
          CTC; HRA is % of Basic; variable is % of CTC; fixed rows use the ₹ amounts below (full amount or skipped if CTC is
          too low); Special allowance = whatever is left. Works at any salary — gross never exceeds CTC.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PCT_FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs font-medium text-slate-500">
            {label}
            <input
              className="input-field mt-1"
              value={tpl[key] ?? ''}
              disabled={!canEdit}
              onChange={(e) => setTpl({ ...tpl, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIXED_FIELDS.map(([key, label]) => (
          <label key={key} className="text-xs font-medium text-slate-500">
            {label}
            <input
              className="input-field mt-1"
              value={tpl[key] ?? ''}
              disabled={!canEdit}
              onChange={(e) => setTpl({ ...tpl, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {TOGGLES.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!tpl[key]}
              disabled={!canEdit}
              onChange={(e) => setTpl({ ...tpl, [key]: e.target.checked })}
            />
            Include {label}
          </label>
        ))}
      </div>

      {canEdit && (
        <button type="submit" className="btn-primary">
          Save CTC formulas
        </button>
      )}
    </form>
  )
}
