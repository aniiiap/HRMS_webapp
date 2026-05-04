import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import RoutePageFallback from './RoutePageFallback'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
        <RoutePageFallback />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
