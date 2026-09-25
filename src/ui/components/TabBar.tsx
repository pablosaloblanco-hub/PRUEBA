// ============================================================================
// src/ui/components/TabBar.tsx — mobile bottom bar: 4 screen slots around a
// central FAB (§7.0). aria-current only on the 4 tab screens.
// ============================================================================
import { copy } from '../copy'
import { useUi, useUiActions } from '../state/useUi'
import type { Screen } from '../state/uiReducer'

type Slot = { screen: Screen; label: string; icon: string }

const LEFT: readonly Slot[] = [
  { screen: 'home', label: copy.nav.home, icon: '🏠' },
  { screen: 'transactions', label: copy.nav.transactions, icon: '📋' },
]
const RIGHT: readonly Slot[] = [
  { screen: 'budgets', label: copy.nav.budgets, icon: '🎯' },
  { screen: 'reports', label: copy.nav.reports, icon: '📊' },
]

export function TabBar() {
  const { screen } = useUi()
  const { nav, openSheet } = useUiActions()

  const renderSlot = (slot: Slot) => (
    <button
      key={slot.screen}
      type="button"
      className="tabbar__slot"
      aria-current={screen === slot.screen ? 'page' : undefined}
      onClick={() => nav(slot.screen)}
    >
      <span className="tabbar__icon" aria-hidden="true">
        {slot.icon}
      </span>
      <span className="tabbar__label">{slot.label}</span>
    </button>
  )

  return (
    <nav className="tabbar" aria-label={copy.nav.mainNavLabel}>
      {LEFT.map(renderSlot)}
      <div className="tabbar__fab-slot">
        <button
          type="button"
          className="fab"
          aria-label={copy.nav.addTransaction}
          onClick={() => openSheet({ kind: 'transaction/new' })}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      {RIGHT.map(renderSlot)}
    </nav>
  )
}
