// ============================================================================
// src/domain/validate.ts — form validators (§4.4), `validateAppData` (the
// «Normalización vs rechazo» table) and `assertInvariants`. Pure TypeScript:
// no React, no DOM, and it never reads the clock (timestamps it cannot trust
// become 0; `jsonio` is the only place that may use Date.now()).
// ============================================================================
import type { AppData, Budget, Category, Cents, Id, LocalDate, Result, Settings, Transaction } from './types'
import {
  ColorKey,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_CENTS,
  MAX_NOTE_LENGTH,
  Theme,
  TransactionType,
  WELL_KNOWN_IDS,
} from './types'
import type { TransactionInput } from './actions'
import type { AmountParseError } from './money'
import { isCents, parseAmount } from './money'
import { isLocalDate } from './dates'
import { normalizeText } from './text'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, EMOJI_CHOICES } from './seed'

// ----------------------------------------------------------------------------
// Messages (§4.4). `src/ui/copy.ts` mirrors them; the domain owns the source of
// truth so validators can be tested without the UI.
// ----------------------------------------------------------------------------

export const VALIDATION_MESSAGES = {
  amountEmptyOrZero: 'Introduce un importe mayor que 0',
  amountTooManyDecimals: 'Máximo dos decimales',
  amountInvalid: 'Importe no válido. Ejemplos: 12,50 · 1.234,56',
  amountTooLarge: 'Importe demasiado grande (máx. 999.999.999,99)',
  amountNegative: 'El importe no puede ser negativo',
  dateInvalid: 'Fecha no válida',
  categoryRequired: 'Elige una categoría',
  noteTooLong: 'La nota no puede superar 140 caracteres',
  categoryNameRequired: 'El nombre es obligatorio',
  categoryNameDuplicate: 'Ya existe una categoría con ese nombre',
  categoryNameTooLong: 'Máximo 30 caracteres',
  budgetDuplicate: 'Ya existe un presupuesto para esta categoría',
} as const

/** Outcome of a single form field: the normalized value or a Spanish message. */
export type FieldResult<T> = { ok: true; value: T } | { ok: false; message: string }

function fieldOk<T>(value: T): FieldResult<T> {
  return { ok: true, value }
}

function fieldFail<T>(message: string): FieldResult<T> {
  return { ok: false, message }
}

// ----------------------------------------------------------------------------
// Shared guards (also used by the reducer).
// ----------------------------------------------------------------------------

export function isTransactionType(x: unknown): x is TransactionType {
  return x === TransactionType.expense || x === TransactionType.income
}

export function isColorKey(x: unknown): x is ColorKey {
  return typeof x === 'string' && (Object.values(ColorKey) as readonly string[]).includes(x)
}

export function isEmojiChoice(x: unknown): x is string {
  return typeof x === 'string' && (EMOJI_CHOICES as readonly string[]).includes(x)
}

export function isTheme(x: unknown): x is Theme {
  return typeof x === 'string' && (Object.values(Theme) as readonly string[]).includes(x)
}

/**
 * Three upper-case letters (ISO 4217 shape); membership in SUPPORTED_CURRENCIES
 * is not required (§3.1). Deliberately stricter than the literal «3 letras» of
 * §4.4/§4.7: the stored code is canonical upper case (the only form the app
 * writes and the §4.1 grammar accepts), so a lower-case code from an import is
 * treated as unknown and reset to EUR with a warning.
 */
export function isCurrencyCode(x: unknown): x is string {
  return typeof x === 'string' && /^[A-Z]{3}$/.test(x)
}

/** Strictly inside (0, 1). */
export function isWarnRatio(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 && x < 1
}

/** Integer 1..MAX_CENTS (transaction amounts and budget limits). */
export function isPositiveCents(x: unknown): x is Cents {
  return isCents(x) && x >= 1 && x <= MAX_CENTS
}

