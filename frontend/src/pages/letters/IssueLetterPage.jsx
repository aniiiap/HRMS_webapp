import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { api, messageFromError } from '../../api/client'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'

export default function IssueLetterPage() {
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [templates, setTemplates] = useState([])
  const [employees, setEmployees] = useState([])
  
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [tplRes, empRes] = await Promise.all([
        api.get('/api/letters/templates/'),
        api.get('/api/employees/')
      ])
      setTemplates(tplRes.data.results || tplRes.data)
      setEmployees(empRes.data.results || empRes.data)
    } catch (err) {
      toast.error('Failed to load initial data')
    }
  }

  const handleTemplateSelect = (e) => {
    const tId = e.target.value
    setSelectedTemplate(tId)
    const t = templates.find(x => x.id === parseInt(tId))
    if (t) {
      setSubject(t.subject_template)
      setContent(t.body_html)
    }
  }

  const handleEmployeeSelect = async (e) => {
    const eId = e.target.value
    setSelectedEmployee(eId)
    if (selectedTemplate && eId) {
      // Fetch rendered HTML
      setRendering(true)
      try {
        const t = templates.find(x => x.id === parseInt(selectedTemplate))
        const { data } = await api.post('/api/letters/history/render_html/', {
          employee_id: eId,
          body_html: t.body_html
        })
        setContent(data.rendered_html)
        toast.success('Document automatically filled with employee details')
      } catch (err) {
        toast.error('Failed to render employee details')
      } finally {
        setRendering(false)
      }
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedTemplate || !selectedEmployee) return toast.error('Please select template and employee')
    setLoading(true)
    try {
      // Assuming we have an endpoint for draft
      // We'll just POST it to send endpoint with draft flag, but backend send doesn't support draft yet.
      // Wait, let's just make it send directly for now, or implement draft endpoint if we have it.
      toast.error('Draft saving coming soon!')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplate || !selectedEmployee || !content) {
      return toast.error('Please fill all required fields')
    }

    const emp = employees.find(x => x.id === parseInt(selectedEmployee))
    
    const confirmed = await confirm({
      title: 'Send Document',
      description: `Are you sure you want to send this document to ${emp.first_name} ${emp.last_name}?`,
      confirmText: 'Yes, Send Now',
      confirmColor: 'bg-brand-600'
    })
    
    if (!confirmed) return

    setLoading(true)
    try {
      await api.post('/api/letters/history/send/', {
        employee_ids: [parseInt(selectedEmployee)],
        template_id: parseInt(selectedTemplate),
        subject,
        body_html: content
      })
      toast.success('Document sent successfully!')
      navigate('/letters')
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/letters')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <PageHeader title="Issue New Document" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Template</label>
              <select className="w-full rounded-xl border border-slate-300 px-3 py-2" value={selectedTemplate} onChange={handleTemplateSelect}>
                <option value="">-- Choose Template --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Select Employee</label>
              <select 
                className="w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100" 
                value={selectedEmployee} 
                onChange={handleEmployeeSelect}
                disabled={!selectedTemplate}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <input 
                type="text" 
                className="w-full rounded-xl border border-slate-300 px-3 py-2" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="card p-6 flex flex-col gap-3">
            {/* <button onClick={handleSaveDraft} disabled={loading} className="btn-secondary flex items-center justify-center gap-2">
              <Save size={18} /> Save as Draft
            </button> */}
            <button onClick={handleSend} disabled={loading || rendering} className="btn-primary flex items-center justify-center gap-2">
              <Send size={18} /> {loading ? 'Sending...' : 'Send Document'}
            </button>
          </div>
        </div>
        
        <div className="lg:col-span-2 card p-6">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Document Editor</h3>
            <p className="text-sm text-slate-500">You can safely modify this specific document without changing the master template.</p>
          </div>
          {rendering ? (
            <div className="h-[500px] flex items-center justify-center text-slate-500">Filling variables...</div>
          ) : (
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <ReactQuill 
                theme="snow" 
                value={content} 
                onChange={setContent} 
                className="bg-white min-h-[500px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
