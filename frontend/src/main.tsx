import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'
import { Toaster } from './components/ui/sonner.tsx'
import './index.css'
import { ThemeProvider } from './theme.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* reducedMotion="user": people who asked their system for less motion get no movement animations */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        {/* On a phone the messages sit above the bottom navigation bar */}
        <Toaster position="bottom-right" richColors closeButton mobileOffset={{ bottom: 76 }} />
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
)