/** Id of the non-deletable category of a type («Otros gastos» / «Otros ingresos»). */
export function wellKnownIdOf(type: TransactionType): Id {
  return type === TransactionType.expense ? WELL_KNOWN_IDS.otherExpense : WELL_KNOWN_IDS.otherIncome
}

/** Category name as stored: trimmed. Returns null when it is not a valid 1..30 name. */
export function normalizeCategoryName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_CATEGORY_NAME_LENGTH) return null
  return trimmed
}

/** Whether `name` (already trimmed) collides with another category of `type`, ignoring case and accents. */
export function hasCategoryNameCollision(
  name: string,
  type: TransactionType,
  categories: readonly Category[],
  selfId?: Id,
): boolean {
  const key = normalizeText(name)
  return categories.some((c) => c.type === type && c.id !== selfId && normalizeText(c.name) === key)
}

// ----------------------------------------------------------------------------
// Form validators (§4.4)
// ----------------------------------------------------------------------------

/** Maps a `parseAmount` error to its §4.4 message. */
export function amountErrorMessage(error: AmountParseError): string {
  switch (error) {
    case 'empty':
    case 'zero':
      return VALIDATION_MESSAGES.amountEmptyOrZero
    case 'too-many-decimals':
      return VALIDATION_MESSAGES.amountTooManyDecimals
    case 'invalid':
      return VALIDATION_MESSAGES.amountInvalid
    case 'too-large':
      return VALIDATION_MESSAGES.amountTooLarge
    case 'negative':
      return VALIDATION_MESSAGES.amountNegative
    default: {
      const unreachable: never = error
      return unreachable
    }
  }
}

/** Amount of a transaction or a budget limit: `parseAmount` with defaults (> 0). */
export function validateAmountInput(
  text: string,
  opts?: { allowZero?: boolean; allowNegative?: boolean },
): FieldResult<Cents> {
  const parsed = parseAmount(text, opts)
  return parsed.ok ? fieldOk(parsed.value) : fieldFail(amountErrorMessage(parsed.error))
}

/** Initial balance: zero and negatives allowed. */
export function validateInitialBalanceInput(text: string): FieldResult<Cents> {
  return validateAmountInput(text, { allowZero: true, allowNegative: true })
}

export function validateDate(text: string): FieldResult<LocalDate> {
  return isLocalDate(text) ? fieldOk(text) : fieldFail(VALIDATION_MESSAGES.dateInvalid)
}

/** Category of a transaction: must exist and be of the same type. */
export function validateCategoryChoice(
  categoryId: Id | null | undefined,
  type: TransactionType,
  categories: readonly Category[],
): FieldResult<Category> {
  const category = categoryId === null || categoryId === undefined ? undefined : categories.find((c) => c.id === categoryId)
  if (category === undefined || category.type !== type) return fieldFail(VALIDATION_MESSAGES.categoryRequired)
  return fieldOk(category)
}

/** Note: trimmed, at most 140 characters ('' allowed). */
export function validateNote(text: string): FieldResult<string> {
  const note = text.trim()
  return note.length > MAX_NOTE_LENGTH ? fieldFail(VALIDATION_MESSAGES.noteTooLong) : fieldOk(note)
}

/** Category name: trimmed, 1..30, unique within the type (`normalizeText`); `selfId` allows renaming to itself. */
export function validateCategoryName(
  name: string,
  type: TransactionType,
  categories: readonly Category[],
  selfId?: Id,
): FieldResult<string> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return fieldFail(VALIDATION_MESSAGES.categoryNameRequired)
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) return fieldFail(VALIDATION_MESSAGES.categoryNameTooLong)
  if (hasCategoryNameCollision(trimmed, type, categories, selfId)) {
    return fieldFail(VALIDATION_MESSAGES.categoryNameDuplicate)
  }
  return fieldOk(trimmed)
}

