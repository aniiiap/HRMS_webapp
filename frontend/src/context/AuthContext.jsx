import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStore.getUser())
  const [loading, setLoading] = useState(() => Boolean(tokenStore.getAccess()) && !tokenStore.getUser())

  useEffect(() => {
    async function init() {
      if (!tokenStore.getAccess()) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get('/api/auth/me/')
        setUser(data)
        tokenStore.set(null, null, data)
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          tokenStore.clear()
          setUser(null)
        }
        // If it's a network error (no err.response), keep the cached user!
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login/', { email, password })
    tokenStore.set(data.access, data.refresh, data.user)
    setUser(data.user)
    return data.user
  }

  const defaultHome = (u) => {
    if (u?.is_superuser && !u?.organization_id) return '/platform'
    return '/'
  }

  const logout = async () => {
    try {
      const refresh = tokenStore.getRefresh()
      if (refresh) await api.post('/api/auth/logout/', { refresh })
    } catch {
      // ignore
    }
    tokenStore.clear()
    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isManagerPlus: ['admin', 'hr', 'manager'].includes(user?.role),
    isPrivileged: ['admin', 'hr'].includes(user?.role),
    isPlatformAdmin: Boolean(user?.is_superuser),
    isOrganizationUser: Boolean(user?.organization_id),
    defaultHome: user ? defaultHome(user) : '/',
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
