import { useEffect, useState } from 'react'
import { api, messageFromError } from '../api/client'

export default function PayrollPage() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [period, setPeriod] = useState({ year: String(new Date().getFullYear()), month: String(new Date().getMonth() + 1) })

  async function load() {
    try {
      const { data } = await api.get('/api/payroll/', { params: { period_year: period.year, period_month: period.month } })
      setRows(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Payroll</h2>
        <div className="flex gap-2">
          <input className="rounded-xl border border-slate-300 px-3 py-2" value={period.year} onChange={(e) => setPeriod({ ...period, year: e.target.value })} />
          <input className="rounded-xl border border-slate-300 px-3 py-2" value={period.month} onChange={(e) => setPeriod({ ...period, month: e.target.value })} />
          <button className="btn-secondary" onClick={() => void load()}>Filter</button>
        </div>
      </div>
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Basic</th><th className="px-4 py-3">Deductions</th><th className="px-4 py-3">Tax</th><th className="px-4 py-3">Net</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-3">{r.employee_name}</td><td className="px-4 py-3">{r.period_year}-{String(r.period_month).padStart(2, '0')}</td><td className="px-4 py-3">${Number(r.basic_salary).toLocaleString()}</td><td className="px-4 py-3">${Number(r.deductions).toLocaleString()}</td><td className="px-4 py-3">${Number(r.tax).toLocaleString()}</td><td className="px-4 py-3 font-semibold">${Number(r.net_salary).toLocaleString()}</td></tr>)}{rows.length===0 && <tr><td className="px-4 py-8 text-center text-slate-500" colSpan="6">No payroll data for this period.</td></tr>}</tbody></table>
      </div>
    </div>
  )
}
