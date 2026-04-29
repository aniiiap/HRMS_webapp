import axios from 'axios'

const ACCESS = 'hrms_access'
const REFRESH = 'hrms_refresh'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS),
  getRefresh: () => localStorage.getItem(REFRESH),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS, access)
    localStorage.setItem(REFRESH, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS)
    localStorage.removeItem(REFRESH)
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
            localStorage.setItem(ACCESS, res.data.access)
            return res.data.access
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
    const d = err.response?.data || {}
    if (d.error) return String(d.error)
    if (d.detail) return String(d.detail)
    const parts = []
    for (const [key, val] of Object.entries(d)) {
      if (key === 'detail') continue
      if (Array.isArray(val) && val.length) parts.push(`${key}: ${val[0]}`)
      else if (typeof val === 'string') parts.push(`${key}: ${val}`)
    }
    if (parts.length) return parts.join(' ')
  }
  return err?.message || 'Something went wrong.'
}
