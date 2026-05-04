import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Only block UI when we must validate an existing access token (logged-out users see login immediately).
  const [loading, setLoading] = useState(() => Boolean(tokenStore.getAccess()))

  useEffect(() => {
    async function init() {
      if (!tokenStore.getAccess()) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get('/api/auth/me/')
        setUser(data)
      } catch {
        tokenStore.clear()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login/', { email, password })
    tokenStore.set(data.access, data.refresh)
    setUser(data.user)
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
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
