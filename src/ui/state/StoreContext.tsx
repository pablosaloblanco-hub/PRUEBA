// ============================================================================
// src/ui/state/StoreContext.tsx — <StoreProvider store>. Only exports the
// component (oxlint react/only-export-components).
// ============================================================================
import type { ReactNode } from 'react'
import type { Store } from '../../domain/storage/store'
import { StoreContext } from './storeContext'

export function StoreProvider({ store, children }: { store: Store; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
