import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Only platform superuser without a company binding may access HRMS owner routes. */
export default function PlatformRoute() {
  const { user, loading, isPlatformAdmin } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!isPlatformAdmin || user.organization_id) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
