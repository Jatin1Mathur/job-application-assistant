import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { lazy, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api.ts'
import { useAuth } from '../auth.tsx'
import CompassFallback from '../components/CompassFallback.tsx'
import ErrorAlert from '../components/ErrorAlert.tsx'
import Lazy3D from '../components/Lazy3D.tsx'
import Logo from '../components/Logo.tsx'
import MotionButton from '../components/MotionButton.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import { Alert, AlertDescription } from '../components/ui/alert.tsx'
import { Button } from '../components/ui/button.tsx'
import { Input } from '../components/ui/input.tsx'
import { Label } from '../components/ui/label.tsx'
import { emailProblem, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordStrength } from '../lib/password.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

// The 3D code is a separate download. It starts only on wide screens, where the side panel is shown.
const CompassScene = lazy(() => import('../three/CompassScene.tsx'))

// Plain advice, no numbers: nothing here is a statistic
const TIPS = [
  'Read the posting twice. Mark the skills it names, then check each one against your resume.',
  'Put your most relevant project first. The order of a resume can change for each application.',
  'A missing skill is not a no. Say what you have done that comes closest, and that you want to learn the rest.',
  'Write the cover letter for one job. If it could be sent to any company, it is too general.',
  'Keep a record of every application: the date, the status, and which resume you sent.',
]

// The left half of the login and register pages: a compass and job-hunt tips that take turns.
// north: true once the login has succeeded. The needle of the compass then swings to north.
function SidePanel({ north }: { north: boolean }) {
  const reducedMotion = useReducedMotion()
  const [tip, setTip] = useState(0)
  const [paused, setPaused] = useState(false)

  // A new tip every 7 seconds. Not with "reduce motion", and not while someone is reading or using the arrows.
  useEffect(() => {
    if (reducedMotion || paused) return
    const timer = setInterval(() => setTip((current) => (current + 1) % TIPS.length), 7000)
    return () => clearInterval(timer)
  }, [reducedMotion, paused])

  const step = (by: number) => setTip((current) => (current + by + TIPS.length) % TIPS.length)

  return (
    <div className="animated-gradient relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      <div className="relative">
        <Logo light />
      </div>

      <div className="relative">
        <Lazy3D
          label={north ? 'A compass. Its needle points north.' : 'A compass. Its needle is still searching for north.'}
          className="mx-auto h-64 w-64"
          fallback={<CompassFallback north={north} />}
          scene={(props) => <CompassScene {...props} north={north} />}
        />
        <h2 className="mt-6 max-w-md font-display text-4xl font-semibold leading-[1.08] text-white">Know where you stand before you apply.</h2>
      </div>

      <section
        className="relative max-w-md"
        aria-roledescription="carousel"
        aria-label="Job-hunt tips"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <p className="text-sm font-semibold text-white/75">
          Job-hunt tip {tip + 1} of {TIPS.length}
        </p>
        <div className="mt-2 min-h-24" aria-live={paused ? 'polite' : 'off'}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={tip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-lg leading-relaxed text-white"
              data-testid="tip"
            >
              {TIPS[tip]}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => step(-1)} aria-label="Previous tip" className="flex size-11 items-center justify-center rounded-full text-white ring-1 ring-white/35 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next tip" className="flex size-11 items-center justify-center rounded-full text-white ring-1 ring-white/35 transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>
    </div>
  )
}

// Four small bars and a word. The word carries the meaning, so it does not depend on colour.
function StrengthMeter({ password, email }: { password: string; email: string }) {
  const strength = passwordStrength(password, email)
  const colors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']
  return (
    <div id="password-strength" data-testid="strength" data-level={strength.level}>
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${bar <= strength.level ? colors[strength.level] : 'bg-muted'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Password strength: {strength.label}.</span> {strength.hint}
      </p>
    </div>
  )
}

// Shown for a moment after a successful login, before the dashboard opens: a circle and a check mark that draw themselves
function SuccessMark({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background"
      role="status"
      data-testid="auth-success"
    >
      <svg viewBox="0 0 64 64" className="size-20 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.circle cx="32" cy="32" r="27" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
        <motion.path d="M21 33l8 8 15-17" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }} />
      </svg>
      <p className="text-lg font-semibold">{text}</p>
    </motion.div>
  )
}

