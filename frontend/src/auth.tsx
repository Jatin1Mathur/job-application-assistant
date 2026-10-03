import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setSessionExpiredHandler, tokenStore } from './api.ts'

interface AuthContextValue {
  token: string | null
  email: string | null
  // Set when the user was logged out because the token expired
  notice: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  // Enter the shared demo account, without an email or a password
  demoLogin: () => Promise<void>
  // True while the shared demo account is logged in
  isDemo: boolean
  logout: () => void
}

const EMAIL_KEY = 'job-assistant.email'
// The same address the backend gives the demo user (DemoAccountService.DEMO_EMAIL)
const DEMO_EMAIL = 'demo@jobassistant.example'

const AuthContext = createContext<AuthContextValue | null>(null)

// Keeps the login state (JWT token + email) for the whole app and saves it in the browser,
// so the user stays logged in after a page reload
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(tokenStore.get())
  const [email, setEmail] = useState<string | null>(localStorage.getItem(EMAIL_KEY))
  const [notice, setNotice] = useState<string | null>(null)

  const clear = useCallback(() => {
    tokenStore.clear()
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
    setEmail(null)
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clear()
      setNotice('Your session has expired. Please log in again.')
    })
  }, [clear])

  const login = useCallback(async (emailInput: string, password: string) => {
    const result = await api.login(emailInput, password)
    const normalized = emailInput.trim().toLowerCase()
    tokenStore.set(result.token)
    localStorage.setItem(EMAIL_KEY, normalized)
    setToken(result.token)
    setEmail(normalized)
    setNotice(null)
  }, [])

  const demoLogin = useCallback(async () => {
    const result = await api.demoLogin()
    tokenStore.set(result.token)
    localStorage.setItem(EMAIL_KEY, DEMO_EMAIL)
    setToken(result.token)
    setEmail(DEMO_EMAIL)
    setNotice(null)
  }, [])

  const register = useCallback(
    async (emailInput: string, password: string, name?: string) => {
      await api.register(emailInput, password, name)
      await login(emailInput, password)
    },
    [login],
  )

  const logout = useCallback(() => {
    clear()
    setNotice(null)
  }, [clear])

  const value = useMemo(
    () => ({ token, email, notice, login, register, demoLogin, isDemo: email === DEMO_EMAIL, logout }),
    [token, email, notice, login, register, demoLogin, logout],
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
