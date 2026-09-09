import { useEffect, useState } from 'react'
import { Building2, Upload, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/ui/EmptyState'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmDialog from '../components/ui/ConfirmDialog'

export default function OrganizationsPage() {
  const { isPrivileged, isPlatformAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loadingLogo, setLoadingLogo] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [orgToDeleteLogo, setOrgToDeleteLogo] = useState(null)
  
  const [backdateLimit, setBackdateLimit] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)

  const fetchOrgs = async () => {
    try {
      const { data } = await api.get('/api/organizations/')
      const results = Array.isArray(data) ? data : data.results || []
      setRows(results)
      if (results.length > 0) {
        setBackdateLimit(results[0].expense_backdate_limit_days === null ? '' : String(results[0].expense_backdate_limit_days))
      }
    } catch (err) {
      setError(messageFromError(err))
    }
  }

  useEffect(() => {
    void fetchOrgs()
  }, [])

  const handleSaveBackdateLimit = async (orgId) => {
    setSavingLimit(true)
    try {
      const val = backdateLimit.trim() === '' ? null : parseInt(backdateLimit, 10)
      if (val !== null && val < 0) {
        toast.error('Limit must be a positive number or empty.')
        setSavingLimit(false)
        return
      }
      await api.patch(`/api/organizations/${orgId}/`, { expense_backdate_limit_days: val })
      toast.success('Expense settings updated.')
      await fetchOrgs()
    } catch (err) {
      toast.error(messageFromError(err) || 'Failed to update expense settings.')
    } finally {
      setSavingLimit(false)
    }
  }

  const handleLogoUpload = async (e, orgId) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('company_logo', file)
      await api.patch(`/api/organizations/${orgId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Company logo updated successfully.')
      await fetchOrgs()
    } catch (err) {
      toast.error(messageFromError(err) || 'Failed to update company logo.')
    } finally {
      setLoadingLogo(false)
    }
  }

  const confirmLogoDelete = (orgId) => {
    setOrgToDeleteLogo(orgId)
    setShowConfirmDelete(true)
  }

  const handleLogoDelete = async () => {
    if (!orgToDeleteLogo) return
    setShowConfirmDelete(false)
    setLoadingLogo(true)
    try {
      await api.patch(`/api/organizations/${orgToDeleteLogo}/`, { company_logo: null })
      toast.success('Company logo removed.')
      await fetchOrgs()
    } catch (err) {
      toast.error(messageFromError(err) || 'Failed to remove company logo.')
    } finally {
      setLoadingLogo(false)
      setOrgToDeleteLogo(null)
    }
  }

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
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {org.company_logo ? (
                  <img
                    src={org.company_logo}
                    alt={`${org.name} Logo`}
                    className="h-20 w-20 rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-white"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/50">
                    <Building2 size={32} />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{org.name}</h3>
                {org.legal_name && <p className="text-sm text-slate-500">{org.legal_name}</p>}
                <p className="mt-2 font-mono text-xs text-slate-400">Slug: {org.slug}</p>
                <div className="mt-3">
                  <StatusBadge status={org.is_active ? 'approved' : 'rejected'} label={org.is_active ? 'Active' : 'Inactive'} />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-[140px]">
              <label className="btn-secondary cursor-pointer justify-center">
                <Upload size={16} />
                <span>Upload Logo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, org.id)}
                  disabled={loadingLogo}
                />
              </label>
              {org.company_logo && (
                <button
                  onClick={() => confirmLogoDelete(org.id)}
                  disabled={loadingLogo}
                  className="btn text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20 justify-center rounded-xl px-3 py-2 transition"
                >
                  <Trash2 size={16} className="mr-1 inline" />
                  Remove Logo
                </button>
              )}
            </div>
          </div>
          
        </div>
      ) : (
        <EmptyState
          title="No organization linked"
          description="Contact your platform administrator to assign your account to a company."
        />
      )}
      
      {showConfirmDelete && (
        <ConfirmDialog
          title="Remove Company Logo"
          message="Are you sure you want to remove the company logo? This action cannot be undone."
          confirmLabel="Remove"
          destructive={true}
          onConfirm={handleLogoDelete}
          onCancel={() => {
            setShowConfirmDelete(false)
            setOrgToDeleteLogo(null)
          }}
        />
      )}
    </div>
  )
}
