import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'

/** Company workspace: view your organization profile (read-only). Tenant management is on Platform dashboard. */
export default function OrganizationsPage() {
  const { isPrivileged, isPlatformAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get('/api/organizations/')
        setRows(Array.isArray(data) ? data : data.results || [])
      } catch (err) {
        setError(messageFromError(err))
      }
    })()
  }, [])

  if (isPlatformAdmin) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Platform operators manage organizations from the{' '}
        <a href="/platform/organizations" className="font-semibold text-brand-600">
          Owner dashboard → Organizations
        </a>
        .
      </div>
    )
  }

  if (!isPrivileged) {
    return (
      <div className="card p-6 text-sm text-slate-600 dark:text-slate-400">
        Only Admin and HR can view organization settings.
      </div>
    )
  }

  const org = rows[0]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your organization</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Company profile for your workspace. All employees, payroll, and HR data belong to this organization only.
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>}

      {org ? (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <Building2 className="text-brand-600" size={28} />
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{org.name}</h3>
              {org.legal_name && <p className="text-sm text-slate-500">{org.legal_name}</p>}
              <p className="mt-2 font-mono text-xs text-slate-400">Slug: {org.slug}</p>
              <div className="mt-3">
                <StatusBadge status={org.is_active ? 'approved' : 'rejected'} label={org.is_active ? 'Active' : 'Inactive'} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No organization linked"
          description="Contact your platform administrator to assign your account to a company."
        />
      )}
    </div>
  )
}
