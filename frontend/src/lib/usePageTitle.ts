import { useEffect } from 'react'

// Gives every page its own browser tab title, e.g. "Insights · Job Assistant".
// It helps with many open tabs, and a screen reader announces it when the page changes.
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · Job Assistant` : 'Job Assistant'
  }, [title])
}
