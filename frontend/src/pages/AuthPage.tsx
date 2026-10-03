import { ArrowLeft, FileText, LayoutDashboard, Loader2, Target } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { errorMessage } from '../api.ts'
import { useAuth } from '../auth.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { Alert, AlertDescription } from '../components/ui/alert.tsx'
import { Input } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import { staggerItem, staggerList } from '../lib/motion.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

const PITCH = [
  { icon: Target, title: 'A match score with reasons', text: 'See the skills you already have and the ones to work on.' },
  { icon: FileText, title: 'A cover letter draft', text: 'Written from your real resume. Nothing is invented.' },
  { icon: LayoutDashboard, title: 'Every application in one place', text: 'Track each job from saved to offer.' },
]

// The left half of the login and register pages: a short product pitch on a slowly moving gradient
function PitchPanel() {
  return (
    <div className="animated-gradient relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      {/* Two soft blobs that drift slowly behind the text */}
      <motion.div
        aria-hidden
        className="absolute -left-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-[#ffeccd]/10 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative">
        <Logo light />
      </div>
      <motion.div className="relative" variants={staggerList} initial="hidden" animate="show">
        <motion.h2 variants={staggerItem} className="max-w-md font-display text-5xl font-semibold leading-[1.05] text-white">
          Know where you stand before you apply.
        </motion.h2>
        <motion.p variants={staggerItem} className="mt-4 max-w-md text-base text-white/75">
          Compare your resume with any job posting, see what to work on, and keep every application in one place.
        </motion.p>
        <ul className="mt-10 space-y-5">
          {PITCH.map(({ icon: Icon, title, text }) => (
            <motion.li key={title} variants={staggerItem} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white ring-1 ring-white/25">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="block text-sm text-white/70">{text}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
      <p className="relative text-xs text-white/60">The analysis runs on a local AI model.</p>
    </div>
  )
}

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { token, notice, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'
  const cameFrom = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  usePageTitle(isLogin ? 'Log in' : 'Create account')

  if (token) {
    return <Navigate to={cameFrom} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await (isLogin ? login(email, password) : register(email, password))
      toast.success(isLogin ? 'You are logged in' : 'Your account is ready')
      navigate(cameFrom, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <PitchPanel />
      <div className="relative flex w-full flex-col items-center justify-center px-5 py-12 lg:w-1/2">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {/* The heading and form slide in again when switching between login and register */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-semibold">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isLogin ? 'Log in to continue your job search.' : 'An email address and a password are all you need.'}
              </p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                {notice && isLogin && (
                  <Alert>
                    <AlertDescription>{notice}</AlertDescription>
                  </Alert>
                )}
                {error && <ErrorAlert message={error} />}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="h-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    required
                    className="h-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
                  />
                </div>
                <MotionButton type="submit" disabled={loading} className="h-10 w-full">
                  {loading && <Loader2 className="animate-spin" />}
                  {isLogin ? 'Log in' : 'Create account'}
                </MotionButton>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
                <Link
                  to={isLogin ? '/register' : '/login'}
                  state={location.state}
                  onClick={() => setError(null)}
                  className="rounded font-semibold text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 hover:decoration-primary"
                >
                  {isLogin ? 'Create one' : 'Log in'}
                </Link>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
