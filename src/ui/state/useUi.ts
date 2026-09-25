// ============================================================================
// src/ui/state/useUi.ts — hooks over the UI contexts: useUi(), useUiDispatch(),
// useToday() and useUiActions() (openSheet / closeSheet / nav / showToast …).
// ============================================================================
import { useContext, useMemo } from 'react'
import type { Dispatch } from 'react'
import type { LocalDate } from '../../domain/types'
import { TodayContext, UiDispatchContext, UiStateContext } from './uiContext'
import type { Screen, Sheet, UiAction, UiFilter, UiState } from './uiReducer'

let nextToastId = 1

export function useUi(): UiState {
  const state = useContext(UiStateContext)
  if (state === null) throw new Error('useUi must be used inside <UiProvider>')
  return state
}

export function useUiDispatch(): Dispatch<UiAction> {
  const dispatch = useContext(UiDispatchContext)
  if (dispatch === null) throw new Error('useUiDispatch must be used inside <UiProvider>')
  return dispatch
}

/** Today's local date from the injected clock (fixed in tests, real in the app). */
export function useToday(): LocalDate {
  const today = useContext(TodayContext)
  if (today === null) throw new Error('useToday must be used inside <UiProvider>')
  return today()
}

export type UiActions = {
  openSheet: (sheet: Sheet) => void
  closeSheet: () => void
  nav: (screen: Screen, filter?: Partial<UiFilter>) => void
  /** Replaces the current toast (one at a time) and returns the new toast id. */
  showToast: (message: string) => number
  setMonth: (month: string) => void
  shiftMonth: (delta: -1 | 1) => void
  setFilter: (patch: Partial<UiFilter>) => void
  clearFilter: () => void
}

/** Stable helpers around `useUiDispatch()`; safe to put in effect dependency lists. */
export function useUiActions(): UiActions {
  const dispatch = useUiDispatch()
  return useMemo<UiActions>(
    () => ({
      openSheet: (sheet) => dispatch({ type: 'sheet/open', sheet }),
      closeSheet: () => dispatch({ type: 'sheet/close' }),
      nav: (screen, filter) => dispatch(filter === undefined ? { type: 'nav', screen } : { type: 'nav', screen, filter }),
      showToast: (message) => {
        const id = nextToastId++
        dispatch({ type: 'toast/show', message, id })
        return id
      },
      setMonth: (month) => dispatch({ type: 'month/set', month }),
      shiftMonth: (delta) => dispatch({ type: 'month/shift', delta }),
      setFilter: (patch) => dispatch({ type: 'filter/set', patch }),
      clearFilter: () => dispatch({ type: 'filter/clear' }),
    }),
    [dispatch],
  )
}
