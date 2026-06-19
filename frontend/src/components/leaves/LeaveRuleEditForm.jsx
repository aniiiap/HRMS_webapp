import { Check, X } from 'lucide-react'
import FieldHint from './FieldHint'
import { ACCRUAL_FREQUENCY_OPTIONS, MONTH_OPTIONS } from './leaveRuleForm'

function Label({ hintKey, children }) {
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      {children}
      <FieldHint hintKey={hintKey} />
    </span>
  )
}

function SectionBar({ title }) {
  return (
    <div className="border-y border-slate-200 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100">
      {title}
    </div>
  )
}

export default function LeaveRuleEditForm({
  rule,
  form,
  setForm,
  detailTab,
  setDetailTab,
  saving,
  onSave,
  onCancel,
  isNew,
}) {
  const isLop = rule?.code === 'loss_of_pay'

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {isNew ? 'Create leave rule' : rule?.name}
        </h3>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 scrollbar-thin">
        {detailTab === 'general' && (
          <div className="space-y-3">
            <label className="block">
              <Label hintKey="name">Name</Label>
              <input className="input-field mt-1 !py-1.5 !text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="block">
              <Label hintKey="description">Description</Label>
              <textarea className="input-field mt-1 min-h-[60px] !py-1.5 !text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="block">
              <Label hintKey="short_name">Leave short name</Label>
              <input className="input-field mt-1 !py-1.5 !text-sm" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} maxLength={12} />
            </label>

            <SectionBar title="Leaves count" />
            <div className="grid gap-3 sm:grid-cols-2">
              {!isLop && (
                <label className="block">
                  <Label hintKey="annual_quota">Leaves allowed in a year</Label>
                  <input type="number" min="0" step="0.5" className="input-field mt-1 !py-1.5 !text-sm" value={form.annual_quota} onChange={(e) => setForm({ ...form, annual_quota: e.target.value })} />
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.count_weekends} onChange={(e) => setForm({ ...form, count_weekends: e.target.checked })} />
                Count weekends between leave
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.count_holidays} onChange={(e) => setForm({ ...form, count_holidays: e.target.checked })} />
                Count holidays between leave
              </label>
            </div>

            <SectionBar title="Accrual" />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.accrual_basis} onChange={(e) => setForm({ ...form, accrual_basis: e.target.checked })} />
                Creditable on accrual basis
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.present_day_basis} onChange={(e) => setForm({ ...form, present_day_basis: e.target.checked })} />
                Creditable on present day basis
              </label>
              <label className="block">
                <Label hintKey="accrual_frequency">Accrual frequency</Label>
                <select className="input-field mt-1 !py-1.5 !text-sm" value={form.accrual_frequency} onChange={(e) => setForm({ ...form, accrual_frequency: e.target.value })}>
                  {ACCRUAL_FREQUENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Label hintKey="accrual_period">Accrual period</Label>
                <select className="input-field mt-1 !py-1.5 !text-sm" value={form.accrual_period} onChange={(e) => setForm({ ...form, accrual_period: e.target.value })}>
                  <option value="start">Start</option>
                  <option value="end">End</option>
                </select>
              </label>
            </div>

            <SectionBar title="Applicability & Probation" />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.allowed_under_probation} onChange={(e) => setForm({ ...form, allowed_under_probation: e.target.checked })} />
                Allowed under probation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.allowed_under_notice} onChange={(e) => setForm({ ...form, allowed_under_notice: e.target.checked })} />
                Allowed under notice period
              </label>
              {!isLop && (
                <label className="block">
                  <Label hintKey="probation_quota">Probation quota (per year)</Label>
                  <input type="number" min="0" step="0.5" className="input-field mt-1 !py-1.5 !text-sm" value={form.probation_quota} onChange={(e) => setForm({ ...form, probation_quota: e.target.value })} />
                </label>
              )}
            </div>

            <SectionBar title="Leave encash" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.encash_enabled} onChange={(e) => setForm({ ...form, encash_enabled: e.target.checked })} />
              Leave encash enabled
            </label>

            <SectionBar title="Carry forward" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.carry_forward_enabled} onChange={(e) => setForm({ ...form, carry_forward_enabled: e.target.checked })} />
              Carry forward enabled
            </label>
          </div>
        )}

        {detailTab === 'advanced' && (
          <div className="space-y-3">
            <SectionBar title="Leaves count" />
            <div className="grid gap-3 sm:grid-cols-2">
              {!isLop && (
                <>
                  <label className="block">
                    <Label hintKey="max_per_month">Max. leaves allowed in a month</Label>
                    <input type="number" min="0" step="0.5" className="input-field mt-1 !py-1.5 !text-sm" value={form.max_per_month} onChange={(e) => setForm({ ...form, max_per_month: e.target.value })} />
                  </label>
                  <label className="block">
                    <Label hintKey="continuous_allowed">Continuous leaves allowed</Label>
                    <input type="number" min="0" className="input-field mt-1 !py-1.5 !text-sm" value={form.continuous_allowed} onChange={(e) => setForm({ ...form, continuous_allowed: e.target.value })} />
                  </label>
                </>
              )}
            </div>

            <SectionBar title="Applicability" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.negative_allowed} onChange={(e) => setForm({ ...form, negative_allowed: e.target.checked })} />
              Negative leaves allowed
            </label>

            <SectionBar title="Miscellaneous" />
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.future_dated_allowed} onChange={(e) => setForm({ ...form, future_dated_allowed: e.target.checked })} />
                Future-dated leaves allowed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">After</span>
                <input type="number" min="0" className="input-field w-20 !py-1 !text-sm" value={form.future_dated_after_days} onChange={(e) => setForm({ ...form, future_dated_after_days: e.target.value })} />
                <span className="text-slate-500">days</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.backdated_allowed} onChange={(e) => setForm({ ...form, backdated_allowed: e.target.checked })} />
                Backdated leaves allowed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Up to</span>
                <input type="number" min="0" className="input-field w-20 !py-1 !text-sm" value={form.backdated_up_to_days} onChange={(e) => setForm({ ...form, backdated_up_to_days: e.target.value })} />
                <span className="text-slate-500">days</span>
              </label>
              <label className="block">
                <Label hintKey="apply_next_year_until_month">Apply leaves for next year till</Label>
                <select className="input-field mt-1 !py-1.5 !text-sm" value={form.apply_next_year_until_month} onChange={(e) => setForm({ ...form, apply_next_year_until_month: Number(e.target.value) })}>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
        <button type="button" className="btn-secondary inline-flex items-center gap-1 !py-1.5 !text-sm" onClick={onCancel} disabled={saving}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button type="submit" className="btn-primary inline-flex items-center gap-1 !py-1.5 !text-sm" disabled={saving}>
          <Check className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

