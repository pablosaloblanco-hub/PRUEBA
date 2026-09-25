// ============================================================================
// src/ui/state/uiReducer.test.ts — §10.1 last row: nav resets filters and sets
// previousScreen, month/shift crosses years and stays within MIN/MAX, a
// sheet/open with a sheet already open is ignored, toasts replace each other.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { MAX_MONTH, MIN_MONTH } from '../../domain/types'
import { EMPTY_FILTER, initialUiState, isMonthlyScreen, NO_SHEET, uiReducer } from './uiReducer'
import type { UiState } from './uiReducer'

const base = (): UiState => initialUiState('2026-09-25')

describe('uiReducer', () => {
  it('starts on home with the month of today, no sheet, empty filter and no toast', () => {
    expect(base()).toEqual({
      screen: 'home',
      previousScreen: null,
      month: '2026-09',
      sheet: NO_SHEET,
      filter: EMPTY_FILTER,
      toast: null,
    })
    expect(initialUiState('2026-09-25', { screen: 'settings' }).screen).toBe('settings')
  })

  describe('nav', () => {
    it('sets previousScreen, resets the filter and applies the given filter', () => {
      const filtered = uiReducer(base(), { type: 'filter/set', patch: { query: 'cafe', type: 'expense' } })
      const next = uiReducer(filtered, { type: 'nav', screen: 'transactions', filter: { categoryId: 'cat-ocio' } })
      expect(next.screen).toBe('transactions')
      expect(next.previousScreen).toBe('home')
      expect(next.filter).toEqual({ query: '', type: 'all', categoryId: 'cat-ocio' })
    })

    it('resets the filter without a filter payload and keeps previousScreen when the screen does not change', () => {
      const s1 = uiReducer(base(), { type: 'nav', screen: 'settings' })
      const s2 = uiReducer(uiReducer(s1, { type: 'filter/set', patch: { query: 'x' } }), { type: 'nav', screen: 'settings' })
      expect(s2.previousScreen).toBe('home')
      expect(s2.filter).toEqual(EMPTY_FILTER)
      const s3 = uiReducer(s2, { type: 'nav', screen: 'categories' })
      expect(s3.previousScreen).toBe('settings')
    })
  })

  describe('month', () => {
    it('month/shift crosses years in both directions', () => {
      const dec = { ...base(), month: '2025-12' }
      expect(uiReducer(dec, { type: 'month/shift', delta: 1 }).month).toBe('2026-01')
      const jan = { ...base(), month: '2026-01' }
      expect(uiReducer(jan, { type: 'month/shift', delta: -1 }).month).toBe('2025-12')
    })

    it('month/shift never leaves MIN_MONTH..MAX_MONTH and returns the same state at the edge', () => {
      const atMin = { ...base(), month: MIN_MONTH }
      expect(uiReducer(atMin, { type: 'month/shift', delta: -1 })).toBe(atMin)
      expect(uiReducer(atMin, { type: 'month/shift', delta: 1 }).month).toBe('2000-02')
      const atMax = { ...base(), month: MAX_MONTH }
      expect(uiReducer(atMax, { type: 'month/shift', delta: 1 })).toBe(atMax)
      expect(uiReducer(atMax, { type: 'month/shift', delta: -1 }).month).toBe('2099-11')
    })

    it('month/set replaces the month (same month → same state)', () => {
      const s = base()
      expect(uiReducer(s, { type: 'month/set', month: '2026-03' }).month).toBe('2026-03')
      expect(uiReducer(s, { type: 'month/set', month: '2026-09' })).toBe(s)
    })

    it('knows which screens are monthly', () => {
      expect(isMonthlyScreen('home')).toBe(true)
      expect(isMonthlyScreen('reports')).toBe(true)
      expect(isMonthlyScreen('settings')).toBe(false)
      expect(isMonthlyScreen('categories')).toBe(false)
    })
  })

  describe('sheet', () => {
    it('opens a sheet and ignores sheet/open while one is open', () => {
      const open = uiReducer(base(), { type: 'sheet/open', sheet: { kind: 'transaction/new' } })
      expect(open.sheet).toEqual({ kind: 'transaction/new' })
      const again = uiReducer(open, { type: 'sheet/open', sheet: { kind: 'budget/new' } })
      expect(again).toBe(open)
    })

    it('closes the sheet (no-op when none is open)', () => {
      const s = base()
      expect(uiReducer(s, { type: 'sheet/close' })).toBe(s)
      const open = uiReducer(s, { type: 'sheet/open', sheet: { kind: 'category/new', type: 'income' } })
      expect(uiReducer(open, { type: 'sheet/close' }).sheet).toEqual(NO_SHEET)
    })
  })

  describe('filter', () => {
    it('merges patches and clears', () => {
      const s1 = uiReducer(base(), { type: 'filter/set', patch: { query: 'a' } })
      const s2 = uiReducer(s1, { type: 'filter/set', patch: { type: 'income' } })
      expect(s2.filter).toEqual({ query: 'a', type: 'income', categoryId: null })
      expect(uiReducer(s2, { type: 'filter/clear' }).filter).toEqual(EMPTY_FILTER)
    })
  })

  describe('toast', () => {
    it('replaces the current toast and only hides the matching id', () => {
      const s1 = uiReducer(base(), { type: 'toast/show', message: 'Gasto guardado', id: 1 })
      const s2 = uiReducer(s1, { type: 'toast/show', message: 'Ingreso guardado', id: 2 })
      expect(s2.toast).toEqual({ id: 2, message: 'Ingreso guardado' })
      expect(uiReducer(s2, { type: 'toast/hide', id: 1 })).toBe(s2)
      expect(uiReducer(s2, { type: 'toast/hide', id: 2 }).toast).toBeNull()
    })
  })
})