/** Budget category: `null` (monthly total) or an existing expense category, without another budget on it. */
export function validateBudgetCategory(
  categoryId: Id | null,
  categories: readonly Category[],
  budgets: readonly Budget[],
  selfId?: Id,
): FieldResult<Id | null> {
  if (categoryId !== null) {
    const category = categories.find((c) => c.id === categoryId)
    if (category === undefined || category.type !== TransactionType.expense) {
      return fieldFail(VALIDATION_MESSAGES.categoryRequired)
    }
  }
  if (budgets.some((b) => b.categoryId === categoryId && b.id !== selfId)) {
    return fieldFail(VALIDATION_MESSAGES.budgetDuplicate)
  }
  return fieldOk(categoryId)
}

export type BudgetFormErrors = { category?: string; limit?: string }

/** Whole budget sheet: category + limit text. Errors are per field. */
export function validateBudgetInput(
  input: { categoryId: Id | null; limitText: string },
  data: { categories: readonly Category[]; budgets: readonly Budget[] },
  selfId?: Id,
): { ok: true; value: { categoryId: Id | null; limitCents: Cents } } | { ok: false; errors: BudgetFormErrors } {
  const errors: BudgetFormErrors = {}
  const category = validateBudgetCategory(input.categoryId, data.categories, data.budgets, selfId)
  if (!category.ok) errors.category = category.message
  const limit = validateAmountInput(input.limitText)
  if (!limit.ok) errors.limit = limit.message
  if (!category.ok || !limit.ok) return { ok: false, errors }
  return { ok: true, value: { categoryId: category.value, limitCents: limit.value } }
}

export type TransactionFormErrors = { amount?: string; date?: string; category?: string; note?: string }

/** Whole transaction sheet. Errors are per field so each one can sit under its input. */
export function validateTransactionForm(
  form: { type: TransactionType; amountText: string; date: string; categoryId: Id | null; note: string },
  categories: readonly Category[],
): { ok: true; value: TransactionInput } | { ok: false; errors: TransactionFormErrors } {
  const errors: TransactionFormErrors = {}
  const amount = validateAmountInput(form.amountText)
  if (!amount.ok) errors.amount = amount.message
  const date = validateDate(form.date)
  if (!date.ok) errors.date = date.message
  const category = validateCategoryChoice(form.categoryId, form.type, categories)
  if (!category.ok) errors.category = category.message
  const note = validateNote(form.note)
  if (!note.ok) errors.note = note.message
  if (!amount.ok || !date.ok || !category.ok || !note.ok) return { ok: false, errors }
  return {
    ok: true,
    value: { type: form.type, amountCents: amount.value, date: date.value, categoryId: category.value.id, note: note.value },
  }
}

// ----------------------------------------------------------------------------
// validateAppData (§4.4 «Normalización vs rechazo»)
// ----------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>

function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0
}

const TYPES: readonly TransactionType[] = [TransactionType.expense, TransactionType.income]

const OTHER_LABEL: Record<TransactionType, string> = { expense: 'Otros gastos', income: 'Otros ingresos' }
const TYPE_LABEL: Record<TransactionType, string> = { expense: 'gasto', income: 'ingreso' }

export type ValidatedData = { data: AppData; warnings: string[] }

function reject(detail: string): Result<ValidatedData, string> {
  return { ok: false, error: detail }
}

/** Every element must be an object with a non-empty string id, unique within the collection. Returns the rejection detail. */
function checkCollection(items: unknown[], name: string): string | null {
  const seen = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!isRecord(item)) return `${name}[${i}] is not an object`
    const id = item.id
    if (!isNonEmptyString(id)) return `${name}[${i}].id is not a non-empty string`
    if (seen.has(id)) return `duplicate id "${id}" in ${name}`
    seen.add(id)
  }
  return null
}

const HIGH_SURROGATE_MIN = 0xd800
const HIGH_SURROGATE_MAX = 0xdbff

/**
 * First `max` UTF-16 code units of `s` (the unit `length` and the form
 * validators count), trimmed, never ending in a lone high surrogate: a cut
 * inside an astral character (emoji) drops that character instead of leaving
 * an ill-formed string behind.
 */
