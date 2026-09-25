// ============================================================================
// src/ui/state/useStore.ts — React subscription to the external store (§5.6):
// useStore(), useAppData(), usePersistence(), useDispatch().
// ============================================================================
import { useContext, useSyncExternalStore } from 'react'
import type { PersistenceStatus, Store } from '../../domain/storage/store'
import type { AppData } from '../../domain/types'
import { StoreContext } from './storeContext'

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (store === null) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

/** The domain snapshot; same reference until a dispatch changes the state. Derive with useMemo over it. */
export function useAppData(): AppData {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export function usePersistence(): PersistenceStatus {
  const store = useStore()
  return useSyncExternalStore(store.subscribe, store.getPersistence, store.getPersistence)
}

/** `store.dispatch`: reduce → save → notify; returns the reducer Result (check `ok` for inline errors). */
export function useDispatch(): Store['dispatch'] {
  return useStore().dispatch
}
