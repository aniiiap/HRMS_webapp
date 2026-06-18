import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'

function popupKey(announcement) {
  if (!announcement?.id) return ''
  return `${announcement.id}:${announcement.updated_at || announcement.published_at || ''}`
}

export default function useAnnouncementPopup(userId) {
  const [announcement, setAnnouncement] = useState(null)
  const dismissedKeysRef = useRef(new Set())
  const showingKeyRef = useRef('')

  const fetchPending = useCallback(async () => {
    if (!userId) return null
    try {
      const { data } = await api.get('/api/announcements/pending-popup/')
      const pending = data?.announcement ?? (data?.id ? data : null)
      if (!pending?.id) return null

      const key = popupKey(pending)
      if (dismissedKeysRef.current.has(key)) return null

      showingKeyRef.current = key
      setAnnouncement(pending)
      return pending
    } catch {
      return null
    }
  }, [userId])

  const dismiss = useCallback(async (item) => {
    if (!item?.id) {
      setAnnouncement(null)
      return
    }
    const key = popupKey(item)
    dismissedKeysRef.current.add(key)
    showingKeyRef.current = ''
    setAnnouncement(null)
    try {
      await api.post(`/api/announcements/${item.id}/dismiss/`)
      await fetchPending()
    } catch {
      // Already hidden locally.
    }
  }, [fetchPending])

  useEffect(() => {
    if (!userId) {
      setAnnouncement(null)
      dismissedKeysRef.current = new Set()
      showingKeyRef.current = ''
      return undefined
    }

    let active = true

    const tick = async () => {
      if (!active) return
      await fetchPending()
    }

    void tick()
    const timer = setInterval(() => void tick(), 8000)

    const onWake = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', onWake)

    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [userId, fetchPending])

  return { announcement, dismiss, refresh: fetchPending }
}
