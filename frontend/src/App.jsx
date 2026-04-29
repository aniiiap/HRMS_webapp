import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ActivateAccountPage from './pages/ActivateAccountPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import AttendancePage from './pages/AttendancePage'
import LeavesPage from './pages/LeavesPage'
import PayrollPage from './pages/PayrollPage'
import ReportsPage from './pages/ReportsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate-account" element={<ActivateAccountPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
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
