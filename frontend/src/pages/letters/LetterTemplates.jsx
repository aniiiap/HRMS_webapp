import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Send, Clock, Edit2, Trash2, Search } from 'lucide-react'
import { api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import SendLetterModal from './SendLetterModal'

export default function LetterTemplates() {
  const { user, isPrivileged } = useAuth()
  const [templates, setTemplates] = useState([])
  const [history, setHistory] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historySearch, setHistorySearch] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [activeTab, setActiveTab] = useState(isPrivileged ? 'templates' : 'history') // templates | history

  useEffect(() => {
    fetchTemplates()
    fetchHistory(1)
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/letters/templates/')
      const data = res.data
      setTemplates(Array.isArray(data) ? data : (data?.results || []))
    } catch (err) {
      toast.error('Failed to load templates')
    }
  }

  const fetchHistory = async (page = 1, search = historySearch) => {
    setLoading(true)
    try {
      const res = await api.get(`/api/letters/history/?page=${page}&search=${search}`)
      const data = res.data
      if (data.results) {
        setHistory(data.results)
        setHistoryTotalPages(Math.ceil(data.count / 10)) // PAGE_SIZE is 10
      } else {
        setHistory(Array.isArray(data) ? data : [])
        setHistoryTotalPages(1)
      }
      setHistoryPage(page)
    } catch (err) {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e) => {
    const val = e.target.value
    setHistorySearch(val)
    if (searchTimeout) clearTimeout(searchTimeout)
    setSearchTimeout(
      setTimeout(() => {
        fetchHistory(1, val)
      }, 500)
    )
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return
    try {
      await api.delete(`/api/letters/templates/${id}/`)
      toast.success('Template deleted')
      setTemplates(templates.filter(t => t.id !== id))
    } catch (err) {
      toast.error('Failed to delete template')
    }
  }

  const handleSign = async (id) => {
    try {
      await api.post(`/api/letters/history/${id}/sign/`)
      toast.success('Document signed successfully')
      fetchHistory(historyPage)
    } catch (err) {
      toast.error('Failed to sign document')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isPrivileged ? 'Document Templates' : 'My Documents'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isPrivileged ? 'Create offer letters, policies, and send them directly to employees.' : 'View and acknowledge your official documents.'}
          </p>
        </div>
        {isPrivileged && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
            >
              <Send size={16} />
              Send Letter
            </button>
            <Link
              to="/letters/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              <Plus size={16} />
              New Template
            </Link>
          </div>
        )}
      </div>

      {isPrivileged && (
        <div className="flex gap-6 border-b border-slate-200 px-6 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('templates')}
          className={`border-b-2 px-1 py-4 text-sm font-medium ${
            activeTab === 'templates'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          My Templates
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`border-b-2 px-1 py-4 text-sm font-medium ${
            activeTab === 'history'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          Sent History
        </button>
      </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-slate-900/50">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : activeTab === 'templates' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div key={tpl.id} className="card relative flex flex-col p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tpl.name}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">Subject: {tpl.subject_template || 'N/A'}</p>
                <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">Updated {dayjs(tpl.updated_at).format('MMM D, YYYY')}</span>
                  <div className="flex gap-2">
                    <Link to={`/letters/${tpl.id}`} className="text-slate-400 hover:text-brand-600">
                      <Edit2 size={16} />
                    </Link>
                    <button onClick={() => handleDelete(tpl.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No templates</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by creating a new document template.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by employee, subject, or template..."
                  value={historySearch}
                  onChange={handleSearchChange}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {isPrivileged && <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sent To</th>}
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {history.map((log) => (
                  <tr key={log.id}>
                    {isPrivileged && (
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-white">{log.employee_name}</div>
                        <div className="text-xs text-slate-500">{log.employee_email}</div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-white">{log.subject}</div>
                      <div className="text-xs text-slate-500">Template: {log.template_name || 'Custom'}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {dayjs(log.sent_at).format('MMM D, YYYY h:mm A')}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {log.status === 'sent' && <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20">Sent</span>}
                      {log.status === 'viewed' && <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50">Viewed</span>}
                      {log.status === 'signed' && (
                        <div>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20">Signed</span>
                          <div className="mt-1 text-[10px] text-slate-400">{dayjs(log.signed_at).format('MMM D, YY')}</div>
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.get(`/api/letters/history/${log.id}/download/`, { responseType: 'blob' })
                            const blob = new Blob([res.data], { type: 'application/pdf' })
                            const url = URL.createObjectURL(blob)
                            window.open(url, '_blank')
                          } catch (err) {
                            if (err.response?.status === 404) {
                              toast.error(err.response.data.error || 'This older PDF is no longer available.')
                            } else {
                              toast.error('Failed to load PDF')
                            }
                          }
                        }}
                        className="text-brand-600 hover:text-brand-900 dark:hover:text-brand-400"
                      >
                        View PDF
                      </button>
                      
                      {!isPrivileged && log.status !== 'signed' && (
                        <button
                          onClick={() => handleSign(log.id)}
                          className="rounded bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-200 dark:bg-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-900"
                        >
                          Sign
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 0 && historyTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  Page <span className="font-medium">{historyPage}</span> of <span className="font-medium">{historyTotalPages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {history.length === 0 && (
              <div className="p-12 text-center text-sm text-slate-500">No sent letters yet.</div>
            )}
          </div>
        )}
      </div>

      {showSendModal && (
        <SendLetterModal
          templates={templates}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false)
            fetchHistory(1)
            setActiveTab('history')
          }}
        />
      )}
    </div>
  )
}
