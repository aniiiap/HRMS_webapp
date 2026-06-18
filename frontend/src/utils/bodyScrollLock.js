const LOCK_KEY = '__hrcore_body_scroll_lock_count__'

function getCount() {
  if (typeof window === 'undefined') return 0
  return Number(window[LOCK_KEY] || 0)
}

export function lockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const count = getCount()
  if (count === 0) {
    document.body.dataset.hrcorePrevOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'
  }
  window[LOCK_KEY] = count + 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const count = getCount()
  if (count <= 1) {
    const prev = document.body.dataset.hrcorePrevOverflow || ''
    document.body.style.overflow = prev
    delete document.body.dataset.hrcorePrevOverflow
    window[LOCK_KEY] = 0
    return
  }
  window[LOCK_KEY] = count - 1
}
