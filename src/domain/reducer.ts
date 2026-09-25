// ============================================================================
// src/domain/reducer.ts — `reduce(state, action)`: pure, never throws, never
// mutates (tests deep-freeze the input) and returns the SAME state reference
// for no-ops so the store can skip persisting and notifying (§4.7).
// ============================================================================
import type { Action, ReducerError, TransactionInput } from './actions'
import type { AppData, Budget, Category, ColorKey, Id, Result, Settings, Timestamp, Transaction, TransactionType } from './types'
import { MAX_NOTE_LENGTH } from './types'
import { isLocalDate } from './dates'
import { seedData } from './seed'
import {
  hasCategoryNameCollision,
  isColorKey,
  isCurrencyCode,
  isEmojiChoice,
  isPositiveCents,
  isTheme,
  isTransactionType,
  isWarnRatio,
  normalizeCategoryName,
  wellKnownIdOf,
} from './validate'

type ReduceResult = Result<AppData, ReducerError>

function ok(value: AppData): ReduceResult {
  return { ok: true, value }
}

function fail(error: ReducerError): ReduceResult {
  return { ok: false, error }
}

/**
 * Payload guard for callers that bypass the `Action` type (e.g. a stray
 * `as Action`): the reducer never throws (§4.7), so a null/undefined/primitive
 * payload is rejected with the closest `ReducerError` instead of a TypeError.
 */
function isPayload(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null
}

/** Trimmed note or null when it is not a string within 140 characters. */
function normalizeNote(note: unknown): string | null {
  if (typeof note !== 'string') return null
  const trimmed = note.trim()
  return trimmed.length > MAX_NOTE_LENGTH ? null : trimmed
}

/** Validates a full transaction input against the categories; returns the trimmed note or the error. */
function checkTransactionInput(
  input: TransactionInput,
  categories: readonly Category[],
): { ok: true; note: string } | { ok: false; error: ReducerError } {
  if (!isPayload(input)) return { ok: false, error: 'invalid-amount' }
  if (!isTransactionType(input.type)) return { ok: false, error: 'category-type-mismatch' }
  if (!isPositiveCents(input.amountCents)) return { ok: false, error: 'invalid-amount' }
  if (typeof input.date !== 'string' || !isLocalDate(input.date)) return { ok: false, error: 'invalid-date' }
  const note = normalizeNote(input.note)
  if (note === null) return { ok: false, error: 'invalid-note' }
  const category = categories.find((c) => c.id === input.categoryId)
  if (category === undefined) return { ok: false, error: 'unknown-category' }
  if (category.type !== input.type) return { ok: false, error: 'category-type-mismatch' }
  return { ok: true, note }
}

/** New settings with `lastUsedCategoryId[type] = categoryId`, or the same settings when unchanged. */
function withLastUsed(settings: Settings, type: TransactionType, categoryId: Id | null): Settings {
  if (settings.lastUsedCategoryId[type] === categoryId) return settings
  return { ...settings, lastUsedCategoryId: { ...settings.lastUsedCategoryId, [type]: categoryId } }
}

function sameTransactionFields(a: Transaction, b: TransactionInput): boolean {
  return (
    a.type === b.type &&
    a.amountCents === b.amountCents &&
    a.date === b.date &&
    a.categoryId === b.categoryId &&
    a.note === b.note
  )
}

function addTransaction(state: AppData, id: Id, input: TransactionInput, now: Timestamp): ReduceResult {
  if (typeof id !== 'string' || id.length === 0) return fail('duplicate-id')
  if (state.transactions.some((t) => t.id === id)) return fail('duplicate-id')
  const checked = checkTransactionInput(input, state.categories)
  if (!checked.ok) return fail(checked.error)
  const transaction: Transaction = {
    id,
    type: input.type,
    amountCents: input.amountCents,
    date: input.date,
    categoryId: input.categoryId,
    note: checked.note,
    createdAt: now,
    updatedAt: now,
  }
  return ok({
    ...state,
    transactions: [...state.transactions, transaction],
    settings: withLastUsed(state.settings, input.type, input.categoryId),
  })
}

