// ============================================================================
// src/ui/state/uiContext.ts — React contexts for the UI state (§3.6). Imported
// by UiContext.tsx (provider) and useUi.ts (hooks); nothing else touches them.
// ============================================================================
import { createContext } from 'react'
import type { Dispatch } from 'react'
import type { LocalDate } from '../../domain/types'
import type { UiAction, UiState } from './uiReducer'

export const UiStateContext = createContext<UiState | null>(null)
export const UiDispatchContext = createContext<Dispatch<UiAction> | null>(null)
/** Injected clock (`today`) so «Hoy» and the initial month are deterministic in tests. */
export const TodayContext = createContext<(() => LocalDate) | null>(null)