function truncate(s: string, max: number): string {
  let out = s.slice(0, max)
  const last = out.charCodeAt(out.length - 1)
  if (last >= HIGH_SURROGATE_MIN && last <= HIGH_SURROGATE_MAX) out = out.slice(0, -1)
  return out.trim()
}

/** Truncates `base` so that `base + suffix` fits in MAX_CATEGORY_NAME_LENGTH. */
function withSuffix(base: string, suffix: string): string {
  return truncate(base, MAX_CATEGORY_NAME_LENGTH - suffix.length) + suffix
}

function normalizeCategories(raw: readonly UnknownRecord[], warnings: string[]): Category[] {
  const out: Category[] = []
  let unnamed = 0

  for (const c of raw) {
    const id = c.id as string
    if (!isTransactionType(c.type)) {
      warnings.push(`La categoría «${id}» tiene un tipo desconocido y se ha descartado`)
      continue
    }
    const type = c.type

    let name: string
    const rawName = typeof c.name === 'string' ? c.name.trim() : ''
    if (rawName.length === 0) {
      unnamed++
      name = `Categoría ${unnamed}`
      warnings.push(`La categoría «${id}» no tenía nombre y se ha llamado «${name}»`)
    } else if (rawName.length > MAX_CATEGORY_NAME_LENGTH) {
      name = truncate(rawName, MAX_CATEGORY_NAME_LENGTH)
      warnings.push(`El nombre de la categoría «${name}» superaba los ${MAX_CATEGORY_NAME_LENGTH} caracteres y se ha recortado`)
    } else {
      name = rawName
    }

    let icon: string
    if (isEmojiChoice(c.icon)) {
      icon = c.icon
    } else {
      icon = '📦'
      warnings.push(`El icono de la categoría «${name}» no está en la lista y se ha cambiado a 📦`)
    }

    let color: ColorKey
    if (isColorKey(c.color)) {
      color = c.color
    } else {
      color = ColorKey.gray
      warnings.push(`El color de la categoría «${name}» no es válido y se ha cambiado a gris`)
    }

    let builtIn: boolean
    if (typeof c.builtIn === 'boolean') {
      builtIn = c.builtIn
    } else {
      builtIn = false
      warnings.push(`El campo builtIn de la categoría «${name}» no era válido y se ha puesto a false`)
    }

    // Invalid sortOrders are marked NaN and renumbered below.
    const sortOrder = Number.isSafeInteger(c.sortOrder) ? (c.sortOrder as number) : Number.NaN
    out.push({ id, name, type, icon, color, sortOrder, builtIn })
  }

  // Exactly one builtIn per type, and it carries the well-known id. The well-known
  // category is pinned to its type first so a mislabelled one is not demoted and re-promoted.
  for (const type of TYPES) {
    const known = out.find((c) => c.id === wellKnownIdOf(type))
    if (known !== undefined && known.type !== type) {
      known.type = type
      warnings.push(`La categoría «${known.name}» es la de «${OTHER_LABEL[type]}» y se ha devuelto al tipo ${TYPE_LABEL[type]}`)
    }
  }
  for (const c of out) {
    if (c.builtIn && c.id !== wellKnownIdOf(c.type)) {
      c.builtIn = false
      warnings.push(`La categoría «${c.name}» no puede ser builtIn y se ha marcado como normal`)
    }
  }
  for (const type of TYPES) {
    const wellKnownId = wellKnownIdOf(type)
    const known = out.find((c) => c.id === wellKnownId)
    if (known !== undefined) {
      if (!known.builtIn) {
        known.builtIn = true
        warnings.push(`La categoría «${known.name}» se ha marcado como builtIn`)
      }
      continue
    }
    const template = DEFAULT_CATEGORIES.find((c) => c.id === wellKnownId)
    if (template === undefined) continue // unreachable: the seed always has both
    const maxOrder = out
      .filter((c) => c.type === type && Number.isSafeInteger(c.sortOrder))
      .reduce((acc, c) => Math.max(acc, c.sortOrder), -1)
    out.push({ ...template, sortOrder: maxOrder + 1 })
    warnings.push(`Se ha recreado la categoría «${template.name}»`)
  }

  // Unique names per type (case- and accent-insensitive): later ones get « (2)», « (3)»…
  for (const type of TYPES) {
    const seen = new Set<string>()
    for (const c of out) {
      if (c.type !== type) continue
      let key = normalizeText(c.name)
      if (seen.has(key)) {
        const base = c.name
        let n = 2
        let candidate = withSuffix(base, ` (${n})`)
        while (seen.has(normalizeText(candidate))) {
          n++
          candidate = withSuffix(base, ` (${n})`)
        }
        warnings.push(`La categoría «${base}» se ha renombrado a «${candidate}» porque ya existía otra con ese nombre`)
        c.name = candidate
        key = normalizeText(candidate)
      }
      seen.add(key)
    }
  }

  // sortOrder contiguous from 0 within each type. Non-integer or duplicated values are
  // renumbered by order of appearance (with a warning, §4.4); valid unique values with
  // gaps (e.g. after a discarded category) keep their relative order and are closed silently.
  for (const type of TYPES) {
    const group = out.filter((c) => c.type === type)
    const orders = group.map((c) => c.sortOrder)
    const allValid = orders.every((o) => Number.isSafeInteger(o)) && new Set(orders).size === orders.length
    if (allValid) {
      const sorted = [...orders].sort((a, b) => a - b)
      if (sorted.every((v, i) => v === i)) continue
      const rank = new Map(sorted.map((v, i) => [v, i] as const))
      for (const c of group) c.sortOrder = rank.get(c.sortOrder) ?? 0
    } else {
      group.forEach((c, i) => {
        c.sortOrder = i
      })
      warnings.push(`Se ha renumerado el orden de las categorías de ${TYPE_LABEL[type]}`)
    }
  }

  return out
}

