import axios from 'axios'

const ACCESS = 'hrms_access'
const REFRESH = 'hrms_refresh'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  getUser: () => {
    try {
      const u = localStorage.getItem('hrms_user')
      return u ? JSON.parse(u) : null
    } catch {
      return null
    }
  },
  set: (access, refresh, user) => {
    if (access) localStorage.setItem(ACCESS, access)
    if (refresh) localStorage.setItem(REFRESH, refresh)
    if (user) localStorage.setItem('hrms_user', JSON.stringify(user))
  },
  clear: () => {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
    localStorage.removeItem('hrms_user')
  },
}

const baseURL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({ baseURL })

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing = null

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {}
    if (error.response?.status === 401 && !original._retry && tokenStore.getRefresh()) {
      original._retry = true
      if (!refreshing) {
        refreshing = axios
          .post(`${baseURL}/api/auth/refresh/`, { refresh: tokenStore.getRefresh() })
          .then((res) => {
            tokenStore.set(res.data.access, res.data.refresh)
            return res.data.access
          })
          .catch((err) => {
            if (err.response?.status === 401 || err.response?.status === 403) {
              tokenStore.clear()
              window.location.href = '/'
            }
            throw err
          })
          .finally(() => {
            refreshing = null
          })
      }
      const next = await refreshing
      if (next) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${next}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

export function messageFromError(err) {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const d = err.response?.data

    // If server returned HTML (like a Django 500 error page or proxy error)
    if (typeof d === 'string') {
      const trimmed = d.trim()
      if (trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html')) {
        if (status === 500) return 'A server error occurred. Please try again or contact support.'
        if (status === 502 || status === 503 || status === 504) return 'Server is temporarily unavailable. Please try again shortly.'
        return `Request failed with status ${status || 'unknown'}.`
      }
      return trimmed || 'Something went wrong.'
    }

    if (d && typeof d === 'object') {
      if (d.error && typeof d.error === 'string') return d.error
      if (d.detail && typeof d.detail === 'string') return d.detail
      if (d.message && typeof d.message === 'string') return d.message

      // Handle non_field_errors specifically
      if (Array.isArray(d.non_field_errors) && d.non_field_errors.length) {
        return String(d.non_field_errors[0])
      }

      if (Array.isArray(d) && d.length) {
        return typeof d[0] === 'string' ? d[0] : (d[0]?.error || d[0]?.detail || JSON.stringify(d[0]))
      }

      const parts = []
      for (const [key, val] of Object.entries(d)) {
        if (key === 'detail' || key === 'error') continue
        if (Array.isArray(val) && val.length) {
          const first = typeof val[0] === 'string' ? val[0] : (val[0]?.error || val[0]?.detail || JSON.stringify(val[0]))
          // If message is self-explanatory, don't prepend ugly technical field name
          if (first.endsWith('.') || first.length > 25) {
            parts.push(first)
          } else {
            const cleanKey = key.replace(/_/g, ' ')
            parts.push(`${cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)}: ${first}`)
          }
        } else if (typeof val === 'string') {
          parts.push(val)
        } else if (typeof val === 'object' && val !== null) {
          const nested = Object.values(val).flat()
          if (nested.length && typeof nested[0] === 'string') {
            parts.push(nested[0])
          }
        }
      }
      if (parts.length) return parts.join('; ')
    }

    if (status === 404) return 'Requested resource not found.'
    if (status === 403) return 'You do not have permission to perform this action.'
    if (status === 401) return 'Session expired. Please log in again.'
    if (status === 500) return 'Internal server error occurred. Please try again.'
  }
  return err?.message || 'Something went wrong.'
}
