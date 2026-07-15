import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { api, messageFromError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import EmployeeAttendanceTab from '../components/employee/EmployeeAttendanceTab'
import EmployeeDocumentsTab from '../components/employee/EmployeeDocumentsTab'
import EmployeeLeaveTab from '../components/employee/EmployeeLeaveTab'
import EmployeePersonalTab from '../components/employee/EmployeePersonalTab'
import EmployeeProfileSidebar from '../components/employee/EmployeeProfileSidebar'
import EmployeeTeamTab from '../components/employee/EmployeeTeamTab'
import EmployeeWorkTab from '../components/employee/EmployeeWorkTab'
import EmployeeWorkWeekTab from '../components/employee/EmployeeWorkWeekTab'
import { employeeDisplayName } from '../components/employee/profileUtils'
import EmployeeCompensationSection from '../components/payroll/EmployeeCompensationSection'
import SalaryStructureBuilder from '../components/payroll/SalaryStructureBuilder'

const TABS = [
  { id: 'profile', label: 'Personal' },
  { id: 'job', label: 'Work' },
  { id: 'team', label: 'Team' },
  { id: 'workweek', label: 'Work week' },
  { id: 'documents', label: 'Documents' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'payroll', label: 'Payroll' },
]

export default function EmployeeProfilePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isPrivileged } = useAuth()
  const tab = searchParams.get('tab') || 'profile'

  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState([])
  const [leaves, setLeaves] = useState([])
  const [documents, setDocuments] = useState([])
  const [payrollComponents, setPayrollComponents] = useState([])
  const [teamEmployees, setTeamEmployees] = useState([])
  const [shiftTemplate, setShiftTemplate] = useState(null)
  const [leaveBalance, setLeaveBalance] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const canEditPayroll = isPrivileged
  const canEditProfile = isPrivileged && employee?.role !== 'admin'
  const canUploadDocs = isPrivileged || (user?.email === employee?.email)

  const handleDocUpload = async (file) => {
    try {
      const formData = new FormData()
      formData.append('employee', id)
      formData.append('title', file.name)
      formData.append('upload', file)
      await api.post('/api/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Document uploaded successfully.')
      // Refresh documents
      const { data } = await api.get('/api/documents/', { params: { employee: id } })
      setDocuments(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      toast.error('Failed to upload document.')
    }
  }

  const handleDocDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return
    try {
      await api.delete(`/api/documents/${docId}/`)
      toast.success('Document deleted successfully.')
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err) {
      toast.error('Failed to delete document.')
    }
  }

  const loadEmployee = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/employees/${id}/`)
      setEmployee(data)
      setEditForm({
        department: data.department || '',
        designation: data.designation || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        date_of_joining: data.date_of_joining || '',
        address: data.address || '',
      })
    } catch (err) {
      toast.error(messageFromError(err))
      navigate('/employees')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  const loadTabData = useCallback(async () => {
    if (!id) return

    if (tab === 'attendance') {
      const { data } = await api.get('/api/attendance/', { params: { employee: id } })
      setAttendance(Array.isArray(data) ? data : data.results || [])
    }

    if (tab === 'leave') {
      const [leaveRes, balanceRes] = await Promise.all([
        api.get('/api/leaves/', { params: { employee: id } }),
        api.get('/api/leaves/balances/'),
      ])
      setLeaves(Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data.results || [])
      const rows = Array.isArray(balanceRes.data) ? balanceRes.data : balanceRes.data.results || []
      setLeaveBalance(rows.find((r) => String(r.employee_id) === String(id)) || null)
    }

    if (tab === 'documents') {
      const { data } = await api.get('/api/documents/', { params: { employee: id } })
      setDocuments(Array.isArray(data) ? data : data.results || [])
    }

    if (tab === 'team') {
      const { data } = await api.get('/api/employees/')
      const rows = Array.isArray(data) ? data : data.results || []
      setTeamEmployees(rows)
    }

    if ((tab === 'workweek' || tab === 'attendance') && employee?.shift_template) {
      try {
        const { data } = await api.get('/api/employees/shift-templates/')
        const templates = Array.isArray(data) ? data : data.results || []
        setShiftTemplate(templates.find((t) => t.id === employee.shift_template) || null)
      } catch {
        setShiftTemplate(null)
      }
    }

    if (tab === 'payroll' && employee?.organization) {
      const { data } = await api.get('/api/payroll/components/', { params: { organization: employee.organization } })
      setPayrollComponents(Array.isArray(data) ? data : data.results || [])
    }
  }, [id, tab, employee?.organization, employee?.shift_template])

  useEffect(() => {
    void loadEmployee()
  }, [loadEmployee])

  useEffect(() => {
    void loadTabData()
  }, [loadTabData])

  const manager = useMemo(() => {
    if (!employee?.manager || !teamEmployees.length) return null
    return teamEmployees.find((e) => e.id === employee.manager) || null
  }, [employee?.manager, teamEmployees])

  const directReports = useMemo(() => {
    if (!employee?.id) return []
    return teamEmployees.filter((e) => e.manager === employee.id)
  }, [employee?.id, teamEmployees])

  function setTab(next) {
    setSearchParams({ tab: next })
  }

  async function saveProfile() {
    if (!canEditProfile) return
    setSaving(true)
    try {
      await api.patch(`/api/employees/${id}/`, editForm)
      toast.success('Profile updated.')
      await loadEmployee()
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading || !employee) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Loading employee profile…
      </div>
    )
  }

  const fullName = employeeDisplayName(employee)

  return (
    <div className="space-y-4">
      <Link
        to="/employees"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-600 dark:text-slate-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* Kredily-style header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1e3a5f] to-slate-800 px-4 py-4 text-white md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold md:text-2xl">{fullName}</h1>
            <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs text-white/90">
              {employee.employee_code}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/70">
            {employee.designation || 'Employee'}
            {employee.department ? ` · ${employee.department}` : ''}
          </p>
        </div>

        {/* Tab navigation */}
        <div className="overflow-x-auto border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-w-max px-2 md:px-4">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative shrink-0 px-4 py-3.5 text-sm font-medium transition ${
                    active
                      ? 'text-brand-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600 dark:text-brand-300 after:dark:bg-brand-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar + content */}
        <div className="flex flex-col lg:flex-row">
          <EmployeeProfileSidebar employee={employee} />

          <div className="min-w-0 flex-1 bg-slate-50/50 p-5 dark:bg-slate-950/30 md:p-6">
            {tab === 'profile' && (
              <EmployeePersonalTab
                employee={employee}
                editForm={editForm}
                setEditForm={setEditForm}
                canEdit={canEditProfile}
                saving={saving}
                onSave={() => void saveProfile()}
              />
            )}

            {tab === 'job' && (
              <EmployeeWorkTab
                employee={employee}
                editForm={editForm}
                setEditForm={setEditForm}
                canEdit={canEditProfile}
                saving={saving}
                onSave={() => void saveProfile()}
              />
            )}

            {tab === 'team' && (
              <EmployeeTeamTab employee={employee} manager={manager} directReports={directReports} />
            )}

            {tab === 'workweek' && <EmployeeWorkWeekTab employee={employee} shiftTemplate={shiftTemplate} />}

            {tab === 'documents' && <EmployeeDocumentsTab documents={documents} canUpload={canUploadDocs} onUpload={handleDocUpload} onDelete={handleDocDelete} />}

            {tab === 'attendance' && (
              <EmployeeAttendanceTab
                attendance={attendance}
                employee={employee}
                shiftTemplate={shiftTemplate}
              />
            )}

            {tab === 'leave' && <EmployeeLeaveTab leaves={leaves} leaveBalance={leaveBalance} />}

            {tab === 'compensation' && (
              <EmployeeCompensationSection employeeId={employee.id} readOnly={!canEditPayroll} />
            )}

            {tab === 'payroll' && (
              <SalaryStructureBuilder
                employeeId={employee.id}
                components={payrollComponents}
                canEdit={canEditPayroll}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