function normalizeTransactions(
  raw: readonly UnknownRecord[],
  categories: readonly Category[],
  warnings: string[],
): Result<Transaction[], string> {
  const byId = new Map(categories.map((c) => [c.id, c] as const))
  const out: Transaction[] = []

  for (let i = 0; i < raw.length; i++) {
    const t = raw[i] as UnknownRecord
    const id = t.id as string
    if (!isTransactionType(t.type)) return { ok: false, error: `transactions[${i}].type is unknown` }
    const type = t.type
    if (!isPositiveCents(t.amountCents)) {
      return { ok: false, error: `transactions[${i}].amountCents is not an integer between 1 and ${MAX_CENTS}` }
    }
    if (typeof t.date !== 'string' || !isLocalDate(t.date)) {
      return { ok: false, error: `transactions[${i}].date is not a valid local date` }
    }
    if (typeof t.categoryId !== 'string') return { ok: false, error: `transactions[${i}].categoryId is not a string` }

    let categoryId = t.categoryId
    const category = byId.get(categoryId)
    if (category === undefined || category.type !== type) {
      categoryId = wellKnownIdOf(type)
      warnings.push(`El movimiento «${id}» tenía una categoría inexistente o de otro tipo y se ha movido a «${OTHER_LABEL[type]}»`)
    }

    let note: string
    if (typeof t.note !== 'string') {
      note = ''
      warnings.push(`La nota del movimiento «${id}» no era válida y se ha vaciado`)
    } else {
      note = t.note.trim()
      if (note.length > MAX_NOTE_LENGTH) {
        note = truncate(note, MAX_NOTE_LENGTH)
        warnings.push(`La nota del movimiento «${id}» superaba los ${MAX_NOTE_LENGTH} caracteres y se ha recortado`)
      }
    }

    let createdAt: number
    if (Number.isSafeInteger(t.createdAt)) {
      createdAt = t.createdAt as number
    } else {
      createdAt = 0
      warnings.push(`La fecha de creación del movimiento «${id}» no era válida y se ha puesto a 0`)
    }
    let updatedAt: number
    if (Number.isSafeInteger(t.updatedAt)) {
      updatedAt = t.updatedAt as number
    } else {
      updatedAt = 0
      warnings.push(`La fecha de modificación del movimiento «${id}» no era válida y se ha puesto a 0`)
    }

    out.push({ id, type, amountCents: t.amountCents, date: t.date, categoryId, note, createdAt, updatedAt })
  }
  return { ok: true, value: out }
}

