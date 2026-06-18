import dayjs from 'dayjs'
import { AlertTriangle, Info, Megaphone, X } from 'lucide-react'
import { createPortal } from 'react-dom'

const PRIORITY_STYLES = {
  critical: {
    wrap: 'border-rose-400 bg-gradient-to-r from-rose-50 to-rose-100/90 shadow-rose-200/60 dark:from-rose-950/90 dark:to-rose-900/40 dark:border-rose-700',
    badge: 'bg-rose-600 text-white',
    icon: AlertTriangle,
    label: 'Critical',
  },
  important: {
    wrap: 'border-amber-400 bg-gradient-to-r from-amber-50 to-amber-100/90 shadow-amber-200/60 dark:from-amber-950/90 dark:to-amber-900/40 dark:border-amber-700',
    badge: 'bg-amber-600 text-white',
    icon: Megaphone,
    label: 'Important',
  },
  normal: {
    wrap: 'border-brand-400 bg-gradient-to-r from-brand-50 to-teal-50 shadow-brand-200/50 dark:from-brand-950/90 dark:to-teal-950/40 dark:border-brand-700',
    badge: 'bg-brand-600 text-white',
    icon: Info,
    label: 'Announcement',
  },
}

export default function AnnouncementPopup({ announcement, onDismiss }) {
  if (!announcement?.id) return null

  const priority = announcement.priority || 'normal'
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.normal
  const Icon = style.icon

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-stone-900/35 backdrop-blur-[2px] dark:bg-black/50" aria-hidden />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          className={`w-full max-w-lg motion-safe:animate-scale-in rounded-2xl border-2 p-4 shadow-2xl sm:p-5 ${style.wrap}`}
          role="alertdialog"
          aria-labelledby="announcement-popup-title"
          aria-describedby="announcement-popup-body"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.badge}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
                    {style.label}
                  </span>
                  <h3 id="announcement-popup-title" className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {announcement.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => onDismiss?.(announcement)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <p id="announcement-popup-body" className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {announcement.message}
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                {announcement.created_by_name ? `From ${announcement.created_by_name}` : ''}
              {(announcement.publish_on || announcement.published_at)
                ? `${announcement.created_by_name ? ' · ' : ''}${dayjs(announcement.publish_on || announcement.published_at).format('MMM D, YYYY')}`
                : ''}
              </p>
              <button
                type="button"
                className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm ${style.badge} hover:opacity-90`}
                onClick={() => onDismiss?.(announcement)}
              >
                OK, got it
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
