// ============================================================================
// src/ui/state/UiContext.tsx — <UiProvider today>: useReducer(uiReducer) plus
// the 4 s toast timer (§7.0). Only exports the component.
// ============================================================================
import { useEffect, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { LocalDate } from '../../domain/types'
import { TodayContext, UiDispatchContext, UiStateContext } from './uiContext'
import { initialUiState, uiReducer } from './uiReducer'
import type { UiState } from './uiReducer'

export const TOAST_DURATION_MS = 4000

type UiProviderProps = {
  today: () => LocalDate
  /** Test-only: start on another screen/month/sheet (renderApp({ ui })). */
  initialState?: Partial<UiState>
  children: ReactNode
}

export function UiProvider({ today, initialState, children }: UiProviderProps) {
  const [state, dispatch] = useReducer(uiReducer, undefined, () => initialUiState(today(), initialState))
  const toastId = state.toast?.id ?? null

  useEffect(() => {
    if (toastId === null) return
    const timer = setTimeout(() => dispatch({ type: 'toast/hide', id: toastId }), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [toastId])

  return (
    <TodayContext.Provider value={today}>
      <UiStateContext.Provider value={state}>
        <UiDispatchContext.Provider value={dispatch}>{children}</UiDispatchContext.Provider>
      </UiStateContext.Provider>
    </TodayContext.Provider>
  )
}
