import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Folder, Mail, Plus, Send } from 'lucide-react'
import { api, messageFromError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

export default function GeneratedDocumentsPage() {
  const navigate = useNavigate()
  const { isPrivileged } = useAuth()
  const confirm = useConfirm()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState(null)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/letters/history/generated/')
      setGroups(res.data.groups || [])
    } catch (err) {
      toast.error('Failed to load generated documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleSendAll = async (e, group) => {
    e.preventDefault()
    e.stopPropagation()
    const confirmed = await confirm({
      title: 'Send all documents',
      message: `Send ${group.count} document${group.count === 1 ? '' : 's'} to ${group.employee_name} at ${group.recipient_email}?`,
      confirmLabel: 'Yes, Send All',
    })
    if (!confirmed) return

    setSendingId(group.employee_id)
    try {
      await api.post('/api/letters/history/send_generated_batch/', {
        employee_id: group.employee_id,
      })
      toast.success(`Documents sent to ${group.recipient_email}`)
      fetchGroups()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Document Center</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generated documents grouped by employee. Send all from a folder, or open it to send one by one.
          </p>
        </div>
        {isPrivileged && (
          <div className="flex gap-3">
            <Link
              to="/letters/issue"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
            >
              <Send size={16} />
              Issue Document
            </Link>
            <Link
              to="/letters/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
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
            onClick={() => navigate('/letters')}
            className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
          >
            My Templates
          </button>
          <button
            onClick={() => navigate('/letters?tab=history')}
            className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400"
          >
            Sent History
          </button>
          <button className="border-b-2 border-brand-500 px-1 py-4 text-sm font-medium text-brand-600 dark:text-brand-400">
            Generated Documents
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-slate-900/50">
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <Folder className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No generated documents</h3>
            <p className="mt-1 text-sm text-slate-500">Issue a document and click Generate to create a PDF for an employee.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.employee_id}
                to={`/letters/generated/${group.employee_id}`}
                className="card relative flex flex-col p-5 hover:ring-1 hover:ring-brand-200"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  <Folder size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{group.employee_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{group.employee_code}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail size={12} />
                  {group.recipient_email}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {group.count} document{group.count === 1 ? '' : 's'}
                </p>
                {group.latest_at && (
                  <p className="mt-1 text-xs text-slate-400">Latest {dayjs(group.latest_at).format('MMM D, YYYY h:mm A')}</p>
                )}
                <div className="mt-auto flex items-center justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => handleSendAll(e, group)}
                    disabled={sendingId === group.employee_id}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    <Send size={14} />
                    {sendingId === group.employee_id ? 'Sending...' : 'Send all'}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
