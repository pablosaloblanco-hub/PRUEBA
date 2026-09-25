// ============================================================================
// src/ui/state/storeContext.ts — the context that carries the external store
// (§5.6). Imported by StoreContext.tsx and useStore.ts only.
// ============================================================================
import { createContext } from 'react'
import type { Store } from '../../domain/storage/store'

export const StoreContext = createContext<Store | null>(null)
