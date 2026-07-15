import { FileText, Upload, Eye, Download, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { api } from '../../api/client'
import ProfileSectionCard from './ProfileSectionCard'

export default function EmployeeDocumentsTab({ documents = [], canUpload = false, onUpload, onDelete }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState(null) // tracks which doc is being previewed/downloaded/deleted

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        await onUpload(file)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /**
   * Fetch a document blob through our Django backend proxy.
   * The proxy fetches from Cloudinary server-side and returns the file
   * with correct Content-Type and Content-Disposition headers.
   */
  const fetchBlob = async (docId, action) => {
    // Use responseType: 'blob' so axios returns raw binary data
    const resp = await api.get(`/api/documents/${docId}/${action}/`, {
      responseType: 'blob',
    })
    return { blob: resp.data, headers: resp.headers }
  }

  const handlePreview = async (doc) => {
    if (busyId) return
    setBusyId(`preview-${doc.id}`)
    try {
      const { blob, headers } = await fetchBlob(doc.id, 'preview')
      const mimeType = headers['content-type'] || 'application/pdf'
      const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }))
      const win = window.open(objectUrl, '_blank')
      // Revoke after 2 min to free memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 120000)
      if (!win) {
        alert('Preview blocked. Please allow pop-ups for this site.')
      }
    } catch (err) {
      console.error('Preview error:', err)
      alert('Could not load preview. Please try Download instead.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDownload = async (doc) => {
    if (busyId) return
    setBusyId(`download-${doc.id}`)
    try {
      const { blob, headers } = await fetchBlob(doc.id, 'download')
      const mimeType = headers['content-type'] || 'application/octet-stream'
      const disposition = headers['content-disposition'] || ''
      const match = disposition.match(/filename="?([^";\n]+)"?/)
      const filename = match ? match[1].trim() : doc.title || 'document'

      const objectUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }))
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000)
    } catch (err) {
      console.error('Download error:', err)
      alert('Could not download file. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (doc) => {
    if (busyId || !onDelete) return
    setBusyId(`delete-${doc.id}`)
    try {
      await onDelete(doc.id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ProfileSectionCard title="Documents">
      {canUpload && (
        <div className="mb-4 flex justify-end">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}
      {documents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No documents uploaded.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{d.title}</p>
                  {d.document_type && (
                    <p className="text-xs capitalize text-slate-500">{d.document_type}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <button
                  type="button"
                  title="Preview"
                  disabled={!!busyId}
                  onClick={() => handlePreview(d)}
                  className="flex items-center justify-center p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye size={18} />
                </button>
                <button
                  type="button"
                  title="Download"
                  disabled={!!busyId}
                  onClick={() => handleDownload(d)}
                  className="flex items-center justify-center p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                </button>
                {canUpload && (
                  <button
                    type="button"
                    title="Delete"
                    disabled={!!busyId}
                    onClick={() => handleDelete(d)}
                    className="flex items-center justify-center p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ProfileSectionCard>
  )
}
