// ============================================================================
// src/App.tsx — composition root. Without props it builds the store over
// localStorage (falling back to a memory repository when the load is
// `unavailable`, §5.6), then Providers → <Shell>. Tests inject `store`/`today`.
// ============================================================================
import { useState } from 'react'
import { todayLocal } from './domain/dates'
import { createLocalStorageRepository } from './domain/storage/localStorageRepository'
import { createMemoryRepository } from './domain/storage/memoryRepository'
import { createStore } from './domain/storage/store'
import type { Store, StoreDeps } from './domain/storage/store'
import type { LocalDate } from './domain/types'
import { Shell } from './ui/components/Shell'
import { StoreProvider } from './ui/state/StoreContext'
import { UiProvider } from './ui/state/UiContext'
import type { UiState } from './ui/state/uiReducer'

export type AppProps = {
  store?: Store
  today?: () => LocalDate
  /** Test-only: initial UI state overrides (screen, month, sheet …). */
  initialUi?: Partial<UiState>
}

/** `window.localStorage` itself can throw (SecurityError in locked-down browsers). */
function readLocalStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function createDefaultStore(deps: StoreDeps): Store {
  const local = createStore(createLocalStorageRepository(readLocalStorage()), deps)
  const load = local.getPersistence().load
  if (load !== null && load.kind === 'unavailable') {
    // Nothing can be written: run in memory and keep the original LoadResult for the banner.
    return createStore(createMemoryRepository(), deps, { loadOverride: load })
  }
  return local
}

function App({ store, today, initialUi }: AppProps) {
  const [todayFn] = useState(() => today ?? (() => todayLocal()))
  const [resolvedStore] = useState(() => store ?? createDefaultStore({ now: Date.now, today: todayFn }))

  return (
    <StoreProvider store={resolvedStore}>
      <UiProvider today={todayFn} initialState={initialUi}>
        <Shell />
      </UiProvider>
    </StoreProvider>
  )
}

export default App