function normalizeBudgets(raw: readonly UnknownRecord[], categories: readonly Category[], warnings: string[]): Budget[] {
  const byId = new Map(categories.map((c) => [c.id, c] as const))
  const seen = new Set<Id | null>()
  const out: Budget[] = []

  for (const b of raw) {
    const id = b.id as string
    let categoryId: Id | null
    if (b.categoryId === null) {
      categoryId = null
    } else if (typeof b.categoryId === 'string' && byId.get(b.categoryId)?.type === TransactionType.expense) {
      categoryId = b.categoryId
    } else {
      warnings.push(`El presupuesto «${id}» se ha descartado porque su categoría no existe o no es de gasto`)
      continue
    }
    if (!isPositiveCents(b.limitCents)) {
      warnings.push(`El presupuesto «${id}» se ha descartado porque su límite no es un importe entero mayor que 0`)
      continue
    }
    if (seen.has(categoryId)) {
      warnings.push(`El presupuesto «${id}» se ha descartado porque ya existe otro para la misma categoría`)
      continue
    }
    seen.add(categoryId)
    out.push({ id, categoryId, limitCents: b.limitCents })
  }
  return out
}

function freshDefaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS, lastUsedCategoryId: { ...DEFAULT_SETTINGS.lastUsedCategoryId } }
}

function normalizeSettings(raw: unknown, categories: readonly Category[], warnings: string[]): Settings {
  if (!isRecord(raw)) {
    warnings.push('Los ajustes no eran válidos y se han restablecido')
    return freshDefaultSettings()
  }
  const settings = freshDefaultSettings()

  if (isCurrencyCode(raw.currency)) settings.currency = raw.currency
  else warnings.push(`La moneda de los ajustes no era válida y se ha restablecido a ${DEFAULT_SETTINGS.currency}`)

  if (raw.locale !== DEFAULT_SETTINGS.locale) {
    warnings.push(`El idioma de los ajustes no era válido y se ha restablecido a ${DEFAULT_SETTINGS.locale}`)
  }

  if (isTheme(raw.theme)) settings.theme = raw.theme
  else warnings.push('El tema de los ajustes no era válido y se ha restablecido al del sistema')

  if (Number.isSafeInteger(raw.initialBalanceCents)) settings.initialBalanceCents = raw.initialBalanceCents as number
  else warnings.push('El saldo inicial de los ajustes no era válido y se ha puesto a 0')

  const lastUsed = raw.lastUsedCategoryId
  if (!isRecord(lastUsed)) {
    warnings.push('La última categoría usada no era válida y se ha restablecido')
  } else {
    for (const type of TYPES) {
      const value = lastUsed[type]
      if (value === null) continue
      const category = typeof value === 'string' ? categories.find((c) => c.id === value) : undefined
      if (category !== undefined && category.type === type) {
        settings.lastUsedCategoryId[type] = category.id
      } else {
        warnings.push(`La última categoría de ${TYPE_LABEL[type]} usada no existe y se ha restablecido`)
      }
    }
  }

  if (isWarnRatio(raw.budgetWarnRatio)) settings.budgetWarnRatio = raw.budgetWarnRatio
  else warnings.push(`El umbral de aviso de presupuesto no era válido y se ha restablecido a ${DEFAULT_SETTINGS.budgetWarnRatio}`)

  return settings
}

/**
 * Hand-written guards over an unknown value (an imported or persisted `data`).
 * Rejects what cannot be trusted (`ok: false` with an English detail) and
 * normalizes benign problems, pushing one Spanish warning per adjustment.
 * Unknown fields are dropped silently. Never reads the clock.
 */
