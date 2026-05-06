import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import RoutePageFallback from './components/RoutePageFallback'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'

const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const LeavesPage = lazy(() => import('./pages/LeavesPage'))
const PayrollPage = lazy(() => import('./pages/PayrollPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/activate-account"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <ActivateAccountPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'manager']} />}>
            <Route path="/announcements" element={<AnnouncementsPage />} />
          </Route>
          <Route path="/leaves" element={<LeavesPage />} />
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/payroll" element={<PayrollPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'manager']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
