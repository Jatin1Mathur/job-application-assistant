import { AnimatePresence } from 'motion/react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.tsx'
import Layout from './components/Layout.tsx'
import ApplicationDetailPage from './pages/ApplicationDetailPage.tsx'
import AuthPage from './pages/AuthPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import NewApplicationPage from './pages/NewApplicationPage.tsx'
import ResumesPage from './pages/ResumesPage.tsx'

const AUTH_PATHS = ['/login', '/register']

export default function App() {
  const { token } = useAuth()
  const location = useLocation()

  if (AUTH_PATHS.includes(location.pathname)) {
    // One AuthPage for both URLs, so switching between login and register keeps the animated side panel
    return <AuthPage mode={location.pathname === '/login' ? 'login' : 'register'} />
  }

  // Everything else is only for logged-in users
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <Layout>
      {/* AnimatePresence lets the old page fade out before the new one fades in.
          The key tells it "this is a different page" whenever the URL changes. */}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
