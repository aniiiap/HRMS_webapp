import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RoleRoute from './components/RoleRoute'
import RoutePageFallback from './components/RoutePageFallback'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'

const ActivateAccountPage = lazy(() => import('./pages/ActivateAccountPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const EmployeeProfilePage = lazy(() => import('./pages/EmployeeProfilePage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'))
const LeavesPage = lazy(() => import('./pages/LeavesPage'))
const PayrollPage = lazy(() => import('./pages/PayrollPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const PlatformDashboardPage = lazy(() => import('./pages/platform/PlatformDashboardPage'))
const PlatformOrganizationsPage = lazy(() => import('./pages/platform/PlatformOrganizationsPage'))
const LetterTemplates = lazy(() => import('./pages/letters/LetterTemplates'))
const LetterEditor = lazy(() => import('./pages/letters/LetterEditor'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const AdminExpensesPage = lazy(() => import('./pages/AdminExpensesPage'))
import PlatformRoute from './components/PlatformRoute'
import PlatformLayout from './components/PlatformLayout'
import CompanyRoute from './components/CompanyRoute'

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
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <ForgotPasswordPage />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<RoutePageFallback />}>
            <ResetPasswordPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<PlatformRoute />}>
          <Route element={<PlatformLayout />}>
            <Route
              path="/platform"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <PlatformDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/platform/organizations"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <PlatformOrganizationsPage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route element={<CompanyRoute />}>
          <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/letters" element={<LetterTemplates />} />
            <Route path="/letters/:id" element={<LetterEditor />} />
          </Route>
          
          <Route
            path="/employees/:id"
            element={
              <Suspense fallback={<RoutePageFallback />}>
                <EmployeeProfilePage />
              </Suspense>
            }
          />
          
          <Route path="/attendance" element={<AttendancePage />} />
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'employee']} />}>
            <Route
              path="/announcements"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <AnnouncementsPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'employee']} />}>
            <Route path="/payroll" element={<PayrollPage />} />
          </Route>
          <Route path="/leaves" element={<LeavesPage />} />
          
          {/* Expenses */}
          <Route element={<RoleRoute allowedRoles={['employee']} />}>
            <Route path="/expenses" element={<Suspense fallback={<RoutePageFallback />}><ExpensesPage /></Suspense>} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/expenses/approvals" element={
              <Suspense fallback={<RoutePageFallback />}>
                <AdminExpensesPage />
              </Suspense>
            } />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/organizations" element={<OrganizationsPage />} />
          </Route>
          <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
