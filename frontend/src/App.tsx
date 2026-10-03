import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.tsx'
import Layout from './components/Layout.tsx'
import ApplicationDetailPage from './pages/ApplicationDetailPage.tsx'
import AuthPage from './pages/AuthPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'
import InsightsPage from './pages/InsightsPage.tsx'
import LandingPage from './pages/LandingPage.tsx'
import NewApplicationPage from './pages/NewApplicationPage.tsx'
import ResumesPage from './pages/ResumesPage.tsx'

const AUTH_PATHS = ['/login', '/register']

export default function App() {
  const { token } = useAuth()
  const location = useLocation()

  // A new page starts at the top
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // "/" is the public landing page. Someone who is already logged in goes straight to the dashboard
  if (location.pathname === '/') {
    return token ? <Navigate to="/dashboard" replace /> : <LandingPage />
  }

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
      {/* The old page fades out while the new one fades in. "popLayout" takes the old page out of the
          layout at once, so both exist for a moment: that is what lets a card on the dashboard
          grow into the header of the detail page (they share a layoutId). */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
        <Routes location={location}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </motion.div>
      </AnimatePresence>
    </Layout>
  )
}
