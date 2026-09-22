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
  const [loadingFile, setLoadingFile] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [fileToDelete, setFileToDelete] = useState({ orgId: null, field: null, label: '' })
  
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

  const handleFileUpload = async (e, orgId, field, label) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingFile(true)
    try {
      const formData = new FormData()
      formData.append(field, file)
      await api.patch(`/api/organizations/${orgId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`${label} updated successfully.`)
      await fetchOrgs()
    } catch (err) {
      toast.error(messageFromError(err) || `Failed to update ${label.toLowerCase()}.`)
    } finally {
      setLoadingFile(false)
    }
  }

  const confirmFileDelete = (orgId, field, label) => {
    setFileToDelete({ orgId, field, label })
    setShowConfirmDelete(true)
  }

  const handleFileDelete = async () => {
    if (!fileToDelete.orgId) return
    setShowConfirmDelete(false)
    setLoadingFile(true)
    try {
      await api.patch(`/api/organizations/${fileToDelete.orgId}/`, { [fileToDelete.field]: null })
      toast.success(`${fileToDelete.label} removed.`)
      await fetchOrgs()
    } catch (err) {
      toast.error(messageFromError(err) || `Failed to remove ${fileToDelete.label.toLowerCase()}.`)
    } finally {
      setLoadingFile(false)
      setFileToDelete({ orgId: null, field: null, label: '' })
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
            
            <div className="flex flex-col gap-6">
              {/* Logo Upload Section */}
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Logo</label>
                <label className="btn-secondary cursor-pointer justify-center">
                  <Upload size={16} />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, org.id, 'company_logo', 'Company logo')}
                    disabled={loadingFile}
                  />
                </label>
                {org.company_logo && (
                  <button
                    onClick={() => confirmFileDelete(org.id, 'company_logo', 'Company logo')}
                    disabled={loadingFile}
                    className="btn text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20 justify-center rounded-xl px-3 py-2 transition"
                  >
                    <Trash2 size={16} className="mr-1 inline" />
                    Remove Logo
                  </button>
                )}
              </div>
              
              {/* Signature Upload Section */}
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Signature</label>
                {org.signature_image && (
                  <img src={org.signature_image} alt="Signature" className="h-12 w-auto object-contain border border-slate-200 dark:border-slate-700 bg-white rounded-md mb-2 p-1" />
                )}
                <label className="btn-secondary cursor-pointer justify-center">
                  <Upload size={16} />
                  <span>Upload Signature</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, org.id, 'signature_image', 'Company signature')}
                    disabled={loadingFile}
                  />
                </label>
                {org.signature_image && (
                  <button
                    onClick={() => confirmFileDelete(org.id, 'signature_image', 'Company signature')}
                    disabled={loadingFile}
                    className="btn text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20 justify-center rounded-xl px-3 py-2 transition"
                  >
                    <Trash2 size={16} className="mr-1 inline" />
                    Remove Signature
                  </button>
                )}
              </div>

              {/* Seal Upload Section */}
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Company Seal</label>
                {org.seal_image && (
                  <img src={org.seal_image} alt="Seal" className="h-16 w-16 object-contain border border-slate-200 dark:border-slate-700 bg-white rounded-md mb-2 p-1" />
                )}
                <label className="btn-secondary cursor-pointer justify-center">
                  <Upload size={16} />
                  <span>Upload Seal</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, org.id, 'seal_image', 'Company seal')}
                    disabled={loadingFile}
                  />
                </label>
                {org.seal_image && (
                  <button
                    onClick={() => confirmFileDelete(org.id, 'seal_image', 'Company seal')}
                    disabled={loadingFile}
                    className="btn text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20 justify-center rounded-xl px-3 py-2 transition"
                  >
                    <Trash2 size={16} className="mr-1 inline" />
                    Remove Seal
                  </button>
                )}
              </div>

              {/* Letterhead Background Upload Section */}
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Letterhead Background</label>
                {org.letterhead_background && (
                  <img src={org.letterhead_background} alt="Letterhead Background" className="h-16 w-16 object-contain border border-slate-200 dark:border-slate-700 bg-white rounded-md mb-2 p-1" />
                )}
                <label className="btn-secondary cursor-pointer justify-center">
                  <Upload size={16} />
                  <span>Upload Background</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, org.id, 'letterhead_background', 'Letterhead Background')}
                    disabled={loadingFile}
                  />
                </label>
                {org.letterhead_background && (
                  <button
                    onClick={() => confirmFileDelete(org.id, 'letterhead_background', 'Letterhead Background')}
                    disabled={loadingFile}
                    className="btn text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:hover:bg-red-900/20 justify-center rounded-xl px-3 py-2 transition"
                  >
                    <Trash2 size={16} className="mr-1 inline" />
                    Remove Background
                  </button>
                )}
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
      
      {showConfirmDelete && (
        <ConfirmDialog
          title={`Remove ${fileToDelete.label}`}
          message={`Are you sure you want to remove the ${fileToDelete.label.toLowerCase()}? This action cannot be undone.`}
          confirmLabel="Remove"
          destructive={true}
          onConfirm={handleFileDelete}
          onCancel={() => {
            setShowConfirmDelete(false)
            setFileToDelete({ orgId: null, field: null, label: '' })
          }}
        />
      )}
    </div>
  )
}
