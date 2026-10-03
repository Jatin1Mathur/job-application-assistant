// The keyboard shortcuts of the app. The help dialog ("?") is built from this list,
// so the dialog can never show a shortcut that does not exist.
export const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Open the command palette (Ctrl+K on Windows and Linux)' },
  { keys: ['?'], description: 'Show this list of shortcuts' },
  { keys: ['N'], description: 'New application' },
  { keys: ['G', 'D'], description: 'Go to the dashboard' },
  { keys: ['G', 'I'], description: 'Go to insights' },
  { keys: ['G', 'R'], description: 'Go to resumes' },
  { keys: ['T'], description: 'Switch between light and dark mode' },
]

// Single-letter shortcuts must not fire while the user is typing in a field
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.closest('[role="dialog"], [role="listbox"], [role="menu"]') !== null
  )
}
