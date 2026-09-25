import { useSyncExternalStore } from 'react'

/** Breakpoint at which the layout switches from tab bar to sidebar (docs/SPEC.md §7.0). */
export const DESKTOP_QUERY = '(min-width: 900px)'

function subscribe(query: string, onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function matches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(query).matches
}

/**
 * Reactive media query backed by useSyncExternalStore (no state library).
 * Returns false when matchMedia is unavailable (tests stub it in setup.ts).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => matches(query),
    () => false,
  )
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY)
}
