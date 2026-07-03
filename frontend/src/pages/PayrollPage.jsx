import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'
import { api, messageFromError } from '../api/client'
import AssignStructurePanel from '../components/payroll/AssignStructurePanel'
import CreateStructurePanel from '../components/payroll/CreateStructurePanel'
import DeclarationPanel from '../components/payroll/DeclarationPanel'
import EmployeePayslipPortal from '../components/payroll/EmployeePayslipPortal'
import PayRegisterPanel from '../components/payroll/PayRegisterPanel'
import PayRunsPanel from '../components/payroll/PayRunsPanel'
import PayrollComponentsPanel from '../components/payroll/PayrollComponentsPanel'
import PayrollModuleShell from '../components/payroll/PayrollModuleShell'
import PayrollWorkflowGuide from '../components/payroll/PayrollWorkflowGuide'
import RunPayrollOverview from '../components/payroll/RunPayrollOverview'
import RunPayrollPayout from '../components/payroll/RunPayrollPayout'
import SalaryStructureBuilder from '../components/payroll/SalaryStructureBuilder'
import SetupPayrollSettingsPanel from '../components/payroll/SetupPayrollSettingsPanel'
import StatutoryConfigHistory from '../components/payroll/StatutoryConfigHistory'
import StatutoryReportsPanel from '../components/payroll/StatutoryReportsPanel'
import PageHeader from '../components/ui/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import { indiaFY } from '../utils/payrollFormat'

const tabsEmployee = [
  { id: 'portal', label: 'Payslip portal' },
  { id: 'mytax', label: 'My declaration' },
]

