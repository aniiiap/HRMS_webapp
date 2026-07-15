import React, { useState, useEffect } from 'react'
import { X, Send, Upload, Eye } from 'lucide-react'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

import { api } from '../../api/client'
import toast from 'react-hot-toast'

export default function SendLetterModal({ templates, onClose, onSent }) {
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState([])
  const [selectedTpl, setSelectedTpl] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const base64 = canvas.toDataURL('image/png')
        setContent(prev => prev + `<p><br></p><p style="text-align: right;"><img src="${base64}" width="150" /></p>`)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
    
    // Clear the input so the same file can be selected again
    e.target.value = ''
  }

  useEffect(() => {
    api.get('/api/employees/').then(res => setEmployees(res.data.results || res.data))
  }, [])

  useEffect(() => {
    if (selectedTpl) {
      const tpl = templates.find(t => t.id === parseInt(selectedTpl))
      if (tpl) {
        setContent(tpl.body_html)
        setSubject(tpl.subject_template)
      }
    }
  }, [selectedTpl, templates])

  const handleSend = async (e) => {
    e.preventDefault()
    if (selectedEmp.length === 0 || !content || !subject) {
      toast.error('Please fill in all required fields and select at least one employee.')
      return
    }

    setSending(true)
    try {
      const formData = new FormData()
      selectedEmp.forEach(id => formData.append('employee_ids', id))
      formData.append('subject', subject)
      formData.append('body_html', content)
      formData.append('note', note)
      if (selectedTpl) formData.append('template_id', selectedTpl)

      await api.post('/api/letters/history/send/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Letter sent successfully!')
      onSent()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send letter.')
    } finally {
      setSending(false)
    }
  }

  const handlePreview = async () => {
    if (selectedEmp.length === 0) {
      toast.error('Please select at least one employee to preview their document.')
      return
    }
    if (!content || !subject) {
      toast.error('Please provide a subject and content to preview.')
      return
    }
    
    try {
      const formData = new FormData()
      selectedEmp.forEach(id => formData.append('employee_ids', id))
      formData.append('subject', subject)
      formData.append('body_html', content)
      if (selectedTpl) formData.append('template_id', selectedTpl)

      const res = await api.post('/api/letters/history/preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      toast.error('Failed to generate preview.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Send Document to Employee</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="send-form" onSubmit={handleSend} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Employees *</label>
                <div className="h-40 overflow-y-auto rounded-lg border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 bg-white">
                  {employees.map(e => (
                    <label key={e.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmp.includes(e.id)}
                        onChange={(ev) => {
                          if (ev.target.checked) {
                            setSelectedEmp(prev => [...prev, e.id])
                          } else {
                            setSelectedEmp(prev => prev.filter(id => id !== e.id))
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-900"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {e.first_name} {e.last_name} ({e.email})
                      </span>
                    </label>
                  ))}
                  {employees.length === 0 && <div className="text-sm text-slate-500 p-2">Loading...</div>}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Select Template</label>
                <select
                  value={selectedTpl}
                  onChange={e => setSelectedTpl(e.target.value)}
                  className="block w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Start from Blank or Select --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="block w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Document Content (PDF) *</label>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                  className="bg-white dark:bg-slate-900 [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none dark:[&_.ql-toolbar]:border-slate-700"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={4}
                  placeholder="Add a personalized message to the email body..."
                  className="block w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Quick Add Signature
                  </label>
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    Upload a signature image to insert it directly into the document editor.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:text-slate-400 dark:file:bg-slate-700 dark:file:text-brand-400"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Eye size={16} />
            Preview PDF
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="send-form"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Send size={16} />
              {sending ? 'Sending...' : 'Send Letter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
