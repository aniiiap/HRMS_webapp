import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { LEAVE_RULE_FIELD_HINTS } from './leaveRuleFieldHints'

export default function FieldHint({ hintKey, text }) {
  const hint = text || (hintKey ? LEAVE_RULE_FIELD_HINTS[hintKey] : '')
  const btnRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const show = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const tooltipWidth = 192
    const margin = 8
    let left = rect.left + rect.width / 2
    left = Math.min(window.innerWidth - margin - tooltipWidth / 2, Math.max(margin + tooltipWidth / 2, left))
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < 80
    setPos({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left,
      placeAbove,
    })
    setVisible(true)
  }, [])

  const hide = useCallback(() => setVisible(false), [])

  if (!hint) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition hover:bg-brand-200 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900"
        aria-label={hint}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info className="h-2.5 w-2.5" strokeWidth={2.5} />
      </button>
      {visible && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[10001] w-48 rounded-lg border border-slate-700/50 bg-slate-900 px-2.5 py-2 text-[11px] font-normal leading-snug text-white shadow-xl"
          style={{
            top: pos.top,
            left: pos.left,
            transform: pos.placeAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          }}
        >
          {hint}
        </div>,
        document.body,
      )}
    </>
  )
}
