import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Save } from 'lucide-react'

export default function LetterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isNew) {
      fetchTemplate()
    }
  }, [id])

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get(`/api/letters/templates/${id}/`)
      setName(data.name)
      setSubject(data.subject_template)
      setContent(data.body_html)
    } catch (err) {
      toast.error('Failed to load template')
      navigate('/letters')
    }
  }

  const handleSave = async () => {
    if (!name || !content) {
      toast.error('Template name and content are required')
      return
    }

    setSaving(true)
    try {
      const payload = { name, subject_template: subject, body_html: content }
      if (isNew) {
        await api.post('/api/letters/templates/', payload)
        toast.success('Template created')
      } else {
        await api.put(`/api/letters/templates/${id}/`, payload)
        toast.success('Template updated')
      }
      navigate('/letters')
    } catch (err) {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ]
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900/50">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/letters')} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isNew ? 'Create Template' : 'Edit Template'}
            </h1>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="card p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Standard Offer Letter"
                  className="block w-full rounded-lg border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Default Email Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Offer of Employment - {{company_name}}"
                  className="block w-full rounded-lg border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 rounded-md border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/20">
              <h3 className="mb-2 text-sm font-semibold text-brand-800 dark:text-brand-300">Smart Variables Cheatsheet</h3>
              <p className="mb-3 text-xs text-brand-600 dark:text-brand-400">Copy and paste these exact placeholders into your template. They will be automatically replaced with the selected employee's actual data when generating the PDF.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {['{{ employee_name }}', '{{ employee_email }}', '{{ designation }}', '{{ department }}', '{{ organization_name }}', '{{ salary }}', '{{ joining_date }}'].map(v => (
                  <code key={v} className="block rounded bg-white px-2 py-1 text-xs text-brand-700 shadow-sm dark:bg-slate-800 dark:text-brand-300 text-center font-mono cursor-default">
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              className="bg-white dark:bg-slate-900 [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:text-base [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none dark:[&_.ql-toolbar]:border-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
