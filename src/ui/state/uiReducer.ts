// ============================================================================
// src/ui/state/uiReducer.ts — non-persisted UI state (docs/SPEC.md §3.6):
// current screen, shared month, the single sheet slot, transaction filters and
// the toast. Pure reducer; no React.
// ============================================================================
import { addMonths } from '../../domain/dates'
import type { TransactionFilter } from '../../domain/queries'
import type { Id, LocalDate, MonthKey, TransactionType } from '../../domain/types'
import { MAX_MONTH, MIN_MONTH } from '../../domain/types'

export const Screen = {
  home: 'home',
  transactions: 'transactions',
  budgets: 'budgets',
  reports: 'reports',
  categories: 'categories',
  settings: 'settings',
} as const
export type Screen = (typeof Screen)[keyof typeof Screen]

export type Sheet =
  | { kind: 'none' }
  | { kind: 'transaction/new'; presetType?: TransactionType }
  | { kind: 'transaction/edit'; id: Id }
  | { kind: 'budget/new'; presetCategoryId?: Id | null }
  | { kind: 'budget/edit'; id: Id }
  | { kind: 'category/new'; type: TransactionType }
  | { kind: 'category/edit'; id: Id }

export type Toast = { id: number; message: string } | null

export type UiFilter = Omit<TransactionFilter, 'month'>

export type UiState = {
  screen: Screen
  /** Screen the current one was reached from (set by `nav`); null at startup. Used by «Volver» (§7.0). */
  previousScreen: Screen | null
  month: MonthKey
  /** Single slot: `sheet/open` while a sheet is open is ignored (a sheet stack is P1-15). */
  sheet: Sheet
  filter: UiFilter
  toast: Toast
}

export type UiAction =
  /**
   * Sets `previousScreen = state.screen` (when the screen changes; moving between Ajustes and
   * Categorías keeps it, see `navPreviousScreen`), resets `filter` and applies `filter` when given.
   */
  | { type: 'nav'; screen: Screen; filter?: Partial<UiFilter> }
  | { type: 'month/set'; month: MonthKey }
  /** Clamped to MIN_MONTH..MAX_MONTH (§3.1); at the edge the same state is returned. */
  | { type: 'month/shift'; delta: -1 | 1 }
  | { type: 'sheet/open'; sheet: Sheet }
  | { type: 'sheet/close' }
  | { type: 'filter/set'; patch: Partial<UiFilter> }
  | { type: 'filter/clear' }
  | { type: 'toast/show'; message: string; id: number }
  | { type: 'toast/hide'; id: number }

export const NO_SHEET: Sheet = { kind: 'none' }
export const EMPTY_FILTER: UiFilter = { query: '', type: 'all', categoryId: null }

/** Screens governed by the shared month selector (§1, §7.0). */
export const MONTHLY_SCREENS: readonly Screen[] = ['home', 'transactions', 'budgets', 'reports']
export function isMonthlyScreen(screen: Screen): boolean {
  return MONTHLY_SCREENS.includes(screen)
}

export function initialUiState(today: LocalDate, overrides: Partial<UiState> = {}): UiState {
  return {
    screen: 'home',
    previousScreen: null,
    month: today.slice(0, 7),
    sheet: NO_SHEET,
    filter: EMPTY_FILTER,
    toast: null,
    ...overrides,
  }
}

/**
 * `previousScreen` after navigating to `target`: the screen being left, except
 * when the screen does not change, and except between Ajustes and Categorías.
 * Categorías is a sub-screen of Ajustes (§7.0: its «Volver» always goes to
 * Ajustes), so hopping between the two keeps the screen that originally led
 * into Ajustes; otherwise «Volver» on Ajustes would ping-pong back to Categorías.
 */
function navPreviousScreen(state: UiState, target: Screen): Screen | null {
  if (target === state.screen) return state.previousScreen
  const settingsPair = (a: Screen, b: Screen) => a === 'settings' && b === 'categories'
  if (settingsPair(state.screen, target) || settingsPair(target, state.screen)) return state.previousScreen
  return state.screen
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'nav': {
      const previousScreen = navPreviousScreen(state, action.screen)
      return {
        ...state,
        screen: action.screen,
        previousScreen,
        filter: { ...EMPTY_FILTER, ...action.filter },
      }
    }
    case 'month/set':
      return state.month === action.month ? state : { ...state, month: action.month }
    case 'month/shift': {
      const next = addMonths(state.month, action.delta)
      if (next < MIN_MONTH || next > MAX_MONTH) return state
      return { ...state, month: next }
    }
    case 'sheet/open':
      return state.sheet.kind === 'none' ? { ...state, sheet: action.sheet } : state
    case 'sheet/close':
      return state.sheet.kind === 'none' ? state : { ...state, sheet: NO_SHEET }
    case 'filter/set':
      return { ...state, filter: { ...state.filter, ...action.patch } }
    case 'filter/clear':
      return { ...state, filter: EMPTY_FILTER }
    case 'toast/show':
      return { ...state, toast: { id: action.id, message: action.message } }
    case 'toast/hide':
      return state.toast !== null && state.toast.id === action.id ? { ...state, toast: null } : state
  }
}