export default function PayrollPage() {
  const { user, isManagerPlus, isPrivileged } = useAuth()
  const confirm = useConfirm()
  const [searchParams] = useSearchParams()
  const [orgs, setOrgs] = useState([])
  const [orgId, setOrgId] = useState('')
  const [activeTab, setActiveTab] = useState('portal')
  const [payrollSection, setPayrollSection] = useState('run')
  const [payrollSubTab, setPayrollSubTab] = useState('overview')

  useEffect(() => {
    if (payrollSubTab === 'dashboard') setPayrollSubTab('overview')
  }, [payrollSubTab])
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()))
  const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1))
  const [compensations, setCompensations] = useState([])
  const [salaryEmployeeId, setSalaryEmployeeId] = useState('')
  const [error, setError] = useState('')

  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [results, setResults] = useState([])
  const [components, setComponents] = useState([])
  const [statutory, setStatutory] = useState(null)
  const [employees, setEmployees] = useState([])

  const [newRun, setNewRun] = useState({ 
    year: String(new Date().getFullYear()), 
    month: String(new Date().getMonth() + 1), 
    working_days: String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) 
  })

  useEffect(() => {
    const year = Number(periodYear)
    const month = Number(periodMonth)
    if (!year || !month) return
    const daysInMonth = new Date(year, month, 0).getDate()
    setNewRun((prev) => ({ ...prev, working_days: String(daysInMonth) }))
  }, [periodYear, periodMonth])
  const [summaryBusy, setSummaryBusy] = useState(false)
  const [compForm, setCompForm] = useState({
    code: '',
    name: '',
    category: 'recurring',
    kind: 'earning',
    taxable: true,
    pf_wage_part: false,
    esi_wage_part: true,
    prorate_with_attendance: true,
  })

  const [taxRows, setTaxRows] = useState([])
  const [myTax, setMyTax] = useState({
    financial_year: indiaFY(),
    tax_regime: 'new',
    section_80c: '',
    section_80d: '',
    other_chapter_vi_a: '',
  })

  const [payslips, setPayslips] = useState([])
  const [readiness, setReadiness] = useState(null)
  const [markPaidBusy, setMarkPaidBusy] = useState(false)
  useEffect(() => {
    const tab = searchParams.get('tab')
    const validEmployee = ['portal', 'mytax', 'payslips']
    if (tab && validEmployee.includes(tab)) {
      setActiveTab(tab === 'payslips' ? 'portal' : tab)
    } else if (!isManagerPlus && !isPrivileged) {
      setActiveTab('portal')
    }
  }, [isManagerPlus, isPrivileged, searchParams])

  const loadOrgs = useCallback(async () => {
    // Employees should not call organizations listing (403 for non-admin users).
    if (!isManagerPlus && !isPrivileged) {
      setOrgs([])
      setOrgId(user?.organization_id ? String(user.organization_id) : '')
      return
    }
    try {
      const { data } = await api.get('/api/organizations/')
      const list = Array.isArray(data) ? data : data.results || []
      setOrgs(list)
      setOrgId((prev) => {
        if (prev) return prev
        if (!list.length) return ''
        const mine = user?.organization_id && list.find((o) => String(o.id) === String(user.organization_id))
        return String((mine || list[0]).id)
      })
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [isManagerPlus, isPrivileged, user?.organization_id])

  const loadRuns = useCallback(async () => {
    if (!orgId) return
    try {
      const { data } = await api.get('/api/payroll/runs/', { params: { organization: orgId } })
      setRuns(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId])

  const loadResults = useCallback(async (runId) => {
    if (!runId) {
      setResults([])
      return
    }
    try {
      const { data } = await api.get('/api/payroll/results/', { params: { run: runId } })
      setResults(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [])

  const loadComponents = useCallback(async () => {
    if (!orgId) return
    try {
      const { data } = await api.get('/api/payroll/components/', { params: { organization: orgId } })
      setComponents(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId])

  const loadStatutory = useCallback(async () => {
    if (!orgId) return
    try {
      const statRes = await api.get('/api/payroll/statutory-config/for-organization/', { params: { organization: orgId } })
      setStatutory(statRes.data)
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId])

  const loadEmployees = useCallback(async () => {
    try {
      const { data } = await api.get('/api/employees/')
      const list = Array.isArray(data) ? data : data.results || []
      if (orgId) setEmployees(list.filter((e) => String(e.organization) === String(orgId)))
      else setEmployees(list)
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId])

  const loadCompensations = useCallback(async () => {
    if (!orgId) return
    try {
      const { data } = await api.get('/api/payroll/compensation/', { params: { organization: orgId } })
      setCompensations(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId])

  const loadTax = useCallback(async () => {
    try {
      const params = {}
      if (orgId) params.employee__organization = orgId
      const { data } = await api.get('/api/payroll/tax-declarations/', { params })
      const list = Array.isArray(data) ? data : data.results || []
      setTaxRows(list)
      if (!isManagerPlus && !isPrivileged && user?.employee_id) {
        const mine = list.find((t) => String(t.employee) === String(user.employee_id))
        if (mine) {
          setMyTax({
            id: mine.id,
            financial_year: mine.financial_year,
            tax_regime: mine.tax_regime || 'new',
            section_80c: String(mine.section_80c ?? ''),
            section_80d: String(mine.section_80d ?? ''),
            other_chapter_vi_a: String(mine.other_chapter_vi_a ?? ''),
            status: mine.status,
          })
        }
      }
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [orgId, isManagerPlus, isPrivileged, user?.employee_id])

  const loadPayslips = useCallback(async () => {
    try {
      const { data } = await api.get('/api/payroll/results/')
      const list = Array.isArray(data) ? data : data.results || []
      setPayslips(list.sort((a, b) => (b.run || 0) - (a.run || 0)))
    } catch (err) {
      setError(messageFromError(err))
    }
  }, [])

  useEffect(() => {
    void loadOrgs()
  }, [loadOrgs])

  useEffect(() => {
    if (!isManagerPlus) return
    void loadRuns()
    void loadStatutory()
    void loadComponents()
    void loadEmployees()
    void loadCompensations()
  }, [orgId, isManagerPlus, loadRuns, loadStatutory, loadComponents, loadEmployees, loadCompensations])

  useEffect(() => {
    if ((payrollSection === 'statutory' && payrollSubTab === 'tax') || activeTab === 'mytax') void loadTax()
    if (activeTab === 'portal') void loadPayslips()
  }, [payrollSection, activeTab, loadTax, loadPayslips])

  useEffect(() => {
    const match = runs.find(
      (r) => String(r.period_year) === String(periodYear) && String(r.period_month) === String(periodMonth)
    )
    if (match) setSelectedRunId(String(match.id))
    else setSelectedRunId('')
  }, [runs, periodYear, periodMonth])

  useEffect(() => {
    if (selectedRunId) void loadResults(selectedRunId)
  }, [selectedRunId, loadResults])

  async function createRun(e) {
    e?.preventDefault?.()
    try {
      await api.post('/api/payroll/runs/', {
        organization: Number(orgId),
        period_year: Number(periodYear),
        period_month: Number(periodMonth),
        working_days: Number(newRun.working_days),
        notes: '',
      })
      toast.success('Payroll run created.')
      await loadRuns()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function finalizeRun(id) {
    try {
      const { data: ready } = await api.get(`/api/payroll/runs/${id}/readiness/`)
      setReadiness(ready)
      if (ready.can_finalize === false) {
        toast.error(`Cannot finalize: ${ready.blocker_count || 0} employee(s) missing salary structure.`)
        return
      }
      await api.post(`/api/payroll/runs/${id}/finalize/`)
      toast.success('Payroll finalized.')
      await loadRuns()
      await loadResults(selectedRunId)
    } catch (err) {
      const blockers = err.response?.data?.readiness?.blockers
      if (blockers?.length) setReadiness(err.response.data.readiness)
      toast.error(messageFromError(err))
    }
  }

  async function markRunPaid(id) {
    const ok = await confirm({
      title: 'Mark payroll as paid?',
      message: 'Employee payout status will be updated for this run.',
      confirmLabel: 'Mark as paid',
    })
    if (!ok) return
    setMarkPaidBusy(true)
    try {
      await api.post(`/api/payroll/runs/${id}/mark-paid/`)
      toast.success('Payroll marked as paid.')
      await loadRuns()
      await loadResults(id)
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setMarkPaidBusy(false)
    }
  }

  async function deleteRun(id) {
    const ok = await confirm({
      title: 'Delete Pay Run',
      message: 'Are you sure you want to delete this payroll run? This will delete all associated calculations.',
      destructive: true,
      confirmLabel: 'Delete Run',
    })
    if (!ok) return
    try {
      await api.delete(`/api/payroll/runs/${id}/`)
      toast.success('Run deleted.')
      if (String(selectedRunId) === String(id)) setSelectedRunId('')
      await loadRuns()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function reopenRun(id) {
    try {
      await api.post(`/api/payroll/runs/${id}/reopen/`)
      toast.success('Reopened for edits.')
      await loadRuns()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function recalcRun(id, { skipAttendance = false } = {}) {
    try {
      await api.post(`/api/payroll/runs/${id}/recalculate/`, skipAttendance ? { skip_attendance: true } : {})
      toast.success(skipAttendance ? 'Salary recalculated (paid days unchanged).' : 'Recalculated.')
      await loadResults(selectedRunId)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function refreshPaidDays(id, force = false) {
    try {
      await api.post(`/api/payroll/runs/${id}/refresh-paid-days/`, force ? { force: true } : {})
      toast.success(
        force
          ? 'Paid days reset from attendance; salary recalculated.'
          : 'Paid days and salary updated from attendance (manual overrides kept).'
      )
      await loadResults(selectedRunId)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function loadReadiness(runId) {
    if (!runId) return
    try {
      const { data } = await api.get(`/api/payroll/runs/${runId}/readiness/`)
      setReadiness(data)
    } catch {
      setReadiness(null)
    }
  }

  async function syncEmployees(id) {
    try {
      await api.post(`/api/payroll/runs/${id}/sync_employees/`)
      toast.success('Employees synced.')
      await loadResults(selectedRunId)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function updateResult(row, patch) {
    try {
      await api.patch(`/api/payroll/results/${row.id}/`, patch)
      await loadResults(selectedRunId)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function saveStatutory(e) {
    e.preventDefault()
    if (!statutory?.id) return
    try {
      const payload = { ...statutory }
      delete payload.id
      delete payload.organization
      delete payload.updated_at
      await api.patch(`/api/payroll/statutory-config/${statutory.id}/`, payload)
      toast.success('Statutory settings saved.')
      await loadStatutory()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function addComponent(e) {
    e.preventDefault()
    try {
      await api.post('/api/payroll/components/', { ...compForm, organization: Number(orgId), code: compForm.code.trim().toLowerCase().replace(/\s+/g, '_') })
      setCompForm({ ...compForm, code: '', name: '' })
      toast.success('Component created.')
      await loadComponents()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function deleteComponent(id) {
    const ok = await confirm({
      title: 'Delete component?',
      message: 'This payroll component will be removed from your organization.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await api.delete(`/api/payroll/components/${id}/`)
      await loadComponents()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function submitMyTax(e) {
    e.preventDefault()
    try {
      const empId = user?.employee_id
      if (!empId) {
        toast.error('No employee profile.')
        return
      }
      const payload = {
        employee: empId,
        financial_year: myTax.financial_year,
        tax_regime: myTax.tax_regime || 'new',
        section_80c: myTax.tax_regime === 'old' ? myTax.section_80c || '0' : '0',
        section_80d: myTax.tax_regime === 'old' ? myTax.section_80d || '0' : '0',
        other_chapter_vi_a: myTax.tax_regime === 'old' ? myTax.other_chapter_vi_a || '0' : '0',
        status: 'submitted',
      }
      if (myTax.id) {
        await api.patch(`/api/payroll/tax-declarations/${myTax.id}/`, payload)
        toast.success('Declaration updated and submitted.')
      } else {
        await api.post('/api/payroll/tax-declarations/', payload)
        toast.success('Declaration submitted.')
      }
      await loadTax()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function rejectTax(id) {
    try {
      await api.post(`/api/payroll/tax-declarations/${id}/reject/`)
      toast.success('Rejected.')
      await loadTax()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function markRunReady(id) {
    try {
      await api.post(`/api/payroll/runs/${id}/mark-ready/`)
      toast.success('Run marked ready for finalization.')
      await loadRuns()
    } catch (err) {
      const data = err.response?.data
      if (data?.readiness?.blockers?.length > 0) {
        const firstBlocker = data.readiness.blockers[0]
        toast.error(`Cannot mark ready: ${firstBlocker.employee_name} - ${firstBlocker.issues[0]}`)
      } else {
        toast.error(messageFromError(err))
      }
    }
  }

  async function downloadMonthlyHrSummary() {
    if (!orgId) {
      toast.error('Organization is required.')
      return
    }
    setSummaryBusy(true)
    try {
      const res = await api.get('/api/payroll/monthly-hr-summary/', {
        params: {
          organization: orgId,
          year: periodYear,
          month: periodMonth,
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `hr_monthly_summary_${periodYear}_${String(periodMonth).padStart(2, '0')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Monthly HR summary downloaded.')
    } catch (err) {
      toast.error(messageFromError(err))
    } finally {
      setSummaryBusy(false)
    }
  }

  async function exportReport(runId, kind) {
    try {
      const res = await api.get(`/api/payroll/runs/${runId}/export-report/`, {
        params: { kind },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `payroll_${kind}_${runId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  async function approveTax(id) {
    try {
      await api.post(`/api/payroll/tax-declarations/${id}/approve/`)
      toast.success('Approved.')
      await loadTax()
    } catch (err) {
      toast.error(messageFromError(err))
    }
  }

  const selectedRun = runs.find((r) => String(r.id) === String(selectedRunId))
  const activeOrg = orgs.find((o) => String(o.id) === String(orgId))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll"
        badge="Finance"
        action={
          isManagerPlus && orgs.length > 1 && user?.is_superuser ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-stone-500">Organization</label>
              <select
                className="input-field !w-auto min-w-[180px]"
                value={orgId}
                onChange={(e) => {
                  setOrgId(e.target.value)
                  setSelectedRunId('')
                }}
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">{error}</div>}

      {!isManagerPlus && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-warm-200/80 bg-warm-50/60 p-1.5 dark:border-stone-700 dark:bg-stone-900/50">
          {tabsEmployee.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveTab(t.id)
                window.history.replaceState(null, '', `?tab=${t.id}`)
              }}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === t.id
                  ? 'bg-white text-brand-700 shadow-soft dark:bg-stone-800 dark:text-brand-300'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {isManagerPlus && orgId && (
        <PayrollModuleShell
          section={payrollSection}
          subTab={payrollSubTab}
          onSectionChange={(sec, sub) => {
            setPayrollSection(sec)
            setPayrollSubTab(sub)
          }}
          onSubTabChange={(sub) => {
            setPayrollSubTab(sub)
            if (sub !== 'assign') setSalaryEmployeeId('')
          }}
          periodYear={periodYear}
          periodMonth={periodMonth}
          onPeriodChange={(y, m) => {
            setPeriodYear(String(y))
            setPeriodMonth(String(m))
          }}
          runStatus={selectedRun?.status}
        >
          {payrollSection === 'run' && payrollSubTab === 'overview' && (
            <div className="space-y-6">
              <PayrollWorkflowGuide />
              <RunPayrollOverview
                selectedRun={selectedRun}
                results={results}
                employees={employees}
                runs={runs}
              onCreateRun={createRun}
              onFinalize={finalizeRun}
              onMarkReady={markRunReady}
              onRecalculate={recalcRun}
              onNext={() => setPayrollSubTab('register')}
              onRefreshRuns={loadRuns}
              onNavigate={(sec, sub) => {
                setPayrollSection(sec)
                setPayrollSubTab(sub)
                if (sub !== 'assign') setSalaryEmployeeId('')
              }}
              isPrivileged={isPrivileged}
              newRun={newRun}
              setNewRun={setNewRun}
              orgId={orgId}
            />
            </div>
          )}

          {payrollSection === 'run' && payrollSubTab === 'runs' && (
            <PayRunsPanel
              runs={runs}
              orgId={orgId}
              isPrivileged={isPrivileged}
              newRun={newRun}
              setNewRun={setNewRun}
              periodYear={periodYear}
              periodMonth={periodMonth}
              onCreateRun={createRun}
              onSelectRun={(r) => {
                setPeriodYear(String(r.period_year))
                setPeriodMonth(String(r.period_month))
                setPayrollSubTab('overview')
              }}
              onRecalculate={recalcRun}
              onSyncEmployees={syncEmployees}
              onMarkReady={async (id) => {
                try {
                  await api.post(`/api/payroll/runs/${id}/mark-ready/`)
                  toast.success('Run marked ready')
                  await loadRuns()
                } catch (err) {
                  const data = err.response?.data
                  if (data?.readiness?.blockers?.length > 0) {
                    const firstBlocker = data.readiness.blockers[0]
                    toast.error(`Cannot mark ready: ${firstBlocker.employee_name} - ${firstBlocker.issues[0]}`)
                  } else {
                    toast.error(data?.error || err.message)
                  }
                }
              }}
              onFinalize={finalizeRun}
              onReopen={reopenRun}
              onDeleteRun={deleteRun}
            />
          )}

          {payrollSection === 'run' && payrollSubTab === 'register' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(selectedRun?.status === 'draft' || selectedRun?.status === 'ready') && isPrivileged && selectedRun && (
                  <>
                    <button type="button" className="btn-primary" onClick={() => void refreshPaidDays(selectedRun.id)}>
                      Calculate from attendance
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void refreshPaidDays(selectedRun.id, true)}>
                      Reset paid days (force)
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void loadReadiness(selectedRun.id)}>
                      Check readiness
                    </button>
                    {selectedRun?.status === 'draft' && (
                      <button type="button" className="btn-secondary" onClick={() => void recalcRun(selectedRun.id, { skipAttendance: true })}>
                        Recalculate salary only
                      </button>
                    )}
                  </>
                )}
              </div>
              {readiness && String(readiness.run_id) === String(selectedRunId) && (
                <div className="card border-amber-200 bg-amber-50/80 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Salary setup: {readiness.employees_with_warnings} employee(s) with warnings
                    {readiness.can_finalize === false && (
                      <span className="ml-2 text-rose-700 dark:text-rose-300">· Finalize blocked</span>
                    )}
                  </p>
                  {(readiness.blockers || []).length > 0 && (
                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-rose-800 dark:text-rose-300">
                      {readiness.blockers.map((b) => (
                        <li key={b.employee_id}>
                          {b.employee_code} — {(b.issues || []).join('; ')}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <PayRegisterPanel
                results={results}
                selectedRun={selectedRun}
                isPrivileged={isPrivileged}
                onUpdateResult={updateResult}
              />
            </div>
          )}

          {payrollSection === 'run' && payrollSubTab === 'payout' && (
            <RunPayrollPayout
              results={results}
              selectedRun={selectedRun}
              isPrivileged={isPrivileged}
              markPaidBusy={markPaidBusy}
              onExportBank={() => selectedRunId && void exportReport(selectedRunId, 'bank')}
              onMarkPaid={() => selectedRunId && void markRunPaid(selectedRunId)}
            />
          )}

          {payrollSection === 'run' && payrollSubTab === 'reports' && (
            <div className="space-y-6">
              <StatutoryReportsPanel
                selectedRun={selectedRun}
                onExport={(kind) => selectedRunId && void exportReport(selectedRunId, kind)}
              />
              <div className="card space-y-4 border border-brand-200/80 bg-brand-50/30 p-4 dark:border-brand-900/50 dark:bg-brand-950/20">
                <h3 className="font-semibold">Monthly HR summary (Excel)</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <button
                    type="button"
                    className="btn-primary !py-2"
                    disabled={summaryBusy || !orgId}
                    onClick={() => void downloadMonthlyHrSummary()}
                  >
                    {summaryBusy ? 'Preparing…' : 'Download Excel summary'}
                  </button>
                </div>
              </div>
            </div>
          )}



          {payrollSection === 'setup' && payrollSubTab === 'settings' && statutory && (
            <div className="space-y-6">
              <SetupPayrollSettingsPanel
                statutory={statutory}
                setStatutory={setStatutory}
                onSave={saveStatutory}
                isPrivileged={isPrivileged}
              />
              <StatutoryConfigHistory key={statutory.updated_at} statutoryId={statutory.id} />
            </div>
          )}

          {payrollSection === 'setup' && payrollSubTab === 'assign' && !salaryEmployeeId && (
            <AssignStructurePanel
              employees={employees}
              compensations={compensations}
              organizationId={orgId}
              organizationName={activeOrg?.name}
              onEditEmployee={(emp) => setSalaryEmployeeId(String(emp.id))}
              onAssigned={() => void loadCompensations()}
              onExport={() => toast('Export: use Run Payroll → Statutory & reports for payroll CSV exports.')}
            />
          )}

          {payrollSection === 'setup' && payrollSubTab === 'assign' && salaryEmployeeId && (
            <div className="space-y-4">
              <button
                type="button"
                className="text-sm font-semibold text-brand-600 hover:underline"
                onClick={() => setSalaryEmployeeId('')}
              >
                ← Back to assign structure
              </button>
              <SalaryStructureBuilder
                employees={employees}
                components={components}
                employeeId={salaryEmployeeId}
                organizationId={orgId}
                canEdit={isPrivileged}
              />
            </div>
          )}

          {payrollSection === 'setup' && payrollSubTab === 'create' && (
            <CreateStructurePanel
              organizationId={orgId}
              canEdit={isPrivileged}
              onCreateComponent={() => {
                setPayrollSection('setup')
                setPayrollSubTab('components')
              }}
            />
          )}

          {payrollSection === 'setup' && payrollSubTab === 'components' && (
            <PayrollComponentsPanel
              components={components}
              compForm={compForm}
              setCompForm={setCompForm}
              onSubmit={addComponent}
              onDelete={deleteComponent}
              isPrivileged={isPrivileged}
            />
          )}

          {payrollSection === 'statutory' && payrollSubTab === 'tax' && (
            <DeclarationPanel
              taxRows={taxRows}
              isPrivileged={isPrivileged}
              onApprove={approveTax}
              onReject={rejectTax}
            />
          )}

          {payrollSection === 'statutory' && payrollSubTab === 'compliance' && statutory && (
            <form onSubmit={saveStatutory} className="card grid max-w-3xl gap-3 p-4">
              <h3 className="font-semibold">TDS &amp; income tax (FY 2025-26)</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Default <strong>new regime</strong>: no TDS when taxable income is up to ₹12 lakh/year (Section 87A rebate).
                Employees below ~₹12.75L gross typically see zero income tax. Old regime uses 80C/80D from approved declarations.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">
                  Standard deduction (annual)
                  <input className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600" value={statutory.standard_deduction_annual} onChange={(e) => setStatutory({ ...statutory, standard_deduction_annual: e.target.value })} />
                </label>
                <label className="text-xs">
                  Default TDS regime
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 dark:border-slate-600" value={statutory.tds_regime} onChange={(e) => setStatutory({ ...statutory, tds_regime: e.target.value })}>
                    <option value="new">New regime (FY26 — nil tax up to ₹12L taxable)</option>
                    <option value="old">Old regime</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={statutory.include_cess_on_tds_estimate} onChange={(e) => setStatutory({ ...statutory, include_cess_on_tds_estimate: e.target.checked })} />
                  Include 4% health &amp; education cess on TDS estimate
                </label>
              </div>
              <button type="submit" className="btn-primary w-fit" disabled={!isPrivileged}>
                Save TDS settings
              </button>
            </form>
          )}
          </PayrollModuleShell>
      )}

      {isManagerPlus && !orgId && <div className="text-sm text-slate-500">Select an organization to manage payroll.</div>}

      {!isManagerPlus && activeTab === 'mytax' && (
        <DeclarationPanel
          myTax={myTax}
          setMyTax={setMyTax}
          onSubmitMyTax={submitMyTax}
          isEmployeeView
        />
      )}

      {!isManagerPlus && activeTab === 'portal' && <EmployeePayslipPortal />}
    </div>
  )
}
