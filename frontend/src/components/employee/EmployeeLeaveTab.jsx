import { useState } from 'react'
import dayjs from 'dayjs'
import StatusBadge from '../ui/StatusBadge'
import ProfileSectionCard from './ProfileSectionCard'

const LEAVE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  other: 'Other leave',
  unpaid: 'Unpaid leave',
}

export default function EmployeeLeaveTab({ leaves = [], leaveBalance }) {
  const [subTab, setSubTab] = useState('balances')

  const balances = leaveBalance?.balances || {}

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/50">
          {[
            { id: 'balances', label: 'Leave balance' },
            { id: 'logs', label: 'Logs' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                subTab === t.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {leaveBalance?.policy_name && (
          <p className="text-xs text-slate-500">
            Rule: <span className="font-medium text-slate-700 dark:text-slate-300">{leaveBalance.policy_name}</span>
            {leaveBalance.is_on_probation ? ' · On probation' : ''}
          </p>
        )}
      </div>

      {subTab === 'balances' && (
        <>
          {!leaveBalance ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              No leave rule assigned. Assign one under Leaves → Rules.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(balances).map(([type, b]) => {
                if (type === 'loss_of_pay' || type === 'unpaid') return null
                const remaining = b.remaining
                return (
                  <div
                    key={type}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {b.name || LEAVE_LABELS[type] || type.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex">
                      <div className="flex-1 space-y-2 p-4 text-xs text-slate-600 dark:text-slate-400">
                        <Row label="Total quota" value={b.quota ?? '—'} />
                        <Row label="Applied" value={b.used ?? 0} />
                        <Row label="Remaining" value={remaining ?? '—'} />
                      </div>
                      <div className="flex w-24 flex-col items-center justify-center border-l border-slate-100 bg-brand-50/30 dark:border-slate-800 dark:bg-brand-950/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Balance</p>
                        <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                          {remaining != null ? Number(remaining).toFixed(remaining % 1 ? 2 : 0) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'logs' && (
        <ProfileSectionCard title="Leave requests">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700">
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">From</th>
                  <th className="px-3 py-2.5">To</th>
                  <th className="px-3 py-2.5">Days</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Applied</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-3">{l.leave_type_name || l.leave_type?.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3">{l.start_date}</td>
                    <td className="px-3 py-3">{l.end_date}</td>
                    <td className="px-3 py-3">
                      {l.start_date && l.end_date ? dayjs(l.end_date).diff(dayjs(l.start_date), 'day') + 1 : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {l.created_at ? dayjs(l.created_at).format('DD MMM YYYY') : '—'}
                    </td>
                  </tr>
                ))}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                      No leave requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ProfileSectionCard>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  )
}
