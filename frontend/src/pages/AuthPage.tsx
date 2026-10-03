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

const PITCH = [
  { icon: Target, title: 'AI match score', text: 'See how well your resume fits a job, with matching and missing skills.' },
  { icon: FileText, title: 'Cover letters in seconds', text: 'Written from your real resume. No invented experience.' },
  { icon: LayoutDashboard, title: 'Every application in one place', text: 'Track each job from saved to offer.' },
]

// The left half of the login and register pages: a short product pitch on a slowly moving gradient
function PitchPanel() {
  return (
    <div className="animated-gradient relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      {/* Two soft blobs that drift slowly behind the text */}
      <motion.div
        aria-hidden
        className="absolute -left-24 -top-24 size-96 rounded-full bg-brand/25 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-32 -right-20 size-[28rem] rounded-full bg-emerald-300/15 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative">
        <Logo light />
      </div>
      <motion.div className="relative" variants={staggerList} initial="hidden" animate="show">
        <motion.h2 variants={staggerItem} className="max-w-md text-5xl font-semibold leading-[1.05] tracking-tight text-white">
          Apply smarter, not harder.
        </motion.h2>
        <motion.p variants={staggerItem} className="mt-4 max-w-md text-base text-white/75">
          Your personal assistant for the job hunt, powered by an AI model that runs on your own machine.
        </motion.p>
        <ul className="mt-10 space-y-5">
          {PITCH.map(({ icon: Icon, title, text }) => (
            <motion.li key={title} variants={staggerItem} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground">
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
      <p className="relative text-xs text-white/50">Spring Boot · React · Ollama</p>
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

  if (token) {
    return <Navigate to={cameFrom} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await (isLogin ? login(email, password) : register(email, password))
      toast.success(isLogin ? 'Welcome back!' : 'Account created. Welcome!')
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
              <h1 className="text-2xl font-semibold tracking-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {isLogin ? 'Log in to continue your job hunt.' : 'It takes less than a minute.'}
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
                  className="font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:decoration-foreground"
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
