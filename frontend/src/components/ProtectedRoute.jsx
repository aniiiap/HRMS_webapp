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

  // If user is logged in but hasn't completed onboarding, force them to /complete-profile
  if (user.onboarding_pending && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }
  
  // If user has completed onboarding but tries to access /complete-profile, redirect them away
  if (!user.onboarding_pending && location.pathname === '/complete-profile') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
