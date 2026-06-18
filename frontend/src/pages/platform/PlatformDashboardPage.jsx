import { useEffect, useState } from 'react'
import { Building2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api, messageFromError } from '../../api/client'

export default function PlatformDashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const { data: res } = await api.get('/api/platform/dashboard/')
        setData(res)
      } catch (err) {
        setError(messageFromError(err))
      }
    })()
  }, [])

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>
  }

  if (!data) {
    return <div className="text-sm text-slate-500">Loading platform overview…</div>
  }

  const { totals, recent_organizations } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Platform overview</h2>
        <p className="mt-1 text-sm text-slate-500">Manage all customer organizations from one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Organizations</p>
          <p className="mt-1 text-2xl font-bold">{totals.organizations}</p>
          <p className="text-xs text-emerald-600">{totals.active_organizations} active</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Employees (all tenants)</p>
          <p className="mt-1 text-2xl font-bold">{totals.employees}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">User accounts</p>
          <p className="mt-1 text-2xl font-bold">{totals.users}</p>
        </div>
        <Link to="/platform/organizations" className="card flex items-center gap-3 p-4 transition hover:border-brand-300">
          <Building2 className="text-brand-600" />
          <span className="text-sm font-semibold text-brand-700">Manage organizations →</span>
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Recent organizations</h3>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Employees</th>
              <th className="px-4 py-3">Admins</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(recent_organizations || []).map((o) => (
              <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{o.name}</td>
                <td className="px-4 py-3 capitalize">{o.plan}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} />
                    {o.employee_count}
                  </span>
                </td>
                <td className="px-4 py-3">{o.admin_count}</td>
                <td className="px-4 py-3">{o.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