export function validateAppData(x: unknown): Result<ValidatedData, string> {
  if (!isRecord(x)) return reject('data is not an object')
  const { transactions, categories, budgets, settings } = x
  if (!Array.isArray(transactions)) return reject('transactions is not an array')
  if (!Array.isArray(categories)) return reject('categories is not an array')
  if (!Array.isArray(budgets)) return reject('budgets is not an array')

  for (const [items, name] of [
    [transactions, 'transactions'],
    [categories, 'categories'],
    [budgets, 'budgets'],
  ] as const) {
    const detail = checkCollection(items, name)
    if (detail !== null) return reject(detail)
  }

  const warnings: string[] = []
  const normalizedCategories = normalizeCategories(categories as UnknownRecord[], warnings)
  const normalizedTransactions = normalizeTransactions(transactions as UnknownRecord[], normalizedCategories, warnings)
  if (!normalizedTransactions.ok) return reject(normalizedTransactions.error)
  const normalizedBudgets = normalizeBudgets(budgets as UnknownRecord[], normalizedCategories, warnings)
  const normalizedSettings = normalizeSettings(settings, normalizedCategories, warnings)

  const data: AppData = {
    transactions: normalizedTransactions.value,
    categories: normalizedCategories,
    budgets: normalizedBudgets,
    settings: normalizedSettings,
  }
  const violation = findInvariantViolation(data)
  if (violation !== null) return reject(`normalized data violates an invariant: ${violation}`)
  return { ok: true, value: { data, warnings } }
}

// ----------------------------------------------------------------------------
// Invariants
// ----------------------------------------------------------------------------

