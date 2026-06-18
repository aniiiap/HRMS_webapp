import { useState } from 'react'
import EmployeeAttendanceLogsSubTab from './EmployeeAttendanceLogsSubTab'
import EmployeeAttendanceRulesSubTab from './EmployeeAttendanceRulesSubTab'

const SUB_TABS = [
  { id: 'logs', label: 'Logs' },
  { id: 'rules', label: 'Rules' },
]

export default function EmployeeAttendanceTab({ attendance = [], employee, shiftTemplate }) {
  const [subTab, setSubTab] = useState('logs')

  return (
    <div className="space-y-3 text-xs">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-5">
          {SUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`border-b-2 pb-2 text-[11px] font-semibold transition ${
                subTab === t.id
                  ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'logs' && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Logs</h3>
          <EmployeeAttendanceLogsSubTab attendance={attendance} />
        </div>
      )}

      {subTab === 'rules' && (
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Rule list</h3>
          <EmployeeAttendanceRulesSubTab employee={employee} shiftTemplate={shiftTemplate} />
        </div>
      )}
    </div>
  )
}
