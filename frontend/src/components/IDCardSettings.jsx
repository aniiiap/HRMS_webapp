import { useEffect, useState } from 'react'
import { Check, Droplets, FileText, IdCard, ImagePlus, Palette, Phone, ShieldCheck, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'

export default function IDCardSettings({ orgId }) {
  const [template, setTemplate] = useState(null)
  const [uploadingField, setUploadingField] = useState(null)

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get(`/api/organizations/${orgId}/id-card-template/`)
      setTemplate(data)
    } catch {
      // The endpoint creates a template when an organization has none.
    }
  }

  useEffect(() => {
    if (orgId) void fetchTemplate()
  }, [orgId])

  const handleToggle = async (field, value) => {
    try {
      await api.patch(`/api/organizations/${orgId}/id-card-template/`, { [field]: value })
      setTemplate((previous) => ({ ...previous, [field]: value }))
      toast.success('ID card settings updated')
    } catch {
      toast.error('Failed to update ID card settings')
    }
  }

  const handleFileUpload = async (event, field, label) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingField(field)
    try {
      const formData = new FormData()
      formData.append(field, file)
      await api.patch(`/api/organizations/${orgId}/id-card-template/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${label} uploaded`)
      await fetchTemplate()
    } catch {
      toast.error(`Failed to upload ${label}`)
    } finally {
      setUploadingField(null)
      event.target.value = ''
    }
  }

  const handleFileDelete = async (field, label) => {
    setUploadingField(field)
    try {
      await api.patch(`/api/organizations/${orgId}/id-card-template/`, { [field]: null })
      toast.success(`${label} removed`)
      await fetchTemplate()
    } catch {
      toast.error(`Failed to remove ${label}`)
    } finally {
      setUploadingField(null)
    }
  }

  if (!template) {
    return (
      <div className="card mt-8 animate-pulse p-6">
        <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
          <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
        </div>
      </div>
    )
  }

  const displayFields = [
    { field: 'show_blood_group', label: 'Blood group', description: 'Show an important medical detail.', icon: Droplets },
    { field: 'show_emergency_contact', label: 'Emergency contact', description: 'Show the employee’s emergency number.', icon: Phone },
    { field: 'show_dob', label: 'Date of birth', description: 'Show date of birth on the front.', icon: FileText },
  ]

  const uploadOptions = [
    { field: 'front_background_image', label: 'Front background', hint: 'Shown behind the employee details.', image: template.front_background_image },
    { field: 'back_background_image', label: 'Back background', hint: 'Shown behind terms and signature.', image: template.back_background_image },
    { field: 'authorized_signature_image', label: 'Authorized signature', hint: 'Shown above the signatory label.', image: template.authorized_signature_image },
  ]

  return (
    <section className="card mt-8 overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50 via-white to-sky-50 px-6 py-6 dark:border-slate-800 dark:from-brand-950/30 dark:via-slate-950 dark:to-slate-950">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-600/20">
            <IdCard size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ID card configuration</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Control the information and branding shown on every employee ID card.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:p-8">
        <div className="space-y-7">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-brand-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Information to display</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose which personal details are printed on the front of the card.</p>
          </div>

          <div className="space-y-3">
            {displayFields.map(({ field, label, description, icon: Icon }) => {
              const enabled = Boolean(template[field])
              return (
                <button
                  key={field}
                  type="button"
                  aria-pressed={enabled}
                  onClick={() => handleToggle(field, !enabled)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-brand-800"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Icon size={18} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
                  </span>
                  <span className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${enabled ? 'justify-end bg-brand-600' : 'justify-start bg-slate-200 dark:bg-slate-700'}`}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm">{enabled && <Check size={12} className="text-brand-600" />}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-7">
          <div>
            <div className="flex items-center gap-2">
              <ImagePlus size={18} className="text-brand-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Branding and terms</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use your company branding and provide clear card-holder instructions.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Terms &amp; conditions</label>
            <textarea
              rows={5}
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:bg-slate-900"
              value={template.terms_conditions || ''}
              onChange={(event) => setTemplate((previous) => ({ ...previous, terms_conditions: event.target.value }))}
              onBlur={(event) => handleToggle('terms_conditions', event.target.value)}
              placeholder="This card is the property of..."
            />
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">These appear on the reverse side of every employee ID card.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {uploadOptions.map(({ field, label, hint, image }) => (
              <div key={field} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/70">
                <div className="relative flex h-28 items-center justify-center bg-slate-100 dark:bg-slate-800">
                  {image ? <img src={image} alt={label} className="h-full w-full object-cover" /> : <ImagePlus size={22} className="text-slate-400" />}
                  {image && <div className="absolute inset-0 bg-slate-950/10" />}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</p>
                  <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{hint}</p>
                  <div className="mt-3 flex gap-2">
                    
                    <label className={`inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-900/70 dark:bg-brand-950/40 dark:text-brand-300 ${uploadingField === field ? 'opacity-50 cursor-wait' : ''}`}>
                      <Upload size={13} className={uploadingField === field ? 'animate-bounce' : ''} /> <span>{uploadingField === field ? 'Uploading...' : (image ? 'Replace' : 'Upload')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(event) => handleFileUpload(event, field, label)} disabled={uploadingField !== null} />
                    </label>
                    {image && (
                      <button type="button" aria-label={`Remove ${label}`} onClick={() => handleFileDelete(field, label)} disabled={uploadingField !== null} className="rounded-lg border border-rose-200 px-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed dark:border-rose-900/60 dark:hover:bg-rose-950/30">
                        {uploadingField === field ? <span className="animate-pulse">...</span> : <Trash2 size={14} />}
                      </button>
                    )}

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
