import { BarChart3, FileText, Keyboard, LayoutDashboard, LogOut, Plus, SunMoon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.ts'
import type { Application } from '../api.ts'
import { useAuth } from '../auth.tsx'
import { isTyping, SHORTCUTS } from '../lib/shortcuts.ts'
import { useTheme } from '../theme.tsx'
import Kbd from './Kbd.tsx'
import StatusBadge from './StatusBadge.tsx'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from './ui/command.tsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.tsx'

// The command palette (Cmd+K), the keyboard shortcuts and the "?" help dialog.
// It lives in the layout, so it works on every page for logged-in users.
export default function CommandCenter({
  paletteOpen,
  setPaletteOpen,
  helpOpen,
  setHelpOpen,
}: {
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { toggleTheme } = useTheme()
  const [applications, setApplications] = useState<Application[]>([])
  const [search, setSearch] = useState('')
  // Remembers that "G" was just pressed, so the next key can finish a two-key shortcut like G then D
  const waitingForSecondKey = useRef(false)

  // Load the applications when the palette opens, so they can be searched by company or job title
  useEffect(() => {
    if (!paletteOpen) return
    // Always start with an empty search box
    setSearch('')
    api
      .listApplications(null, 0, 100)
      .then((page) => setApplications(page.content))
      .catch(() => setApplications([]))
  }, [paletteOpen])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Cmd+K / Ctrl+K works everywhere, even while typing
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(!paletteOpen)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return

      const key = event.key.toLowerCase()
      if (waitingForSecondKey.current) {
        waitingForSecondKey.current = false
        if (key === 'd') navigate('/dashboard')
        else if (key === 'i') navigate('/insights')
        else if (key === 'r') navigate('/resumes')
        return
      }
      if (event.key === '?') setHelpOpen(true)
      else if (key === 'n') navigate('/applications/new')
      else if (key === 't') toggleTheme()
      else if (key === 'g') {
        waitingForSecondKey.current = true
        // Forget the "G" if no second key follows soon
        setTimeout(() => (waitingForSecondKey.current = false), 1500)
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, paletteOpen, setHelpOpen, setPaletteOpen, toggleTheme])

  // Close the palette, then do the chosen thing
  function run(action: () => void) {
    setPaletteOpen(false)
    action()
  }

  return (
    <>
      <CommandDialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        title="Command palette"
        description="Go to a page, search your applications or run an action"
      >
        <Command>
        <CommandInput placeholder="Search applications or type a command…" value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => run(() => navigate('/applications/new'))}>
              <Plus /> New application
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(toggleTheme)}>
              <SunMoon /> Switch light / dark mode
              <CommandShortcut>T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => setHelpOpen(true))}>
              <Keyboard /> Keyboard shortcuts
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(logout)}>
              <LogOut /> Log out
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => run(() => navigate('/dashboard'))}>
              <LayoutDashboard /> Applications
              <CommandShortcut>G D</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate('/insights'))}>
              <BarChart3 /> Insights
              <CommandShortcut>G I</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => run(() => navigate('/resumes'))}>
              <FileText /> Resumes
              <CommandShortcut>G R</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          {applications.length > 0 && (
            <CommandGroup heading="Applications">
              {applications.map((application) => (
                <CommandItem
                  key={application.id}
                  // What the search box matches against: company first, then job title
                  value={`${application.companyName} ${application.jobTitle} ${application.id}`}
                  onSelect={() => run(() => navigate(`/applications/${application.id}`))}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
                    {application.companyName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {application.companyName}
                    <span className="text-muted-foreground"> · {application.jobTitle}</span>
                  </span>
                  <StatusBadge status={application.status} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
        </Command>
      </CommandDialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Work faster without the mouse. Shortcuts are off while you type in a field.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y text-sm">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.description} className="flex items-center justify-between gap-4 py-2.5">
                <span>{shortcut.description}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {shortcut.keys.map((key, index) => (
                    <span key={key} className="flex items-center gap-1">
                      {index > 0 && shortcut.keys[0] === 'G' && (
                        <span className="text-xs text-muted-foreground">then</span>
                      )}
                      <Kbd>{key}</Kbd>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  )
}