const fieldError = 'mt-1.5 text-sm font-medium text-destructive'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { loggedIn, notice, login, register, demoLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const emailInput = useRef<HTMLInputElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Optional, only asked for when creating an account. It is used for the greeting on the dashboard.
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  // A field shows its problem only after the visitor has left it once, or after a try to submit
  const [touched, setTouched] = useState({ email: false, password: false })
  const [error, setError] = useState<string | null>(null)
  // form: waiting for input. busy/demo: a request is running. success: logged in, the check mark is shown.
  const [phase, setPhase] = useState<'form' | 'busy' | 'demo' | 'success'>('form')
  const [successText, setSuccessText] = useState('')

  const isLogin = mode === 'login'
  const cameFrom = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  usePageTitle(isLogin ? 'Log in' : 'Create account')

  const emailError = emailProblem(email)
  const passwordError = !password
    ? 'Enter your password.'
    : !isLogin && password.length < MIN_PASSWORD_LENGTH
      ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
      : !isLogin && password.length > MAX_PASSWORD_LENGTH
        ? `Use at most ${MAX_PASSWORD_LENGTH} characters.`
        : null
  const showEmailError = touched.email && emailError
  const showPasswordError = touched.password && passwordError

  // After the check mark has been seen, go on to the dashboard
  useEffect(() => {
    if (phase !== 'success') return
    const timer = setTimeout(() => navigate(cameFrom, { replace: true }), reducedMotion ? 500 : 1300)
    return () => clearTimeout(timer)
  }, [phase, reducedMotion, navigate, cameFrom])

  // Someone who is already logged in has nothing to do here
  if (loggedIn && phase === 'form') {
    return <Navigate to={cameFrom} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setTouched({ email: true, password: true })
    if (emailError) return emailInput.current?.focus()
    if (passwordError) return passwordInput.current?.focus()
    setPhase('busy')
    try {
      await (isLogin ? login(email, password) : register(email, password, name))
      setSuccessText(isLogin ? 'You are logged in' : 'Your account is ready')
      setPhase('success')
    } catch (err) {
      // One message for "unknown email" and "wrong password", so nobody can test which emails have an account
      setError(isLogin && err instanceof ApiError && err.status === 401 ? 'Email or password is incorrect' : errorMessage(err))
      setPhase('form')
    }
  }

  async function enterDemo() {
    setError(null)
    setPhase('demo')
    try {
      await demoLogin()
      setSuccessText('Welcome to the demo account')
      setPhase('success')
    } catch (err) {
      setError(errorMessage(err))
      setPhase('form')
    }
  }

  const watchCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'))
  const working = phase === 'busy' || phase === 'demo'

  return (
    <div className="flex min-h-dvh">
      <SidePanel north={phase === 'success'} />
      <main id="main" className="relative flex w-full flex-col items-center justify-center px-5 py-16 lg:w-1/2">
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 rounded text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="relative w-full max-w-sm">
          {phase === 'success' && <SuccessMark text={successText} />}

          <div className="mb-7 lg:hidden">
            <Logo />
          </div>

          {/* Log in / Create account: two links that look like one switch. The marker slides from one to the other. */}
          <nav aria-label="Log in or create an account" className="grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-semibold">
            {(['login', 'register'] as const).map((target) => (
              <Link
                key={target}
                to={`/${target}`}
                state={location.state}
                replace
                aria-current={mode === target ? 'page' : undefined}
                onClick={() => setError(null)}
                className={`relative flex min-h-11 items-center justify-center rounded-lg transition-colors ${mode === target ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === target && <motion.span layoutId="auth-switch" className="absolute inset-0 rounded-lg border bg-card" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative">{target === 'login' ? 'Log in' : 'Create account'}</span>
              </Link>
            ))}
          </nav>

          {/* The heading changes in place; the fields below stay, so what was typed is kept when switching */}
          <div className="mt-7 min-h-[4.75rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                <h1 className="text-3xl font-semibold">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {isLogin ? 'Log in to continue your job search.' : 'An email address and a password are all you need.'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <form onSubmit={submit} noValidate className="mt-5">
            {notice && isLogin && (
              <Alert className="mb-4">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {error && (
              <div className="mb-4">
                <ErrorAlert message={error} />
              </div>
            )}

            {/* The name field grows in when the form turns into "Create account" */}
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="pb-4">
                    <Label htmlFor="name">
                      First name <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Input id="name" name="name" autoComplete="given-name" maxLength={100} className="mt-1.5 h-11" value={name} onChange={(event) => setName(event.target.value)} aria-describedby="name-hint" />
                    <p id="name-hint" className="mt-1.5 text-xs text-muted-foreground">
                      Used to greet you on the dashboard.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInput}
                id="email"
                name="email"
                type="email"
                inputMode="email"
                // Password managers look for "username" on a login form and "email" on a sign-up form
                autoComplete={isLogin ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
                required
                className="mt-1.5 h-11"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                aria-invalid={showEmailError ? true : undefined}
                aria-describedby={showEmailError ? 'email-error' : undefined}
              />
              {showEmailError && (
                <p id="email-error" className={fieldError}>
                  {emailError}
                </p>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  ref={passwordInput}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  className="h-11 pr-12"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => {
                    setTouched((current) => ({ ...current, password: true }))
                    setCapsLock(false)
                  }}
                  onKeyDown={watchCapsLock}
                  onKeyUp={watchCapsLock}
                  aria-invalid={showPasswordError ? true : undefined}
                  aria-describedby={[showPasswordError ? 'password-error' : '', !isLogin ? 'password-strength' : ''].filter(Boolean).join(' ') || undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              {capsLock && (
                <p className="mt-1.5 text-sm font-medium text-amber-800 dark:text-amber-300" role="status" data-testid="caps-lock">
                  Caps Lock is on.
                </p>
              )}
              {showPasswordError && (
                <p id="password-error" className={fieldError}>
                  {passwordError}
                </p>
              )}
              {/* The strength meter grows in when the form turns into "Create account" */}
              <AnimatePresence initial={false}>
                {!isLogin && (
                  <motion.div
                    key="strength"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2.5">
                      <StrengthMeter password={password} email={email} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <MotionButton type="submit" disabled={working} className="mt-6 h-11 w-full text-base">
              {phase === 'busy' && <Loader2 className="animate-spin" />}
              {isLogin ? 'Log in' : 'Create account'}
            </MotionButton>
          </form>

          <div className="mt-6 border-t pt-5">
            <Button type="button" variant="outline" disabled={working} onClick={enterDemo} className="h-11 w-full text-base" data-testid="demo-login">
              {phase === 'demo' && <Loader2 className="animate-spin" />}
              Try with demo account
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">No sign-up. A shared account with sample data that is reset every night.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
