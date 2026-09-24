import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, messageFromError, tokenStore } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [customFields, setCustomFields] = useState([])
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: '',
    date_of_birth: '',
    address: '',
    blood_group: '',
    emergency_contact: '',
    custom_fields_data: {}
  })
  const [documents, setDocuments] = useState({
    document_aadhaar: null,
    document_pan: null,
    document_marksheets: null,
    document_additional: null,
  })

  useEffect(() => {
    // Fetch existing employee data in case Admin/HR provided a phone number during onboarding
    if (user?.employee_id) {
      api.get(`/api/employees/${user.employee_id}/`).then(res => {
        if (res.data) {
          setFormData(prev => ({
            ...prev,
            phone: res.data.phone || prev.phone,
            date_of_birth: res.data.date_of_birth || prev.date_of_birth,
            address: res.data.address || prev.address,
          }))
        }
      }).catch(err => console.error("Could not fetch profile data", err))
    }
    api.get('/api/organizations/').then(res => {
      const orgs = res.data.results || res.data;
      if (orgs && orgs.length > 0) setCustomFields(orgs[0].custom_employee_fields || []);
    }).catch(() => {});
  }, [user?.employee_id])

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setDocuments(prev => ({ ...prev, [e.target.name]: file }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const payload = new FormData()
    Object.keys(formData).forEach(k => {
      if (formData[k]) {
        if (k === 'custom_fields_data') {
          payload.append(k, JSON.stringify(formData[k]));
        } else {
          payload.append(k, formData[k]);
        }
      }
    })
    
    Object.keys(documents).forEach(k => {
      if (documents[k]) payload.append(k, documents[k])
    })

    try {
      await api.post('/api/employees/complete_profile/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Refresh user context
      const { data } = await api.get('/api/auth/me/')
      tokenStore.set(tokenStore.getAccess(), tokenStore.getRefresh(), data)
      window.location.href = '/dashboard' // Redirect directly to dashboard instead of landing page
    } catch (err) {
      setError(messageFromError(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 py-12 flex justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Complete Your Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Welcome! Before you can access your dashboard, please complete your personal profile and upload the necessary documents.
        </p>

        {error && <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

        <form onSubmit={submit} className="space-y-8">
          {/* Personal Details */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                <input required name="first_name" value={formData.first_name} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                <input required name="last_name" value={formData.last_name} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date of Birth *</label>
                <input required type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address *</label>
                <textarea required rows={3} name="address" value={formData.address} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Blood Group (Optional)</label>
                <input name="blood_group" value={formData.blood_group} onChange={handleChange} placeholder="e.g. O+" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Emergency Contact (Optional)</label>
                <input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </div>
                {customFields.filter(cf => cf.ask_from_user !== false).map((cf, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {cf.name} {cf.required && '*'}
                    </label>
                    <input
                      type="text"
                      required={cf.required}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      value={(formData.custom_fields_data || {})[cf.name] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        custom_fields_data: {
                          ...(formData.custom_fields_data || {}),
                          [cf.name]: e.target.value
                        }
                      })}
                    />
                  </div>
                ))}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Mandatory Documents</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aadhaar Card *</label>
                <input required type="file" accept=".pdf,.jpg,.jpeg,.png" name="document_aadhaar" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PAN Card *</label>
                <input required type="file" accept=".pdf,.jpg,.jpeg,.png" name="document_pan" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Educational Marksheets *</label>
                <input required type="file" accept=".pdf,.jpg,.jpeg,.png" name="document_marksheets" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300" />
              </div>
            </div>
            
            <hr className="my-6 border-slate-200 dark:border-slate-800" />
            
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Additional Documents</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Please upload any additional documents such as experience certificates, graduation diplomas, or other relevant files (Optional).</p>
            <div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" name="document_additional" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300" />
            </div>
          </div>

          
          

          <div className="mt-8 flex justify-end gap-3">

            <button type="submit" disabled={loading} className="btn-primary px-8">
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

