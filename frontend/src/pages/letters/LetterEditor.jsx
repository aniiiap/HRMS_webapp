import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactQuill, { Quill } from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import ImageResize from 'quill-image-resize-module-rebuild'

// Required for image resize module
window.Quill = Quill
Quill.register('modules/imageResize', ImageResize)

import { api } from '../../api/client'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'

const AVAILABLE_VARIABLES = [
  { label: 'Employee Name', value: 'employee_name' },
  { label: 'Employee Email', value: 'employee_email' },
  { label: 'Personal Email', value: 'personal_email' },
  { label: 'Employee Code', value: 'employee_code' },
  { label: 'Phone Number', value: 'phone' },
  { label: 'Home Address', value: 'address' },
  { label: 'Date of Birth', value: 'date_of_birth' },
  { label: 'Joining Date', value: 'joining_date' },
  { label: 'Designation', value: 'designation' },
  { label: 'Department', value: 'department' },
  { label: 'Salary per Month', value: 'salary_per_month' },
  { label: 'Salary per Annum', value: 'salary_per_annum' },
  { label: 'Organization Name', value: 'organization_name' },
  { label: 'Company Signature', value: 'company_signature' },
  { label: 'Company Seal', value: 'company_seal' },
  { label: 'Company Logo', value: 'company_logo' },
]

export default function LetterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const quillRef = useRef(null)

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showVarDropdownTop, setShowVarDropdownTop] = useState(false)
  const [showVarDropdownFab, setShowVarDropdownFab] = useState(false)
  const [isFabVisible, setIsFabVisible] = useState(false)
  const [fabDismissed, setFabDismissed] = useState(false)
  const [fabTop, setFabTop] = useState(20)

  useEffect(() => {
    if (!isNew) {
      fetchTemplate()
    }
  }, [id])

  const handleSelectionChange = (range, source, editor) => {
    if (range) {
      try {
        const bounds = editor.getBounds(range.index)
        if (bounds) {
          // Add ~44px to account for the top formatting toolbar's height
          setFabTop(Math.max(0, bounds.top + 44))
          if (!fabDismissed) {
            setIsFabVisible(true)
          }
        }
      } catch (e) {}
    }
  }

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

  const insertVariable = (variableValue) => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    quill.focus()
    const cursorPosition = quill.getSelection()?.index || 0
    // Insert with spaces so it looks nice in the editor
    quill.insertText(cursorPosition, `{{${variableValue}}}`)
    quill.setSelection(cursorPosition + variableValue.length + 4)
    setShowVarDropdownTop(false)
    setShowVarDropdownFab(false)
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
    imageResize: {
      parchment: Quill.import('parchment'),
      modules: ['Resize', 'DisplaySize', 'Toolbar']
    }
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

      <div className="flex-1 overflow-auto p-6 relative">
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
                  placeholder="e.g., Offer of Employment - {{organization_name}}"
                  className="block w-full rounded-lg border-slate-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="card">
            {/* Custom Smart Toolbar Header */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 p-2 flex items-center justify-between dark:bg-slate-900/95 dark:border-slate-800 rounded-t-xl">
              <span className="text-sm font-medium text-slate-500 px-2">Document Editor</span>
              <div className="relative">
                <button 
                  onClick={() => setShowVarDropdownTop(!showVarDropdownTop)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/50 transition-colors"
                >
                  <Plus size={16} /> Insert Variable
                </button>
                {showVarDropdownTop && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 max-h-64 overflow-y-auto p-1">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">Standard Fields</div>
                    {AVAILABLE_VARIABLES.map(v => (
                      <button
                        key={v.value}
                        onClick={() => insertVariable(v.value)}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg dark:text-slate-300 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
                      >
                        {v.label}
                      </button>
                    ))}
                    {/* Placeholder for custom fields loop in the future */}
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={content}
                onChange={setContent}
                onChangeSelection={handleSelectionChange}
                modules={modules}
                className="bg-white dark:bg-slate-900 [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:pb-20 [&_.ql-editor]:text-base [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none dark:[&_.ql-toolbar]:border-slate-800"
              />
              {/* Floating Action Button for Variables */}
              {isFabVisible && (
                <div 
                  className="absolute right-4 z-50 transition-all duration-200 ease-out group flex items-center gap-2"
                  style={{ top: fabTop }}
                >
                  <button
                    onClick={() => {
                      setIsFabVisible(false)
                      setFabDismissed(true)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
                    title="Hide inline variable inserter"
                  >
                    <X size={12} />
                  </button>
                  <div className="relative flex flex-col items-end">
                    {showVarDropdownFab && (
                      <div className="absolute right-full mr-2 top-0 w-56 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 max-h-64 overflow-y-auto p-1 origin-top-right">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">Standard Fields</div>
                        {AVAILABLE_VARIABLES.map(v => (
                          <button
                            key={v.value}
                            onClick={() => insertVariable(v.value)}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg dark:text-slate-300 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={() => setShowVarDropdownFab(!showVarDropdownFab)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-[0_4px_14px_0_rgba(10,179,156,0.39)] hover:bg-brand-700 hover:shadow-[0_6px_20px_rgba(10,179,156,0.23)] transition-all dark:bg-brand-500"
                      title="Insert Variable"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
