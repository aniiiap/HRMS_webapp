import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Mail, Send, Trash2 } from 'lucide-react'
import { api, messageFromError } from '../../api/client'
import { useConfirm } from '../../context/ConfirmContext'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

export default function GeneratedDocumentGroupPage() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState(null)

  const fetchGroup = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/letters/history/generated/')
      const found = (res.data.groups || []).find((g) => String(g.employee_id) === String(employeeId))
      setGroup(found || null)
      if (!found) {
        toast.error('No generated documents for this employee')
        navigate('/letters/generated')
      }
    } catch (err) {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroup()
  }, [employeeId])

  const viewPdf = async (id) => {
    try {
      const res = await api.get(`/api/letters/history/${id}/download/`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      toast.error('Failed to load PDF')
    }
  }

  const handleDelete = async (docId) => {
    const confirmed = await confirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? It will also be removed from the employee\'s profile.',
      confirmLabel: 'Yes, Delete',
      isDestructive: true
    })
    if (!confirmed) return

    try {
      await api.delete(`/api/letters/history/${docId}/`)
      toast.success('Document deleted successfully')
      const remaining = (group.documents || []).filter((d) => d.id !== docId)
      if (remaining.length === 0) {
        navigate('/letters/generated')
      } else {
        setGroup({ ...group, documents: remaining, count: remaining.length })
      }
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const handleSendOne = async (doc) => {
    const confirmed = await confirm({
      title: 'Send document',
      message: `Send "${doc.subject}" to ${group.employee_name} at ${group.recipient_email}?`,
      confirmLabel: 'Yes, Send',
    })
    if (!confirmed) return

    setSendingId(doc.id)
    try {
      await api.post(`/api/letters/history/${doc.id}/send_generated/`)
      toast.success(`Document sent to ${group.recipient_email}`)
      const remaining = (group.documents || []).filter((d) => d.id !== doc.id)
      if (remaining.length === 0) {
        navigate('/letters/generated')
      } else {
        setGroup({ ...group, documents: remaining, count: remaining.length })
      }
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSendingId(null)
    }
  }

  const handleSendAll = async () => {
    const confirmed = await confirm({
      title: 'Send all documents',
      message: `Send ${group.count} document${group.count === 1 ? '' : 's'} to ${group.employee_name} at ${group.recipient_email}?`,
      confirmLabel: 'Yes, Send All',
    })
    if (!confirmed) return

    setSendingId('all')
    try {
      await api.post('/api/letters/history/send_generated_batch/', {
        employee_id: group.employee_id,
      })
      toast.success(`Documents sent to ${group.recipient_email}`)
      navigate('/letters/generated')
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/letters/generated')} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {group ? group.employee_name : 'Generated Documents'}
            </h1>
            {group && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Mail size={14} />
                {group.recipient_email}
                {group.employee_code ? ` · ${group.employee_code}` : ''}
              </p>
            )}
          </div>
        </div>
        {group && (
          <button
            type="button"
            onClick={handleSendAll}
            disabled={sendingId === 'all'}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send size={16} />
            {sendingId === 'all' ? 'Sending...' : 'Send all'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-slate-900/50">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Generated</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {(group?.documents || []).map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{doc.subject}</div>
                          <div className="text-xs text-slate-500">Template: {doc.template_name || 'Custom'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {dayjs(doc.sent_at).format('MMM D, YYYY h:mm A')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => viewPdf(doc.id)}
                          className="text-brand-600 hover:text-brand-900 dark:hover:text-brand-400"
                        >
                          View PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendOne(doc)}
                          disabled={sendingId === doc.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                          <Send size={12} />
                          {sendingId === doc.id ? 'Sending...' : 'Send'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
