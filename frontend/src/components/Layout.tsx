import { BarChart3, CircleHelp, FileText, LayoutDashboard, LogOut, Search } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth.tsx'
import CommandCenter from './CommandCenter.tsx'
import Kbd from './Kbd.tsx'
import Logo from './Logo.tsx'
import ThemeToggle from './ThemeToggle.tsx'
import { Button } from './ui/button.tsx'

const NAV = [
  { to: '/dashboard', label: 'Applications', icon: LayoutDashboard },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/resumes', label: 'Resumes', icon: FileText },
]

const topLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

// On a phone: a bar at the bottom, where the thumb is, with an icon and a word for each place
const bottomLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
    isActive ? 'text-primary' : 'text-muted-foreground'
  }`

// The frame around every page for logged-in users: navigation, search, theme toggle and log out
export default function Layout({ children }: { children: ReactNode }) {
  const { email, isDemo, logout } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="relative min-h-dvh">
      {/* The first thing a keyboard user reaches: jump past the navigation */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:gap-6">
            <Link to="/dashboard" aria-label="Job Assistant, go to applications" className="flex min-h-11 items-center rounded-lg">
              <Logo />
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={topLink}>
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search and commands"
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-lg border bg-card text-sm text-muted-foreground transition-colors hover:bg-muted sm:h-9 md:w-44 md:justify-start md:px-2.5"
            >
              <Search className="size-4" />
              <span className="hidden flex-1 text-left md:inline">Search…</span>
              <span className="hidden items-center gap-0.5 md:flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="hidden sm:inline-flex"
              aria-label="Keyboard shortcuts"
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp className="size-[18px]" />
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="lg" onClick={logout} aria-label="Log out" title={email ?? undefined}>
              <LogOut />
              <span className="hidden lg:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      {isDemo && (
        <p className="border-b bg-encourage px-4 py-2 text-center text-sm text-encourage-foreground" role="note" data-testid="demo-banner">
          You are in the shared demo account. Its sample data is put back every night, so nothing you change here is kept.{' '}
          <Link to="/register" onClick={logout} className="font-semibold underline underline-offset-2">
            Create your own account
          </Link>
        </p>
      )}

      {/* pb-24 on phones leaves room for the bottom bar */}
      <main id="main" tabIndex={-1} className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 outline-none sm:px-6 sm:pb-12">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={bottomLink}>
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <CommandCenter
        paletteOpen={paletteOpen}
        setPaletteOpen={setPaletteOpen}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
      />
    </div>
  )
}
