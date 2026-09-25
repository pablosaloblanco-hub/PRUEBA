// ============================================================================
// src/ui/components/Sidebar.tsx — desktop (≥ 900 px) sidebar: visible <h1>,
// «+ Nuevo movimiento» and the six-entry nav with aria-current="page" (§7.0).
// ============================================================================
import { copy } from '../copy'
import { useUi, useUiActions } from '../state/useUi'
import type { Screen } from '../state/uiReducer'

const ENTRIES: readonly { screen: Screen; label: string; icon: string }[] = [
  { screen: 'home', label: copy.nav.home, icon: '🏠' },
  { screen: 'transactions', label: copy.nav.transactions, icon: '📋' },
  { screen: 'budgets', label: copy.nav.budgets, icon: '🎯' },
  { screen: 'reports', label: copy.nav.reports, icon: '📊' },
  { screen: 'categories', label: copy.nav.categories, icon: '🏷️' },
  { screen: 'settings', label: copy.nav.settings, icon: '⚙️' },
]

export function Sidebar() {
  const { screen } = useUi()
  const { nav, openSheet } = useUiActions()

  return (
    <aside className="sidebar">
      <h1 className="sidebar__title">{copy.app.title}</h1>
      <button
        type="button"
        className="btn btn--primary sidebar__new"
        onClick={() => openSheet({ kind: 'transaction/new' })}
      >
        {copy.nav.newTransaction}
      </button>
      <nav className="sidebar__nav" aria-label={copy.nav.mainNavLabel}>
        {ENTRIES.map((entry) => (
          <button
            key={entry.screen}
            type="button"
            className="sidebar__link"
            aria-current={screen === entry.screen ? 'page' : undefined}
            onClick={() => nav(entry.screen)}
          >
            <span className="sidebar__icon" aria-hidden="true">
              {entry.icon}
            </span>
            {entry.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
