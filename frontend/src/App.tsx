import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useLayoutEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth.tsx'
import PageLoading from './components/PageLoading.tsx'

// Every page is its own download ("code splitting"). A visitor of the landing page does not download the
// dashboard, the charts or the board; they arrive when the page that needs them is opened.
const Layout = lazy(() => import('./components/Layout.tsx'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage.tsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.tsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.tsx'))
const InsightsPage = lazy(() => import('./pages/InsightsPage.tsx'))
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'))
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage.tsx'))
const ResumesPage = lazy(() => import('./pages/ResumesPage.tsx'))

const AUTH_PATHS = ['/login', '/register']

export default function App() {
  const { loggedIn } = useAuth()
  const location = useLocation()

  // A new page starts at the top
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // "/" is the public landing page. Someone who is already logged in goes straight to the dashboard
  if (location.pathname === '/') {
    return loggedIn ? (
      <Navigate to="/dashboard" replace />
    ) : (
      <Suspense fallback={<PageLoading />}>
        <LandingPage />
      </Suspense>
    )
  }

  if (AUTH_PATHS.includes(location.pathname)) {
    // One AuthPage for both URLs, so switching between login and register keeps the animated side panel
    return (
      <Suspense fallback={<PageLoading />}>
        <AuthPage mode={location.pathname === '/login' ? 'login' : 'register'} />
      </Suspense>
    )
  }

  // Everything else is only for logged-in users
  if (!loggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <Suspense fallback={<PageLoading />}>
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
        {/* The inner Suspense keeps the navigation on screen while the next page is downloaded */}
        <Suspense fallback={<PageLoading />}>
        <Routes location={location}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/applications/new" element={<NewApplicationPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
        </motion.div>
      </AnimatePresence>
    </Layout>
    </Suspense>
  )
}
