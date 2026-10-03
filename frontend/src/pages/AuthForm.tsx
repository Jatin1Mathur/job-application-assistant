import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage } from '../api.ts'
import { useAuth } from '../auth.tsx'
import Alert from '../components/Alert.tsx'
import { Logo } from '../components/Layout.tsx'
import Spinner from '../components/Spinner.tsx'
import { buttonPrimary, card, input, label } from '../ui.ts'

// The login and register pages look the same, so both use this form
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { token, notice, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'
  const cameFrom = (location.state as { from?: string } | null)?.from ?? '/'

  if (token) {
    return <Navigate to={cameFrom} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await (isLogin ? login(email, password) : register(email, password))
      navigate(cameFrom, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className={`${card} p-8`}>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {isLogin
              ? 'Log in to track your applications.'
              : 'Track applications, match your resume with AI and write cover letters.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {notice && isLogin && <Alert kind="info">{notice}</Alert>}
            {error && <Alert>{error}</Alert>}
            <div>
              <label htmlFor="email" className={label}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className={label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
              />
            </div>
            <button type="submit" disabled={loading} className={`${buttonPrimary} w-full`}>
              {loading && <Spinner />}
              {isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
          <Link to={isLogin ? '/register' : '/login'} className="font-semibold text-indigo-600 hover:text-indigo-500">
            {isLogin ? 'Create one' : 'Log in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
