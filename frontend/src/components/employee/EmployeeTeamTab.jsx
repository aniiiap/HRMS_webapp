import { Link } from 'react-router-dom'
import { ChevronRight, Users } from 'lucide-react'
import ProfileSectionCard, { ProfileField } from './ProfileSectionCard'
import { employeeDisplayName } from './profileUtils'

export default function EmployeeTeamTab({ employee, manager, directReports }) {
  return (
    <div className="space-y-5">
      <ProfileSectionCard title="Reporting manager">
        {manager ? (
          <Link
            to={`/employees/${manager.id}?tab=profile`}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-brand-950/20"
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{employeeDisplayName(manager)}</p>
              <p className="text-sm text-slate-500">
                {manager.designation || '—'}
                {manager.department ? ` · ${manager.department}` : ''}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </Link>
        ) : (
          <ProfileField label="Manager" value="Not assigned" />
        )}
      </ProfileSectionCard>

      <ProfileSectionCard
        title="Direct reports"
        action={
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5" />
            {directReports.length}
          </span>
        }
      >
        {directReports.length === 0 ? (
          <p className="text-sm text-slate-500">No employees report to this person.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {directReports.map((rep) => (
              <li key={rep.id}>
                <Link
                  to={`/employees/${rep.id}?tab=profile`}
                  className="flex items-center justify-between py-3 transition hover:text-brand-600"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{employeeDisplayName(rep)}</p>
                    <p className="text-xs text-slate-500">
                      {rep.employee_code}
                      {rep.designation ? ` · ${rep.designation}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ProfileSectionCard>
    </div>
  )
}
