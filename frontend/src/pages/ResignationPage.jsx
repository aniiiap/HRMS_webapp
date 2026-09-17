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
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('mine')

  useEffect(() => {
    loadResignations()
  }, [])

  const loadResignations = async () => {
    try {
      const { data } = await api.get('/api/employees/resignations/')
      // Filter out own resignations vs team/company resignations
      const mine = []
      const team = []
      
      // We need to identify if a resignation belongs to the logged-in user
      // But the API might not include the user ID directly if we didn't add it.
      // Wait, we can fetch /api/employees/me/ or rely on the user.id comparing to employee.user.id
      // Let's just do a rough filter if we can. Actually, the backend API for dmin/hr returns all resignations.
      // We should probably filter on the backend, or just use the frontend.
      
      const myId = user?.employee_profile_id // Assuming we have it, if not, we match by email/name
      
      data.forEach(r => {
        if (r.employee_name === (user?.first_name + ' ' + user?.last_name).trim() || r.employee_code === user?.employee_code) {
          mine.push(r)
        } else {
          team.push(r)
        }
      })
      
      setMyResignations(mine)
      setTeamResignations(team)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason || reason.replace(/<[^>]+>/g, '').trim() === '') {
      return toast.error('Please provide a reason for resignation.')
    }
    if (!intendedLastDay) {
      return toast.error('Please specify your intended last working day.')
    }

    const confirmed = await confirm({
      title: 'Submit Resignation',
      description: 'Are you sure you want to submit your resignation? This will notify your manager and HR.',
      confirmText: 'Submit Resignation',
      confirmColor: 'bg-brand-600 hover:bg-brand-700'
    })
    
    if (!confirmed) return

    setLoading(true)
    try {
      await api.post('/api/employees/resignations/', {
        reason,
        intended_last_day: intendedLastDay
      })
      toast.success('Resignation submitted successfully.')
      setReason('')
      setIntendedLastDay('')
      loadResignations()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
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
      await api.patch(`/api/employees/resignations/${id}/update_status/`, {
        status,
        reviewer_notes: ''
      })
      toast.success(`Resignation ${status} successfully.`)
      loadResignations()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const pendingResignation = myResignations.find(r => r.status === 'pending')

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Resignation & Offboarding"
        subtitle={isPrivileged ? "Manage team resignations or submit your own" : "Submit your resignation request or view previous requests"}
      />

      {isPrivileged && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'mine' ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('mine')}
          >
            My Resignation
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'team' ? 'border-brand-600 text-brand-700 dark:text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('team')}
          >
            Team Resignations ({teamResignations.filter(r => r.status === 'pending').length} pending)
          </button>
        </div>
      )}

      {activeTab === 'mine' && (
        <div className="space-y-6">
          {pendingResignation ? (
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
                <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: pendingResignation.reason }} />
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Submit Resignation</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Intended Last Working Day</label>
                  <input 
                    type="date" 
                    value={intendedLastDay}
                    onChange={(e) => setIntendedLastDay(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white dark:bg-slate-950 px-3 py-2 w-full md:w-1/3 outline-none focus:border-brand-400" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resignation Letter / Reason</label>
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <ReactQuill 
                      theme="snow" 
                      value={reason} 
                      onChange={setReason} 
                      className="min-h-[200px]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
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

          {myResignations.filter(r => r.status !== 'pending').length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Past Resignations</h2>
              <div className="space-y-4">
                {myResignations.filter(r => r.status !== 'pending').map(r => (
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
              <div key={r.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{r.employee_name} <span className="text-sm font-normal text-slate-500">({r.employee_code})</span></h3>
                    <p className="text-sm text-slate-500">Submitted: {new Date(r.submitted_at).toLocaleDateString()} | Last Day: {r.intended_last_day || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending Review</span>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${r.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      )}
                  </div>
                </div>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl mb-4">
                  <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: r.reason }} />
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
                
                {r.status !== 'pending' && r.reviewer_name && (
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
