import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, sessionHint, setSessionExpiredHandler } from './api.ts'

interface AuthContextValue {
  // True while this browser is (as far as the page knows) logged in
  loggedIn: boolean
  email: string | null
  // Set when the user was logged out because the login expired
  notice: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  // Enter the shared demo account, without an email or a password
  demoLogin: () => Promise<void>
  // True while the shared demo account is logged in
  isDemo: boolean
  logout: () => void
}

// The same address the backend gives the demo user (DemoAccountService.DEMO_EMAIL)
const DEMO_EMAIL = 'demo@jobassistant.example'

const AuthContext = createContext<AuthContextValue | null>(null)

// Keeps the login state for the whole app.
//
// The login token is in an httpOnly cookie, which this code cannot read. So the page keeps a note of its own
// (the email, in localStorage) that says "probably logged in". When the page loads with that note, it asks the
// backend once whether the cookie is still good. If not, the user is logged out with a short explanation.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(sessionHint.get())
  const [notice, setNotice] = useState<string | null>(null)

  const clear = useCallback(() => {
    sessionHint.clear()
    setEmail(null)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clear()
      setNotice('Your session has expired. Please log in again.')
    })
  }, [clear])

  // Check the cookie once when the page loads. A 401 runs the handler above.
  useEffect(() => {
    if (sessionHint.get()) {
      api.getAccount().catch(() => {})
    }
  }, [])

  const started = useCallback((sessionEmail: string) => {
    sessionHint.set(sessionEmail)
    setEmail(sessionEmail)
    setNotice(null)
  }, [])

  const login = useCallback(
    async (emailInput: string, password: string) => {
      const session = await api.login(emailInput, password)
      started(session.email)
    },
    [started],
  )

  const demoLogin = useCallback(async () => {
    const session = await api.demoLogin()
    started(session.email)
  }, [started])

  const register = useCallback(
    async (emailInput: string, password: string, name?: string) => {
      await api.register(emailInput, password, name)
      await login(emailInput, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    // The backend deletes the cookie. The page logs out at once and does not wait for the answer.
    api.logout().catch(() => {})
    clear()
    setNotice(null)
  }, [clear])

  const value = useMemo(
    () => ({ loggedIn: email !== null, email, notice, login, register, demoLogin, isDemo: email === DEMO_EMAIL, logout }),
    [email, notice, login, register, demoLogin, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
