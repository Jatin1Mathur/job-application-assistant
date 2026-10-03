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

const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 ${
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

const NAV = [
  { to: '/dashboard', label: 'Applications', icon: LayoutDashboard },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/resumes', label: 'Resumes', icon: FileText },
]

// The frame around every page for logged-in users: top bar with navigation, search, theme toggle and log out
export default function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex items-center gap-2 lg:gap-5">
            <Link to="/dashboard" className="hidden lg:block">
              <Logo />
            </Link>
            <nav className="flex items-center gap-0.5 sm:gap-1">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navLink} aria-label={label}>
                  <Icon className="size-4" />
                  {/* On a phone only the icons fit */}
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search and commands"
              className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted md:w-44"
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
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <CommandCenter
        paletteOpen={paletteOpen}
        setPaletteOpen={setPaletteOpen}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
      />
    </div>
  )
}
