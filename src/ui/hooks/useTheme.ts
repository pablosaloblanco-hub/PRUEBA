// ============================================================================
// src/ui/hooks/useTheme.ts — mirrors settings.theme onto <html data-theme>
// ('light' | 'dark'; the attribute is removed for 'system', F10).
// ============================================================================
import { useEffect } from 'react'
import { useAppData } from '../state/useStore'

export function applyTheme(theme: string): void {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.dataset['theme'] = theme
  else delete root.dataset['theme']
}

export function useTheme(): void {
  const theme = useAppData().settings.theme
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
}