function updateTransaction(state: AppData, id: Id, patch: Partial<TransactionInput>, now: Timestamp): ReduceResult {
  const existing = state.transactions.find((t) => t.id === id)
  if (existing === undefined) return fail('unknown-transaction')
  if (!isPayload(patch)) return fail('invalid-amount')
  // Only keys explicitly present with a defined value override the stored ones.
  const merged: TransactionInput = {
    type: patch.type ?? existing.type,
    amountCents: patch.amountCents ?? existing.amountCents,
    date: patch.date ?? existing.date,
    categoryId: patch.categoryId ?? existing.categoryId,
    note: patch.note ?? existing.note,
  }
  const checked = checkTransactionInput(merged, state.categories)
  if (!checked.ok) return fail(checked.error)
  merged.note = checked.note
  if (sameTransactionFields(existing, merged)) return ok(state)
  const updated: Transaction = { ...existing, ...merged, updatedAt: now }
  const settings =
    merged.categoryId !== existing.categoryId || merged.type !== existing.type
      ? withLastUsed(state.settings, merged.type, merged.categoryId)
      : state.settings
  return ok({
    ...state,
    transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    settings,
  })
}

function removeTransaction(state: AppData, id: Id): ReduceResult {
  if (!state.transactions.some((t) => t.id === id)) return fail('unknown-transaction')
  return ok({ ...state, transactions: state.transactions.filter((t) => t.id !== id) })
}

function addCategory(
  state: AppData,
  id: Id,
  input: { name: string; type: TransactionType; icon: string; color: ColorKey },
): ReduceResult {
  if (typeof id !== 'string' || id.length === 0) return fail('duplicate-id')
  if (state.categories.some((c) => c.id === id)) return fail('duplicate-id')
  if (!isPayload(input)) return fail('invalid-category-name')
  if (!isTransactionType(input.type)) return fail('category-type-mismatch')
  const name = normalizeCategoryName(input.name)
  if (name === null) return fail('invalid-category-name')
  if (hasCategoryNameCollision(name, input.type, state.categories)) return fail('duplicate-category-name')
  if (!isEmojiChoice(input.icon)) return fail('invalid-icon')
  if (!isColorKey(input.color)) return fail('invalid-color')
  const sortOrder = state.categories
    .filter((c) => c.type === input.type)
    .reduce((acc, c) => Math.max(acc, c.sortOrder), -1) + 1
  const category: Category = {
    id,
    name,
    type: input.type,
    icon: input.icon,
    color: input.color,
    sortOrder,
    builtIn: false,
  }
  return ok({ ...state, categories: [...state.categories, category] })
}

function updateCategory(
  state: AppData,
  id: Id,
  patch: Partial<{ name: string; icon: string; color: ColorKey }>,
): ReduceResult {
  const existing = state.categories.find((c) => c.id === id)
  if (existing === undefined) return fail('unknown-category')
  if (!isPayload(patch)) return fail('invalid-category-name')
  let name = existing.name
  if (patch.name !== undefined) {
    const normalized = normalizeCategoryName(patch.name)
    if (normalized === null) return fail('invalid-category-name')
    if (hasCategoryNameCollision(normalized, existing.type, state.categories, id)) return fail('duplicate-category-name')
    name = normalized
  }
  let icon = existing.icon
  if (patch.icon !== undefined) {
    if (!isEmojiChoice(patch.icon)) return fail('invalid-icon')
    icon = patch.icon
  }
  let color = existing.color
  if (patch.color !== undefined) {
    if (!isColorKey(patch.color)) return fail('invalid-color')
    color = patch.color
  }
  if (name === existing.name && icon === existing.icon && color === existing.color) return ok(state)
  const updated: Category = { ...existing, name, icon, color }
  return ok({ ...state, categories: state.categories.map((c) => (c.id === id ? updated : c)) })
}

function removeCategory(state: AppData, id: Id, now: Timestamp): ReduceResult {
  const existing = state.categories.find((c) => c.id === id)
  if (existing === undefined) return fail('unknown-category')
  if (existing.builtIn) return fail('builtin-category')
  const target = wellKnownIdOf(existing.type)
  const transactions = state.transactions.map((t) =>
    t.categoryId === id ? { ...t, categoryId: target, updatedAt: now } : t,
  )
  // Close the sortOrder gap so the order stays contiguous within the type.
  const categories = state.categories
    .filter((c) => c.id !== id)
    .map((c) => (c.type === existing.type && c.sortOrder > existing.sortOrder ? { ...c, sortOrder: c.sortOrder - 1 } : c))
  const budgets = state.budgets.filter((b) => b.categoryId !== id)
  const settings =
    state.settings.lastUsedCategoryId[existing.type] === id ? withLastUsed(state.settings, existing.type, null) : state.settings
  return ok({ transactions, categories, budgets, settings })
}

