import { Plus, X } from 'lucide-react'

function ruleInitial(rule) {
  const src = rule.shortName || rule.short_name || rule.name || '?'
  return String(src).charAt(0).toUpperCase()
}

export function RuleChip({ rule, onRemove, removing, onSetPrimary }) {
  const isPrimary = !!rule.isPrimary
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1 text-[10px] font-medium ${
        isPrimary
          ? 'border-brand-500 bg-brand-100 text-brand-950 ring-1 ring-brand-400/40 dark:border-brand-600 dark:bg-brand-900/60 dark:text-brand-50'
          : 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800/60 dark:bg-brand-950/50 dark:text-brand-100'
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
        {ruleInitial(rule)}
      </span>
      <span className="max-w-[110px] truncate" title={rule.name}>
        {rule.name}
        {isPrimary && <span className="ml-0.5 text-[8px] font-bold uppercase text-brand-700 dark:text-brand-200">· active</span>}
      </span>
      {onSetPrimary && !isPrimary && (
        <button
          type="button"
          className="shrink-0 px-0.5 text-[8px] font-semibold uppercase text-brand-600 hover:underline dark:text-brand-300"
          onClick={onSetPrimary}
          title={`Set ${rule.name} as active rule`}
        >
          Set active
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-brand-700 transition hover:bg-brand-200/80 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-900"
          onClick={onRemove}
          disabled={removing}
          title={`Remove ${rule.name}`}
          aria-label={`Remove ${rule.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

export default function RuleAssignmentChips({
  employeeId,
  rules = [],
  removingKey,
  settingPrimaryKey,
  onRemove,
  onAdd,
  onSetPrimary,
  emptyLabel = 'No rules assigned',
  addTitle = 'Assign rules',
}) {
  if (!rules.length) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400">{emptyLabel}</span>
        {onAdd && (
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:hover:bg-brand-950/40"
            onClick={onAdd}
            title={addTitle}
            aria-label={addTitle}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex max-h-24 min-w-[180px] flex-wrap items-start gap-1 overflow-y-auto overscroll-contain py-0.5 pr-0.5 scrollbar-thin">
      {rules.map((rule) => {
        const ruleId = rule.ruleId ?? rule.rule
        const key = employeeId != null ? `${employeeId}-${ruleId}` : String(ruleId)
        const busy = removingKey === key || settingPrimaryKey === key
        return (
          <RuleChip
            key={key}
            rule={rule}
            removing={busy}
            onRemove={onRemove ? () => onRemove(rule) : undefined}
            onSetPrimary={onSetPrimary && !rule.isPrimary ? () => onSetPrimary(rule) : undefined}
          />
        )
      })}
      {onAdd && (
        <button
          type="button"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-300 text-brand-600 hover:bg-brand-50 dark:border-brand-700 dark:hover:bg-brand-950/40"
          onClick={onAdd}
          title="Add rule"
          aria-label="Add rule"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
