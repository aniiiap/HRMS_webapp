import { Building2, Mail, Phone, User } from 'lucide-react'
import { employeeDisplayName, employeeInitials } from './profileUtils'

export default function EmployeeProfileSidebar({ employee }) {
  if (!employee) return null

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        {employee.profile_image ? (
          <img
            src={employee.profile_image}
            alt=""
            className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md dark:border-slate-800"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
            {employeeInitials(employee)}
          </div>
        )}
        <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">{employee.designation || 'Employee'}</p>
        <p className="text-sm text-slate-500">{employee.department || 'No department'}</p>
        <p className="mt-1 font-mono text-xs text-slate-400">{employee.employee_code}</p>
      </div>

      <ul className="mt-6 space-y-3 text-sm">
        {employee.organization_name && (
          <li className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{employee.organization_name}</span>
          </li>
        )}
        {employee.email && (
          <li className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="break-all">{employee.email}</span>
          </li>
        )}
        {employee.phone && (
          <li className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>{employee.phone}</span>
          </li>
        )}
        <li className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span className="capitalize">{employee.role || 'employee'}</span>
        </li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-2 lg:justify-start">
        {employee.is_active !== false ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Active
          </span>
        ) : (
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Inactive
          </span>
        )}
        {employee.onboarding_pending && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Onboarding
          </span>
        )}
      </div>

      <p className="mt-4 hidden text-xs text-slate-400 lg:block">{employeeDisplayName(employee)}</p>
    </aside>
  )
}