function upsertBudget(state: AppData, budget: Budget): ReduceResult {
  if (!isPayload(budget)) return fail('invalid-budget')
  if (typeof budget.id !== 'string' || budget.id.length === 0) return fail('invalid-budget')
  if (!isPositiveCents(budget.limitCents)) return fail('invalid-budget')
  if (budget.categoryId !== null) {
    if (typeof budget.categoryId !== 'string') return fail('invalid-budget')
    const category = state.categories.find((c) => c.id === budget.categoryId)
    if (category === undefined) return fail('unknown-category')
    if (category.type !== 'expense') return fail('budget-on-income-category')
  }
  if (state.budgets.some((b) => b.id !== budget.id && b.categoryId === budget.categoryId)) return fail('duplicate-budget')
  const clean: Budget = { id: budget.id, categoryId: budget.categoryId, limitCents: budget.limitCents }
  const existing = state.budgets.find((b) => b.id === budget.id)
  if (existing !== undefined) {
    if (existing.categoryId === clean.categoryId && existing.limitCents === clean.limitCents) return ok(state)
    return ok({ ...state, budgets: state.budgets.map((b) => (b.id === clean.id ? clean : b)) })
  }
  return ok({ ...state, budgets: [...state.budgets, clean] })
}

function removeBudget(state: AppData, id: Id): ReduceResult {
  // Removing a budget that does not exist is a no-op (there is no `unknown-budget` error in §3.3).
  if (!state.budgets.some((b) => b.id === id)) return ok(state)
  return ok({ ...state, budgets: state.budgets.filter((b) => b.id !== id) })
}

function updateSettings(state: AppData, patch: Partial<Settings>): ReduceResult {
  if (!isPayload(patch)) return fail('invalid-settings')
  const current = state.settings
  const next: Settings = { ...current, lastUsedCategoryId: { ...current.lastUsedCategoryId } }
  let changed = false

  if (patch.currency !== undefined) {
    if (!isCurrencyCode(patch.currency)) return fail('invalid-settings')
    if (patch.currency !== current.currency) {
      next.currency = patch.currency
      changed = true
    }
  }
  if (patch.locale !== undefined && patch.locale !== current.locale) return fail('invalid-settings')
  if (patch.theme !== undefined) {
    if (!isTheme(patch.theme)) return fail('invalid-settings')
    if (patch.theme !== current.theme) {
      next.theme = patch.theme
      changed = true
    }
  }
  if (patch.initialBalanceCents !== undefined) {
    if (!Number.isSafeInteger(patch.initialBalanceCents)) return fail('invalid-settings')
    if (patch.initialBalanceCents !== current.initialBalanceCents) {
      next.initialBalanceCents = patch.initialBalanceCents
      changed = true
    }
  }
  if (patch.budgetWarnRatio !== undefined) {
    if (!isWarnRatio(patch.budgetWarnRatio)) return fail('invalid-settings')
    if (patch.budgetWarnRatio !== current.budgetWarnRatio) {
      next.budgetWarnRatio = patch.budgetWarnRatio
      changed = true
    }
  }
  if (patch.lastUsedCategoryId !== undefined) {
    const lastUsed: unknown = patch.lastUsedCategoryId
    if (typeof lastUsed !== 'object' || lastUsed === null) return fail('invalid-settings')
    for (const type of ['expense', 'income'] as const) {
      if (!(type in lastUsed)) continue
      const value: unknown = (lastUsed as Record<string, unknown>)[type]
      if (value !== null) {
        const category = typeof value === 'string' ? state.categories.find((c) => c.id === value) : undefined
        if (category === undefined || category.type !== type) return fail('invalid-settings')
      }
      const id = value as Id | null
      if (id !== current.lastUsedCategoryId[type]) {
        next.lastUsedCategoryId[type] = id
        changed = true
      }
    }
  }

  if (!changed) return ok(state)
  return ok({ ...state, settings: next })
}

/** Pure reducer over the domain state (§4.7). */
export function reduce(state: AppData, action: Action): ReduceResult {
  switch (action.type) {
    case 'transaction/add':
      return addTransaction(state, action.id, action.input, action.now)
    case 'transaction/update':
      return updateTransaction(state, action.id, action.patch, action.now)
    case 'transaction/remove':
      return removeTransaction(state, action.id)
    case 'category/add':
      return addCategory(state, action.id, action.input)
    case 'category/update':
      return updateCategory(state, action.id, action.patch)
    case 'category/remove':
      return removeCategory(state, action.id, action.now)
    case 'budget/upsert':
      return upsertBudget(state, action.budget)
    case 'budget/remove':
      return removeBudget(state, action.id)
    case 'settings/update':
      return updateSettings(state, action.patch)
    case 'data/replace':
      return ok(action.data)
    case 'data/reset':
      return ok(seedData(action.now))
    default: {
      const unreachable: never = action
      return unreachable
    }
  }
}