/** Returns a description of the first broken invariant, or null when `data` is sound. */
export function findInvariantViolation(data: AppData): string | null {
  if (!isRecord(data)) return 'data is not an object'
  const { transactions, categories, budgets, settings } = data
  if (!Array.isArray(transactions)) return 'transactions is not an array'
  if (!Array.isArray(categories)) return 'categories is not an array'
  if (!Array.isArray(budgets)) return 'budgets is not an array'

  // Categories
  const categoryIds = new Set<Id>()
  const namesByType: Record<TransactionType, Set<string>> = { expense: new Set(), income: new Set() }
  const ordersByType: Record<TransactionType, number[]> = { expense: [], income: [] }
  const builtInByType: Record<TransactionType, Category[]> = { expense: [], income: [] }
  for (const c of categories) {
    if (!isRecord(c)) return 'a category is not an object'
    if (!isNonEmptyString(c.id)) return 'a category has no id'
    if (categoryIds.has(c.id)) return `duplicate category id "${c.id}"`
    categoryIds.add(c.id)
    if (!isTransactionType(c.type)) return `category "${c.id}" has an unknown type`
    if (normalizeCategoryName(c.name) !== c.name) return `category "${c.id}" has an invalid name`
    const key = normalizeText(c.name)
    if (namesByType[c.type].has(key)) return `duplicate category name "${c.name}" in ${c.type}`
    namesByType[c.type].add(key)
    if (!isEmojiChoice(c.icon)) return `category "${c.id}" has an icon outside EMOJI_CHOICES`
    if (!isColorKey(c.color)) return `category "${c.id}" has an invalid color`
    if (!Number.isSafeInteger(c.sortOrder)) return `category "${c.id}" has a non-integer sortOrder`
    ordersByType[c.type].push(c.sortOrder)
    if (typeof c.builtIn !== 'boolean') return `category "${c.id}" has a non-boolean builtIn`
    if (c.builtIn) builtInByType[c.type].push(c)
  }
  for (const type of TYPES) {
    const orders = [...ordersByType[type]].sort((a, b) => a - b)
    if (!orders.every((v, i) => v === i)) return `sortOrder of ${type} categories is not contiguous from 0`
    const builtIns = builtInByType[type]
    if (builtIns.length !== 1) return `expected exactly one builtIn ${type} category, found ${builtIns.length}`
    if (builtIns[0]?.id !== wellKnownIdOf(type)) return `builtIn ${type} category must have id "${wellKnownIdOf(type)}"`
  }
  const categoryById = new Map(categories.map((c) => [c.id, c] as const))

  // Transactions
  const transactionIds = new Set<Id>()
  for (const t of transactions) {
    if (!isRecord(t)) return 'a transaction is not an object'
    if (!isNonEmptyString(t.id)) return 'a transaction has no id'
    if (transactionIds.has(t.id)) return `duplicate transaction id "${t.id}"`
    transactionIds.add(t.id)
    if (!isTransactionType(t.type)) return `transaction "${t.id}" has an unknown type`
    if (!isPositiveCents(t.amountCents)) return `transaction "${t.id}" has an invalid amountCents`
    if (typeof t.date !== 'string' || !isLocalDate(t.date)) return `transaction "${t.id}" has an invalid date`
    const category = typeof t.categoryId === 'string' ? categoryById.get(t.categoryId) : undefined
    if (category === undefined) return `transaction "${t.id}" references an unknown category`
    if (category.type !== t.type) return `transaction "${t.id}" references a category of another type`
    if (typeof t.note !== 'string' || t.note.length > MAX_NOTE_LENGTH) return `transaction "${t.id}" has an invalid note`
    if (!Number.isSafeInteger(t.createdAt) || !Number.isSafeInteger(t.updatedAt)) {
      return `transaction "${t.id}" has invalid timestamps`
    }
  }

  // Budgets
  const budgetIds = new Set<Id>()
  const budgetCategories = new Set<Id | null>()
  for (const b of budgets) {
    if (!isRecord(b)) return 'a budget is not an object'
    if (!isNonEmptyString(b.id)) return 'a budget has no id'
    if (budgetIds.has(b.id)) return `duplicate budget id "${b.id}"`
    budgetIds.add(b.id)
    if (b.categoryId !== null) {
      const category = typeof b.categoryId === 'string' ? categoryById.get(b.categoryId) : undefined
      if (category === undefined) return `budget "${b.id}" references an unknown category`
      if (category.type !== TransactionType.expense) return `budget "${b.id}" is on an income category`
    }
    if (budgetCategories.has(b.categoryId)) return `duplicate budget for category ${String(b.categoryId)}`
    budgetCategories.add(b.categoryId)
    if (!isPositiveCents(b.limitCents)) return `budget "${b.id}" has an invalid limitCents`
  }

  // Settings
  if (!isRecord(settings)) return 'settings is not an object'
  if (!isCurrencyCode(settings.currency)) return 'settings.currency is not a 3-letter code'
  if (settings.locale !== DEFAULT_SETTINGS.locale) return 'settings.locale is not es-ES'
  if (!isTheme(settings.theme)) return 'settings.theme is unknown'
  if (!Number.isSafeInteger(settings.initialBalanceCents)) return 'settings.initialBalanceCents is not a safe integer'
  const lastUsed = settings.lastUsedCategoryId
  if (!isRecord(lastUsed)) return 'settings.lastUsedCategoryId is not an object'
  for (const type of TYPES) {
    const value = lastUsed[type]
    if (value === null) continue
    const category = typeof value === 'string' ? categoryById.get(value) : undefined
    if (category === undefined) return `settings.lastUsedCategoryId.${type} references an unknown category`
    if (category.type !== type) return `settings.lastUsedCategoryId.${type} references a category of another type`
  }
  if (!isWarnRatio(settings.budgetWarnRatio)) return 'settings.budgetWarnRatio is not in (0, 1)'

  return null
}

/** Throws with a descriptive message when any §3.1/§4.4 invariant is broken. Tests call it after every action. */
export function assertInvariants(data: AppData): void {
  const violation = findInvariantViolation(data)
  if (violation !== null) throw new Error(`Invariant violated: ${violation}`)
}
