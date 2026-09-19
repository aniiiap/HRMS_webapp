import React, { useState, useEffect } from 'react'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { api, messageFromError } from '../api/client'
import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import PageHeader from '../components/ui/PageHeader'
import { Send, FileText, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ResignationPage() {
  const { user } = useAuth()
  const isPrivileged = ['admin', 'hr', 'manager'].includes(user?.role)
  
  const [reason, setReason] = useState('')
  const [intendedLastDay, setIntendedLastDay] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [myResignations, setMyResignations] = useState([])
  const [teamResignations, setTeamResignations] = useState([])
  const [orgSettings, setOrgSettings] = useState(null)
  
  const draftResignation = myResignations.find(r => r.status === 'draft')
  
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'team' : 'mine')

  const [settingsForm, setSettingsForm] = useState({
    resignation_notice_period_days: 30,
    resignation_auto_msg_enabled: false,
    resignation_auto_msg_text: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (draftResignation) {
      if (!reason) setReason(draftResignation.reason || '')
      if (!intendedLastDay) setIntendedLastDay(draftResignation.intended_last_day || '')
    }
  }, [draftResignation])

  const loadData = async () => {
    try {
      const [resigResp, orgResp] = await Promise.all([
        api.get('/api/resignations/'),
        api.get('/api/organizations/')
      ])
      
      const resigData = resigResp.data
      const mine = []
      const team = []
      
      const resignationsData = Array.isArray(resigData) ? resigData : (resigData.results || [])

      resignationsData.forEach(r => {
        if (r.employee_name === (user?.first_name + ' ' + user?.last_name).trim() || r.employee_code === user?.employee_code) {
          mine.push(r)
        } else {
          team.push(r)
        }
      })
      
      setMyResignations(mine)
      setTeamResignations(team)
      
      const orgData = Array.isArray(orgResp.data) ? orgResp.data : (orgResp.data.results || [])
      if (orgData.length > 0) {
        setOrgSettings(orgData[0])
        setSettingsForm({
          resignation_notice_period_days: orgData[0].resignation_notice_period_days ?? 30,
          resignation_auto_msg_enabled: orgData[0].resignation_auto_msg_enabled ?? false,
          resignation_auto_msg_text: orgData[0].resignation_auto_msg_text ?? ''
        })
      }
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    if (!orgSettings?.id) return
    setLoading(true)
    try {
      await api.patch(`/api/organizations/${orgSettings.id}/`, settingsForm)
      toast.success('Resignation settings updated successfully.')
      await loadData()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e, submitStatus = 'pending') => {
    e.preventDefault()
    if (!reason || reason.replace(/<[^>]+>/g, '').trim() === '') {
      return toast.error('Please provide a reason for resignation.')
    }
    if (!intendedLastDay) {
      return toast.error('Please specify your intended last working day.')
    }

    if (submitStatus === 'pending') {
      const confirmed = await confirm({
        title: 'Submit Resignation',
        description: 'Are you sure you want to submit your resignation? This will notify your manager and HR.',
        confirmText: 'Submit Resignation',
        confirmColor: 'bg-brand-600 hover:bg-brand-700'
      })
      if (!confirmed) return
    }

    setLoading(true)
    try {
      const payload = {
        reason,
        intended_last_day: intendedLastDay,
        status: submitStatus
      }
      if (draftResignation) {
        await api.patch(`/api/resignations/${draftResignation.id}/`, payload)
      } else {
        await api.post('/api/resignations/', payload)
      }
      toast.success(`Resignation ${submitStatus === 'draft' ? 'saved as draft' : 'submitted successfully'}.`)
      if (submitStatus === 'pending') {
        setReason('')
        setIntendedLastDay('')
      }
      loadData()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Resignation',
      description: 'Are you sure you want to delete this resignation request?',
      confirmText: 'Yes, Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700'
    })
    if (!confirmed) return

    try {
      await api.delete(`/api/resignations/${id}/`)
      toast.success('Resignation deleted successfully.')
      loadData()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const handleUpdateStatus = async (id, status) => {
    const confirmed = await confirm({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Resignation`,
      description: `Are you sure you want to ${status} this resignation?`,
      confirmText: `Yes, ${status}`,
      confirmColor: status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
    })
    if (!confirmed) return

    try {
      await api.patch(`/api/resignations/${id}/update_status/`, {
        status,
        reviewer_notes: ''
      })
      toast.success(`Resignation ${status} successfully.`)
      loadData()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const pendingResignation = myResignations.find(r => r.status === 'pending')

  const minNoticeDate = new Date()
  minNoticeDate.setDate(minNoticeDate.getDate() + (orgSettings?.resignation_notice_period_days || 0))
  const minDateStr = minNoticeDate.toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resignation & Offboarding"
        subtitle={isPrivileged ? "Manage team resignations or submit your own" : "Submit your resignation request or view previous requests"}
      />

      {isPrivileged && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {user?.role !== 'admin' && (
            <button
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'mine' ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setActiveTab('mine')}
            >
              My Resignation
            </button>
          )}
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'team' ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('team')}
          >
            Team Resignations ({teamResignations.filter(r => r.status === 'pending').length} pending)
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'settings' ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      )}

      {activeTab === 'settings' && isPrivileged && (
        <div className="card p-6 max-w-2xl">
          <h2 className="text-lg font-bold mb-4">Resignation Settings</h2>
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notice Period (Days)</label>
              <input
                type="number"
                min="0"
                value={settingsForm.resignation_notice_period_days}
                onChange={e => setSettingsForm({...settingsForm, resignation_notice_period_days: parseInt(e.target.value) || 0})}
                className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:border-brand-400"
              />
              <p className="text-xs text-slate-500 mt-1">Users will not be able to select a last working day earlier than this notice period.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settingsForm.resignation_auto_msg_enabled}
                  onChange={e => setSettingsForm({...settingsForm, resignation_auto_msg_enabled: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Enable Automated Resignation Message</span>
            </div>

            {settingsForm.resignation_auto_msg_enabled && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Automated Message Text</label>
                <textarea
                  value={settingsForm.resignation_auto_msg_text}
                  onChange={e => setSettingsForm({...settingsForm, resignation_auto_msg_text: e.target.value})}
                  className="w-full rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 py-2 outline-none focus:border-brand-400 h-24"
                  placeholder="e.g. Please ensure all assets are returned by your final day..."
                ></textarea>
                <p className="text-xs text-slate-500 mt-1">This message will be shown to users who apply for resignation.</p>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-6">
              <button disabled={loading} type="submit" className="btn-primary">
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'mine' && user?.role !== 'admin' && (
        <div className="space-y-6">
          {pendingResignation ? (
            <>
              {orgSettings?.resignation_auto_msg_enabled && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-amber-800 dark:text-amber-300">
                  <h3 className="font-semibold mb-1">Important Notice</h3>
                  <p className="text-sm">{orgSettings.resignation_auto_msg_text}</p>
                </div>
              )}
              <div className="card p-6 border-brand-200 bg-brand-50/50 dark:bg-brand-900/20 dark:border-brand-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-brand-100 dark:bg-brand-900/50 p-2 rounded-full text-brand-600 dark:text-brand-400">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Resignation Under Review</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">You submitted a resignation on {new Date(pendingResignation.submitted_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-semibold mb-2">Intended Last Working Day: <span className="font-normal">{pendingResignation.intended_last_day || 'Not specified'}</span></p>
                  <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: pendingResignation.reason }} />
                </div>
              </div>
            </>
          ) : (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">{draftResignation ? 'Draft Resignation' : 'Submit Resignation'}</h2>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Intended Last Working Day</label>
                  <input 
                    type="date" 
                    value={intendedLastDay}
                    min={minDateStr}
                    onChange={(e) => setIntendedLastDay(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 py-2 w-full md:w-1/3 outline-none focus:border-brand-400" 
                    required
                  />
                  {orgSettings?.resignation_notice_period_days > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      Notice period is {orgSettings.resignation_notice_period_days} days. You cannot select a date before {new Date(minDateStr).toLocaleDateString()}.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resignation Letter / Reason</label>
                  <div className="bg-white dark:bg-slate-900 quill-container">
                    <ReactQuill 
                      theme="snow" 
                      value={reason} 
                      onChange={setReason} 
                      className="h-64 mb-12"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={(e) => handleSubmit(e, 'draft')}
                    disabled={loading}
                    className="btn-secondary"
                  >
                    Save as Draft
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => handleSubmit(e, 'pending')}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Send size={18} />
                    {loading ? 'Submitting...' : 'Submit Resignation'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {myResignations.filter(r => r.status !== 'pending' && r.status !== 'draft').length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Past Resignations</h2>
              <div className="space-y-4">
                {myResignations.filter(r => r.status !== 'pending' && r.status !== 'draft').map(r => (
                  <div key={r.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        {r.status === 'accepted' ? <CheckCircle className="text-green-500" size={18} /> : <XCircle className="text-red-500" size={18} />}
                        <span className="font-semibold capitalize">{r.status}</span>
                      </div>
                      <span className="text-sm text-slate-500">{new Date(r.submitted_at).toLocaleDateString()}</span>
                    </div>
                    {r.reviewer_notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-2">
                        <span className="font-semibold">Reviewer Notes: </span>{r.reviewer_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          {teamResignations.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-slate-500">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>No team resignations found.</p>
            </div>
          ) : (
            teamResignations.map(r => (
              <div key={r.id} className="card p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{r.employee_name} <span className="text-sm font-normal text-slate-500">({r.employee_code})</span></h3>
                    <p className="text-sm text-slate-500">Submitted: {new Date(r.submitted_at).toLocaleDateString()} | Last Day: {r.intended_last_day || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending Review</span>
                      ) : r.status === 'draft' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Draft</span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      )}
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(r.id)} className="ml-2 text-red-500 hover:text-red-700 p-1" title="Delete Resignation">
                          <XCircle size={18} />
                        </button>
                      )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl mb-4">
                  <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 overflow-hidden break-words" dangerouslySetInnerHTML={{ __html: r.reason }} />
                </div>
                
                {r.status === 'pending' && (
                  <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                    <button onClick={() => handleUpdateStatus(r.id, 'rejected')} className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
                      Reject
                    </button>
                    <button onClick={() => handleUpdateStatus(r.id, 'accepted')} className="btn-primary bg-green-600 hover:bg-green-700">
                      Accept Resignation
                    </button>
                  </div>
                )}
                
                {r.status !== 'pending' && r.status !== 'draft' && r.reviewer_name && (
                  <p className="text-xs text-slate-400 text-right">Reviewed by {r.reviewer_name} on {new Date(r.reviewed_at).toLocaleDateString()}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

