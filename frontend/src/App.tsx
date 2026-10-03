import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.tsx'
import Layout from './components/Layout.tsx'
import ApplicationDetailPage from './pages/ApplicationDetailPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NewApplicationPage from './pages/NewApplicationPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'
import ResumesPage from './pages/ResumesPage.tsx'

// Pages inside this route are only shown to logged-in users; everyone else is sent to the login page
function RequireLogin() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireLogin />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/resumes" element={<ResumesPage />} />
        <Route path="/applications/new" element={<NewApplicationPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
