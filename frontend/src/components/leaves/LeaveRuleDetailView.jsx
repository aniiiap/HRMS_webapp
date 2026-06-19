import { Pencil } from 'lucide-react'
import FieldHint from './FieldHint'
import {
  accrualFrequencyLabel,
  accrualPeriodLabel,
  countBetweenLabel,
  monthLabel,
  quotaDisplay,
  yesNo,
} from './leaveRuleForm'

function Setting({ label, hintKey, value }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs text-slate-500">
        {label}
        <FieldHint hintKey={hintKey} />
      </p>
      <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-t border-slate-100 py-2.5 first:border-t-0 dark:border-slate-800 sm:grid-cols-[118px_1fr] sm:gap-3">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function FieldRow({ label, hintKey, value, multiline }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2 dark:border-slate-800 sm:grid-cols-[118px_1fr]">
      <p className="flex items-center gap-1 text-xs text-slate-500">
        {label}
        <FieldHint hintKey={hintKey} />
      </p>
      {multiline ? (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{value}</p>
      ) : (
        <p className="text-sm font-medium text-slate-900 dark:text-white">{value || '-'}</p>
      )}
    </div>
  )
}

export default function LeaveRuleDetailView({ rule, detailTab, setDetailTab, onEdit, onAssign }) {
  const isLop = rule.code === 'loss_of_pay'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
        <button
          type="button"
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          onClick={onEdit}
          title="Edit leave rule"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="shrink-0 border-b border-slate-200 px-3 dark:border-slate-700">
        <div className="flex gap-4">
          {[
            { id: 'general', label: 'General settings' },
            { id: 'advanced', label: 'Advanced settings' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDetailTab(t.id)}
              className={`border-b-2 py-2 text-sm font-semibold transition ${
                detailTab === t.id
                  ? 'border-brand-600 text-brand-700 dark:text-brand-300'
                  : 'border-transparent text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
        {detailTab === 'general' && (
          <>
            <FieldRow label="Name" hintKey="name" value={rule.name} />
            <FieldRow label="Description" hintKey="description" value={rule.description} multiline />
            <FieldRow label="Leave short name" hintKey="short_name" value={rule.short_name || '-'} />

            <Section title="Leaves count">
              <Setting label="Leaves allowed in a year" hintKey="annual_quota" value={quotaDisplay(rule)} />
              <Setting label="Weekends between leave" hintKey="weekends_between" value={countBetweenLabel(rule.count_weekends)} />
              <Setting label="Holidays between leave" hintKey="holidays_between" value={countBetweenLabel(rule.count_holidays)} />
            </Section>

            <Section title="Accrual">
              <Setting label="Creditable on accrual basis" hintKey="accrual_basis" value={yesNo(rule.accrual_basis)} />
              <Setting label="Creditable on present day basis" hintKey="present_day_basis" value={yesNo(rule.present_day_basis)} />
              <Setting label="Accrual frequency" hintKey="accrual_frequency" value={accrualFrequencyLabel(rule.accrual_frequency)} />
              <Setting label="Accrual period" hintKey="accrual_period" value={accrualPeriodLabel(rule.accrual_period)} />
            </Section>

            <Section title="Applicability">
              <Setting label="Allowed under probation" hintKey="allowed_under_probation" value={yesNo(rule.allowed_under_probation)} />
              <Setting label="Allowed under notice period" hintKey="allowed_under_notice" value={yesNo(rule.allowed_under_notice)} />
              {!isLop && (
                <Setting label="Probation quota (per year)" hintKey="probation_quota" value={rule.probation_quota ?? '-'} />
              )}
            </Section>

            <Section title="Leave encash">
              <Setting label="Leave encash enabled" hintKey="encash_enabled" value={yesNo(rule.encash_enabled)} />
            </Section>

            <Section title="Carry forward">
              <Setting label="Carry forward enabled" hintKey="carry_forward_enabled" value={yesNo(rule.carry_forward_enabled)} />
            </Section>
          </>
        )}

        {detailTab === 'advanced' && (
          <>
            <Section title="Leaves count">
              <Setting label="Max. leaves allowed in a month" hintKey="max_per_month" value={isLop ? '-' : (rule.max_per_month ?? '-')} />
              <Setting label="Continuous leaves allowed" hintKey="continuous_allowed" value={isLop ? '-' : (rule.continuous_allowed ?? '-')} />
            </Section>

            <Section title="Applicability">
              <Setting label="Negative leaves allowed" hintKey="negative_allowed" value={yesNo(rule.negative_allowed)} />
            </Section>

            <Section title="Miscellaneous">
              <Setting label="Future-dated leaves allowed" hintKey="future_dated_allowed" value={yesNo(rule.future_dated_allowed)} />
              <Setting label="Future-dated leaves allowed after" hintKey="future_dated_after_days" value={`${rule.future_dated_after_days ?? 0} days`} />
              <Setting label="Backdated leaves allowed" hintKey="backdated_allowed" value={yesNo(rule.backdated_allowed)} />
              <Setting label="Backdated leaves allowed up to" hintKey="backdated_up_to_days" value={`${rule.backdated_up_to_days ?? 0} days`} />
              <Setting label="Apply leaves for next year till" hintKey="apply_next_year_until_month" value={monthLabel(rule.apply_next_year_until_month)} />
            </Section>
          </>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 py-2 text-xs dark:border-slate-800">
          <span className="text-slate-500">{rule.employee_count || 0} employees assigned</span>
          <button type="button" className="text-sm font-semibold text-brand-600 hover:underline" onClick={onAssign}>
            Assign to employees &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}

