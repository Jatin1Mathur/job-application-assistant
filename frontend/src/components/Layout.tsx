import { FileText, LayoutDashboard, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth.tsx'
import Logo from './Logo.tsx'
import ThemeToggle from './ThemeToggle.tsx'
import { Button } from './ui/button.tsx'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`

// The frame around every page for logged-in users: top bar with navigation, theme toggle and log out
export default function Layout({ children }: { children: ReactNode }) {
  const { email, logout } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link to="/" className="hidden sm:block">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={navLink}>
                <LayoutDashboard className="size-4" />
                Applications
              </NavLink>
              <NavLink to="/resumes" className={navLink}>
                <FileText className="size-4" />
                Resumes
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="mr-1 hidden max-w-52 truncate text-sm text-muted-foreground md:block">{email}</span>
            <ThemeToggle />
            <Button variant="outline" size="lg" onClick={logout} aria-label="Log out">
              <LogOut />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
