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
const HolidayCalendar = lazy(() => import('./pages/HolidayCalendar'))
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
const AssetsPage = lazy(() => import('./pages/AssetsPage'))
const HelpdeskPage = lazy(() => import('./pages/helpdesk/HelpdeskPage'))
const TicketDetailPage = lazy(() => import('./pages/helpdesk/TicketDetailPage'))
const PlatformHelpdeskPage = lazy(() => import('./pages/helpdesk/PlatformHelpdeskPage'))
const PlatformTicketDetailPage = lazy(() => import('./pages/helpdesk/PlatformTicketDetailPage'))
const PlatformProfilePage = lazy(() => import('./pages/platform/PlatformProfilePage'))
import PlatformRoute from './components/PlatformRoute'
import PlatformLayout from './components/PlatformLayout'
import CompanyRoute from './components/CompanyRoute'

// Public Marketing Pages
import PublicLayout from './components/public/PublicLayout'
const LandingPage = lazy(() => import('./pages/public/LandingPage'))
const ProductsPage = lazy(() => import('./pages/public/ProductsPage'))
const PricingPage = lazy(() => import('./pages/public/PricingPage'))
const AboutPage = lazy(() => import('./pages/public/AboutPage'))
const RequestDemoPage = lazy(() => import('./pages/public/RequestDemoPage'))

export default function App() {
  return (
    <Routes>
      {/* Public Marketing Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Suspense fallback={<RoutePageFallback />}><LandingPage /></Suspense>} />
        <Route path="/products" element={<Suspense fallback={<RoutePageFallback />}><ProductsPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={<RoutePageFallback />}><PricingPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<RoutePageFallback />}><AboutPage /></Suspense>} />
        <Route path="/demo" element={<Suspense fallback={<RoutePageFallback />}><RequestDemoPage /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<RoutePageFallback />}><RequestDemoPage /></Suspense>} />
      </Route>

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
            <Route
              path="/platform/support"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <PlatformHelpdeskPage />
                </Suspense>
              }
            />
            <Route
              path="/platform/support/:id"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <PlatformTicketDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/platform/settings"
              element={
                <Suspense fallback={<RoutePageFallback />}>
                  <PlatformProfilePage />
                </Suspense>
              }
            />
          </Route>
        </Route>
        <Route element={<CompanyRoute />}>
          <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'employee', 'manager']} />}>
            <Route path="/payroll" element={<PayrollPage />} />
          </Route>
          <Route path="/leaves" element={<LeavesPage />} />
          <Route path="/holidays" element={<HolidayCalendar />} />
          
          {/* Expenses */}
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'employee', 'manager']} />}>
            <Route path="/expenses" element={<Suspense fallback={<RoutePageFallback />}><ExpensesPage /></Suspense>} />
          </Route>
          
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/expenses/approvals" element={
              <Suspense fallback={<RoutePageFallback />}>
                <AdminExpensesPage />
              </Suspense>
            } />
            <Route path="/reports" element={<ReportsPage />} />
            
            <Route path="/assets" element={
              <Suspense fallback={<RoutePageFallback />}>
                <AssetsPage />
              </Suspense>
            } />
          </Route>
          <Route element={<RoleRoute allowedRoles={['admin', 'hr']} />}>
            <Route path="/organizations" element={<OrganizationsPage />} />
          </Route>
          <Route path="/helpdesk" element={
            <Suspense fallback={<RoutePageFallback />}>
              <HelpdeskPage />
            </Suspense>
          } />
          <Route path="/helpdesk/:id" element={
            <Suspense fallback={<RoutePageFallback />}>
              <TicketDetailPage />
            </Suspense>
          } />
          <Route element={<RoleRoute allowedRoles={['admin', 'hr', 'owner']} />}>
            <Route path="/platform-support" element={
              <Suspense fallback={<RoutePageFallback />}>
                <PlatformHelpdeskPage />
              </Suspense>
            } />
            <Route path="/platform-support/:id" element={
              <Suspense fallback={<RoutePageFallback />}>
                <PlatformTicketDetailPage />
              </Suspense>
            } />
          </Route>
          <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
