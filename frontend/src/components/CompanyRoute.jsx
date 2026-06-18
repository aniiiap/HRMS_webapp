import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Company workspace — platform superuser without org binding uses /platform instead. */
export default function CompanyRoute() {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user?.is_superuser && !user?.organization_id) {
    return <Navigate to="/platform" replace />
  }
  return <Outlet />
}
