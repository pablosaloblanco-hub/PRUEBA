import { describe, expect, it } from 'vitest'
import { reduce } from './reducer'
import { assertInvariants } from './validate'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, EMOJI_CHOICES, seedData } from './seed'
import { MAX_CENTS, WELL_KNOWN_IDS } from './types'
import type { AppData, Transaction } from './types'
import type { Action, ReducerError, TransactionInput } from './actions'

// ----------------------------------------------------------------------------
// Fixture (§3.7) and helpers
// ----------------------------------------------------------------------------

const DAY = 86_400_000
const BASE = 1_782_864_000_000
const NOW = 1_790_000_000_000

function tx(n: number, id: string, type: Transaction['type'], date: string, amountCents: number, categoryId: string, note: string): Transaction {
  const stamp = BASE + n * DAY
  return { id, type, amountCents, date, categoryId, note, createdAt: stamp, updatedAt: stamp }
}

function fixtureData(): AppData {
  return {
    transactions: [
      tx(1, 't-01', 'income', '2026-07-01', 120000, 'cat-nomina', 'Nómina julio'),
      tx(2, 't-02', 'expense', '2026-07-05', 60000, 'cat-vivienda', 'Alquiler'),
      tx(3, 't-03', 'expense', '2026-07-18', 15000, 'cat-alimentacion', 'Compra mensual'),
      tx(4, 't-04', 'income', '2026-08-01', 120000, 'cat-nomina', 'Nómina agosto'),
      tx(5, 't-05', 'expense', '2026-08-05', 60000, 'cat-vivienda', 'Alquiler'),
      tx(6, 't-06', 'expense', '2026-08-12', 3250, 'cat-restaurantes', 'Cena con Ana'),
      tx(7, 't-07', 'expense', '2026-08-22', 4500, 'cat-ocio', 'Cine'),
      tx(8, 't-08', 'income', '2026-09-01', 120000, 'cat-nomina', 'Nómina septiembre'),
      tx(9, 't-09', 'expense', '2026-09-05', 60000, 'cat-vivienda', 'Alquiler'),
      tx(10, 't-10', 'expense', '2026-09-12', 8320, 'cat-alimentacion', 'Café y compra semanal'),
      tx(11, 't-11', 'expense', '2026-09-20', 11000, 'cat-ocio', 'Entradas concierto'),
      tx(12, 't-12', 'expense', '2026-09-28', 5000, 'cat-suscripciones', 'Gimnasio (futuro)'),
    ],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    budgets: [
      { id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 },
      { id: 'b-total', categoryId: null, limitCents: 100000 },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      initialBalanceCents: 10000,
      lastUsedCategoryId: { expense: 'cat-suscripciones', income: 'cat-nomina' },
    },
  }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key])
  }
  return value
}

/** Frozen fixture: any mutation attempt throws in strict mode (ESM). */
function frozen(): AppData {
  return deepFreeze(fixtureData())
}

function expectOk(state: AppData, action: Action): AppData {
  const r = reduce(state, action)
  if (!r.ok) throw new Error(`expected ok, got ${r.error}`)
  expect(() => assertInvariants(r.value)).not.toThrow()
  return r.value
}

function expectError(state: AppData, action: Action, error: ReducerError): void {
  const r = reduce(state, action)
  expect(r).toEqual({ ok: false, error })
}

function find<T extends { id: string }>(items: readonly T[], id: string): T {
  const item = items.find((x) => x.id === id)
  if (item === undefined) throw new Error(`missing ${id}`)
  return item
}

const validInput: TransactionInput = { type: 'expense', amountCents: 1250, date: '2026-09-25', categoryId: 'cat-ocio', note: 'Cine' }

// ----------------------------------------------------------------------------
// transaction/*
// ----------------------------------------------------------------------------

describe('transaction/add', () => {
  it('appends with createdAt = updatedAt = now, trims the note and updates lastUsedCategoryId', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'transaction/add', id: 't-13', input: { ...validInput, note: '  Cine  ' }, now: NOW })
    expect(next).not.toBe(state)
    expect(next.transactions).toHaveLength(13)
    expect(next.transactions[12]).toEqual({ ...validInput, id: 't-13', note: 'Cine', createdAt: NOW, updatedAt: NOW })
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-ocio', income: 'cat-nomina' })
    // Untouched slices keep their references; the input is intact.
    expect(next.categories).toBe(state.categories)
    expect(next.budgets).toBe(state.budgets)
    expect(state.transactions).toHaveLength(12)
    expect(state.settings.lastUsedCategoryId.expense).toBe('cat-suscripciones')
  })

  it('keeps the settings reference when the category was already the last used', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'transaction/add', id: 't-13', input: { ...validInput, categoryId: 'cat-suscripciones' }, now: NOW })
    expect(next.settings).toBe(state.settings)
  })

  it('updates lastUsedCategoryId for incomes', () => {
    const state = frozen()
    const next = expectOk(state, {
      type: 'transaction/add',
      id: 't-13',
      input: { type: 'income', amountCents: 500, date: '2026-09-25', categoryId: 'cat-extras', note: '' },
      now: NOW,
    })
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-suscripciones', income: 'cat-extras' })
  })

  it('rejects a duplicate or empty id', () => {
    expectError(frozen(), { type: 'transaction/add', id: 't-01', input: validInput, now: NOW }, 'duplicate-id')
    expectError(frozen(), { type: 'transaction/add', id: '', input: validInput, now: NOW }, 'duplicate-id')
  })

  it('rejects invalid amounts (0, negative, float, > MAX_CENTS, NaN)', () => {
    for (const amountCents of [0, -1, 12.5, MAX_CENTS + 1, Number.NaN, '12' as unknown as number]) {
      expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, amountCents }, now: NOW }, 'invalid-amount')
    }
    expectOk(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, amountCents: MAX_CENTS }, now: NOW })
    expectOk(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, amountCents: 1 }, now: NOW })
  })

  it('rejects invalid dates', () => {
    for (const date of ['2026-02-30', '2026-9-3', '', 'hoy']) {
      expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, date }, now: NOW }, 'invalid-date')
    }
    expectOk(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, date: '2027-12-31' }, now: NOW })
  })

  it('rejects notes over 140 characters (after trimming) or non-strings', () => {
    expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, note: 'x'.repeat(141) }, now: NOW }, 'invalid-note')
    expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, note: 5 as unknown as string }, now: NOW }, 'invalid-note')
    const next = expectOk(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, note: `  ${'x'.repeat(140)} ` }, now: NOW })
    expect(next.transactions[12]?.note).toBe('x'.repeat(140))
  })

  it('rejects an unknown category and a category of another type', () => {
    expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, categoryId: 'ghost' }, now: NOW }, 'unknown-category')
    expectError(frozen(), { type: 'transaction/add', id: 't-13', input: { ...validInput, categoryId: 'cat-nomina' }, now: NOW }, 'category-type-mismatch')
    expectError(
      frozen(),
      { type: 'transaction/add', id: 't-13', input: { ...validInput, type: 'transfer' as unknown as 'expense' }, now: NOW },
      'category-type-mismatch',
    )
  })
})

describe('transaction/update', () => {
  it('applies the patch, bumps updatedAt and keeps createdAt', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'transaction/update', id: 't-07', patch: { amountCents: 2000, note: ' Cine y palomitas ' }, now: NOW })
    const updated = find(next.transactions, 't-07')
    expect(updated).toEqual({ ...find(state.transactions, 't-07'), amountCents: 2000, note: 'Cine y palomitas', updatedAt: NOW })
    expect(updated.createdAt).toBe(BASE + 7 * DAY)
    expect(next.transactions).toHaveLength(12)
    expect(next.transactions.indexOf(updated)).toBe(6)
    expect(find(state.transactions, 't-07').amountCents).toBe(4500)
    expect(next.settings).toBe(state.settings)
  })

  it('updates lastUsedCategoryId when the category changes', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'transaction/update', id: 't-07', patch: { categoryId: 'cat-salud' }, now: NOW })
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-salud', income: 'cat-nomina' })
  })

  it('changing the type requires a category of the new type', () => {
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { type: 'income' }, now: NOW }, 'category-type-mismatch')
    const next = expectOk(frozen(), { type: 'transaction/update', id: 't-07', patch: { type: 'income', categoryId: 'cat-extras' }, now: NOW })
    expect(find(next.transactions, 't-07').type).toBe('income')
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-suscripciones', income: 'cat-extras' })
  })

  it('moving to another month is just a date change', () => {
    const next = expectOk(frozen(), { type: 'transaction/update', id: 't-07', patch: { date: '2026-09-22' }, now: NOW })
    expect(find(next.transactions, 't-07').date).toBe('2026-09-22')
  })

  it('rejects an unknown id and each invalid field', () => {
    expectError(frozen(), { type: 'transaction/update', id: 'ghost', patch: { amountCents: 1 }, now: NOW }, 'unknown-transaction')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { amountCents: 0 }, now: NOW }, 'invalid-amount')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { amountCents: 1.5 }, now: NOW }, 'invalid-amount')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { date: '2026-13-01' }, now: NOW }, 'invalid-date')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { note: 'x'.repeat(141) }, now: NOW }, 'invalid-note')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { categoryId: 'ghost' }, now: NOW }, 'unknown-category')
    expectError(frozen(), { type: 'transaction/update', id: 't-07', patch: { categoryId: 'cat-nomina' }, now: NOW }, 'category-type-mismatch')
  })

  it('returns the same reference for a no-op patch (empty, identical or undefined values)', () => {
    const state = frozen()
    expect(reduce(state, { type: 'transaction/update', id: 't-07', patch: {}, now: NOW })).toEqual({ ok: true, value: state })
    const same = reduce(state, { type: 'transaction/update', id: 't-07', patch: { amountCents: 4500, note: ' Cine ' }, now: NOW })
    expect(same.ok && same.value).toBe(state)
    const undef = reduce(state, { type: 'transaction/update', id: 't-07', patch: { note: undefined, amountCents: undefined }, now: NOW })
    expect(undef.ok && undef.value).toBe(state)
  })
})

describe('transaction/remove', () => {
  it('removes the transaction and leaves the rest untouched', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'transaction/remove', id: 't-07' })
    expect(next.transactions.map((t) => t.id)).not.toContain('t-07')
    expect(next.transactions).toHaveLength(11)
    expect(next.categories).toBe(state.categories)
    expect(next.settings).toBe(state.settings)
    expect(state.transactions).toHaveLength(12)
  })

  it('rejects an unknown id with unknown-transaction', () => {
    expectError(frozen(), { type: 'transaction/remove', id: 'ghost' }, 'unknown-transaction')
  })
})

// ----------------------------------------------------------------------------
// category/*
// ----------------------------------------------------------------------------

describe('category/add', () => {
  const input = { name: 'Mascotas', type: 'expense' as const, icon: '🐶', color: 'teal' as const }

  it('assigns sortOrder = max + 1 and builtIn = false, trimming the name', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'category/add', id: 'cat-mascotas', input: { ...input, name: '  Mascotas ' } })
    expect(next.categories).toHaveLength(16)
    expect(next.categories[15]).toEqual({ id: 'cat-mascotas', name: 'Mascotas', type: 'expense', icon: '🐶', color: 'teal', sortOrder: 11, builtIn: false })
    expect(next.transactions).toBe(state.transactions)
    expect(state.categories).toHaveLength(15)

    const income = expectOk(state, { type: 'category/add', id: 'cat-x', input: { ...input, type: 'income' } })
    expect(income.categories[15]?.sortOrder).toBe(4)
  })

  it('starts at 0 when the type has no categories yet', () => {
    const empty = deepFreeze({ ...fixtureData(), transactions: [], budgets: [], categories: [] })
    // Not a valid state (no builtIn) but the reducer only needs the max sortOrder here.
    const r = reduce(empty, { type: 'category/add', id: 'cat-x', input })
    expect(r.ok && r.value.categories[0]?.sortOrder).toBe(0)
  })

  it('rejects a duplicate id', () => {
    expectError(frozen(), { type: 'category/add', id: 'cat-ocio', input }, 'duplicate-id')
    expectError(frozen(), { type: 'category/add', id: '', input }, 'duplicate-id')
  })

  it('rejects an invalid or duplicate name (case- and accent-insensitive within the type)', () => {
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: '' } }, 'invalid-category-name')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: '   ' } }, 'invalid-category-name')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: 'x'.repeat(31) } }, 'invalid-category-name')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: 'ocio' } }, 'duplicate-category-name')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: 'Ócio' } }, 'duplicate-category-name')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: ' OCIO ' } }, 'duplicate-category-name')
    expectOk(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: 'Ocio', type: 'income' } })
    expectOk(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, name: 'x'.repeat(30) } })
  })

  it('rejects an icon outside EMOJI_CHOICES and a color outside ColorKey', () => {
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, icon: '🦄' } }, 'invalid-icon')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, icon: '' } }, 'invalid-icon')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, color: 'magenta' as unknown as 'teal' } }, 'invalid-color')
    expectError(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, type: 'weird' as unknown as 'expense' } }, 'category-type-mismatch')
    for (const icon of EMOJI_CHOICES) {
      expectOk(frozen(), { type: 'category/add', id: 'cat-x', input: { ...input, icon } })
    }
  })
})

describe('category/update', () => {
  it('renames, re-icons and recolors (builtIn included), keeping type/sortOrder/builtIn', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'category/update', id: 'cat-otros-gastos', patch: { name: ' Varios ', icon: '🧾', color: 'red' } })
    expect(find(next.categories, 'cat-otros-gastos')).toEqual({
      id: 'cat-otros-gastos', name: 'Varios', type: 'expense', icon: '🧾', color: 'red', sortOrder: 10, builtIn: true,
    })
    expect(next.categories.indexOf(find(next.categories, 'cat-otros-gastos'))).toBe(10)
    expect(find(state.categories, 'cat-otros-gastos').name).toBe('Otros gastos')
  })

  it('allows renaming to its own name (also with different case) and returns the same reference when nothing changes', () => {
    const state = frozen()
    const same = reduce(state, { type: 'category/update', id: 'cat-ocio', patch: { name: 'Ocio', icon: '🎬', color: 'pink' } })
    expect(same.ok && same.value).toBe(state)
    expect(reduce(state, { type: 'category/update', id: 'cat-ocio', patch: {} })).toEqual({ ok: true, value: state })
    const recased = expectOk(state, { type: 'category/update', id: 'cat-ocio', patch: { name: 'OCIO' } })
    expect(find(recased.categories, 'cat-ocio').name).toBe('OCIO')
  })

  it('rejects unknown ids and invalid name/icon/color', () => {
    expectError(frozen(), { type: 'category/update', id: 'ghost', patch: { name: 'X' } }, 'unknown-category')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { name: '' } }, 'invalid-category-name')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { name: 'x'.repeat(31) } }, 'invalid-category-name')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { name: 'salud' } }, 'duplicate-category-name')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { name: 'Educación' } }, 'duplicate-category-name')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { icon: '🦄' } }, 'invalid-icon')
    expectError(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { color: 'neon' as unknown as 'red' } }, 'invalid-color')
    // A name used by the other type is fine.
    expectOk(frozen(), { type: 'category/update', id: 'cat-ocio', patch: { name: 'Nómina' } })
  })
})

describe('category/remove', () => {
  it('reassigns its N transactions to the builtIn (bumping updatedAt), removes its budget and clears lastUsed', () => {
    const state = frozen()
    const withLastUsed = deepFreeze({ ...state, settings: { ...state.settings, lastUsedCategoryId: { expense: 'cat-ocio', income: 'cat-nomina' } } })
    const next = expectOk(withLastUsed, { type: 'category/remove', id: 'cat-ocio', now: NOW })
    expect(next.categories.some((c) => c.id === 'cat-ocio')).toBe(false)
    expect(next.categories).toHaveLength(14)
    const moved = next.transactions.filter((t) => t.categoryId === WELL_KNOWN_IDS.otherExpense)
    expect(moved.map((t) => t.id)).toEqual(['t-07', 't-11'])
    for (const t of moved) expect(t.updatedAt).toBe(NOW)
    expect(find(next.transactions, 't-07').createdAt).toBe(BASE + 7 * DAY)
    // Others untouched (same references).
    expect(find(next.transactions, 't-06')).toBe(find(withLastUsed.transactions, 't-06'))
    expect(next.budgets).toEqual([{ id: 'b-total', categoryId: null, limitCents: 100000 }])
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: null, income: 'cat-nomina' })
    // sortOrder stays contiguous within the type.
    expect(next.categories.filter((c) => c.type === 'expense').map((c) => c.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(find(next.categories, 'cat-otros-gastos').sortOrder).toBe(9)
    expect(find(next.categories, 'cat-suministros').sortOrder).toBe(4)
    expect(next.categories.filter((c) => c.type === 'income')).toEqual(withLastUsed.categories.filter((c) => c.type === 'income'))
    // Input untouched.
    expect(withLastUsed.categories).toHaveLength(15)
    expect(find(withLastUsed.transactions, 't-07').categoryId).toBe('cat-ocio')
  })

  it('keeps settings by reference when the category was not the last used, and with 0 transactions just removes it', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'category/remove', id: 'cat-salud', now: NOW })
    expect(next.settings).toBe(state.settings)
    expect(next.transactions).toEqual(state.transactions)
    expect(next.budgets).toEqual(state.budgets)
    expect(next.categories).toHaveLength(14)
  })

  it('reassigns income transactions to «Otros ingresos»', () => {
    const next = expectOk(frozen(), { type: 'category/remove', id: 'cat-nomina', now: NOW })
    expect(next.transactions.filter((t) => t.type === 'income').every((t) => t.categoryId === WELL_KNOWN_IDS.otherIncome)).toBe(true)
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-suscripciones', income: null })
  })

  it('rejects builtIn categories and unknown ids', () => {
    expectError(frozen(), { type: 'category/remove', id: 'cat-otros-gastos', now: NOW }, 'builtin-category')
    expectError(frozen(), { type: 'category/remove', id: 'cat-otros-ingresos', now: NOW }, 'builtin-category')
    expectError(frozen(), { type: 'category/remove', id: 'ghost', now: NOW }, 'unknown-category')
  })
})

// ----------------------------------------------------------------------------
// budget/*
// ----------------------------------------------------------------------------

describe('budget/upsert', () => {
  it('inserts a new budget and replaces an existing one by id', () => {
    const state = frozen()
    const inserted = expectOk(state, { type: 'budget/upsert', budget: { id: 'b-salud', categoryId: 'cat-salud', limitCents: 5000 } })
    expect(inserted.budgets).toHaveLength(3)
    expect(inserted.budgets[2]).toEqual({ id: 'b-salud', categoryId: 'cat-salud', limitCents: 5000 })
    expect(inserted.transactions).toBe(state.transactions)

    const replaced = expectOk(state, { type: 'budget/upsert', budget: { id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 15000 } })
    expect(replaced.budgets).toEqual([
      { id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 15000 },
      { id: 'b-total', categoryId: null, limitCents: 100000 },
    ])
    expect(find(state.budgets, 'b-ocio').limitCents).toBe(10000)

    const total = expectOk(state, { type: 'budget/upsert', budget: { id: 'b-total', categoryId: null, limitCents: 200000 } })
    expect(find(total.budgets, 'b-total').limitCents).toBe(200000)
  })

  it('allows a total when none exists', () => {
    const noTotal = deepFreeze({ ...fixtureData(), budgets: [{ id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 }] })
    const next = expectOk(noTotal, { type: 'budget/upsert', budget: { id: 'b-new', categoryId: null, limitCents: 1 } })
    expect(next.budgets).toHaveLength(2)
  })

  it('drops unknown fields from the stored budget', () => {
    const next = expectOk(frozen(), {
      type: 'budget/upsert',
      budget: { id: 'b-salud', categoryId: 'cat-salud', limitCents: 5000, month: '2026-09' } as unknown as { id: string; categoryId: string; limitCents: number },
    })
    expect(Object.keys(next.budgets[2] ?? {})).toEqual(['id', 'categoryId', 'limitCents'])
  })

  it('rejects a duplicate category under another id (including a second total)', () => {
    expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: 'cat-ocio', limitCents: 5000 } }, 'duplicate-budget')
    expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: null, limitCents: 5000 } }, 'duplicate-budget')
  })

  it('rejects income categories, unknown categories and invalid limits', () => {
    expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: 'cat-nomina', limitCents: 5000 } }, 'budget-on-income-category')
    expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: 'ghost', limitCents: 5000 } }, 'unknown-category')
    for (const limitCents of [0, -1, 12.5, MAX_CENTS + 1, Number.NaN]) {
      expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: 'cat-salud', limitCents } }, 'invalid-budget')
    }
    expectError(frozen(), { type: 'budget/upsert', budget: { id: '', categoryId: 'cat-salud', limitCents: 1 } }, 'invalid-budget')
    expectError(frozen(), { type: 'budget/upsert', budget: { id: 'b-new', categoryId: 7 as unknown as string, limitCents: 1 } }, 'invalid-budget')
  })

  it('returns the same reference when the upsert changes nothing', () => {
    const state = frozen()
    const r = reduce(state, { type: 'budget/upsert', budget: { id: 'b-ocio', categoryId: 'cat-ocio', limitCents: 10000 } })
    expect(r.ok && r.value).toBe(state)
  })
})

describe('budget/remove', () => {
  it('removes by id and is a no-op (same reference) for unknown ids', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'budget/remove', id: 'b-ocio' })
    expect(next.budgets).toEqual([{ id: 'b-total', categoryId: null, limitCents: 100000 }])
    expect(state.budgets).toHaveLength(2)
    const r = reduce(state, { type: 'budget/remove', id: 'ghost' })
    expect(r.ok && r.value).toBe(state)
  })
})

// ----------------------------------------------------------------------------
// settings/update
// ----------------------------------------------------------------------------

describe('settings/update', () => {
  it('applies a valid partial patch', () => {
    const state = frozen()
    const next = expectOk(state, {
      type: 'settings/update',
      patch: { currency: 'USD', theme: 'dark', initialBalanceCents: -2500, budgetWarnRatio: 0.5, lastUsedCategoryId: { expense: 'cat-ocio', income: null } },
    })
    expect(next.settings).toEqual({
      currency: 'USD', locale: 'es-ES', theme: 'dark', initialBalanceCents: -2500, lastUsedCategoryId: { expense: 'cat-ocio', income: null }, budgetWarnRatio: 0.5,
    })
    expect(next.transactions).toBe(state.transactions)
    expect(state.settings.currency).toBe('EUR')
    expect(expectOk(state, { type: 'settings/update', patch: { initialBalanceCents: 0 } }).settings.initialBalanceCents).toBe(0)
    expect(expectOk(state, { type: 'settings/update', patch: { currency: 'XXX' } }).settings.currency).toBe('XXX')
  })

  it('rejects each invalid field with invalid-settings', () => {
    for (const currency of ['', 'eur', 'EURO', 'E', 3 as unknown as string]) {
      expectError(frozen(), { type: 'settings/update', patch: { currency } }, 'invalid-settings')
    }
    expectError(frozen(), { type: 'settings/update', patch: { theme: 'neon' as unknown as 'dark' } }, 'invalid-settings')
    for (const initialBalanceCents of [1.5, Number.NaN, 2 ** 53, '10' as unknown as number]) {
      expectError(frozen(), { type: 'settings/update', patch: { initialBalanceCents } }, 'invalid-settings')
    }
    for (const budgetWarnRatio of [0, 1, -0.1, 1.5, Number.NaN]) {
      expectError(frozen(), { type: 'settings/update', patch: { budgetWarnRatio } }, 'invalid-settings')
    }
    expectError(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: { expense: 'ghost', income: null } } }, 'invalid-settings')
    expectError(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: { expense: 'cat-nomina', income: null } } }, 'invalid-settings')
    expectError(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: { expense: null, income: 'cat-ocio' } } }, 'invalid-settings')
    expectError(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: 'cat-ocio' as unknown as { expense: null; income: null } } }, 'invalid-settings')
    expectError(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: { expense: 7 as unknown as string, income: null } } }, 'invalid-settings')
    expectError(frozen(), { type: 'settings/update', patch: { locale: 'en-US' as unknown as 'es-ES' } }, 'invalid-settings')
    // A rejected patch changes nothing.
    const state = frozen()
    expectError(state, { type: 'settings/update', patch: { currency: 'USD', theme: 'neon' as unknown as 'dark' } }, 'invalid-settings')
    expect(state.settings.currency).toBe('EUR')
  })

  it('accepts a partial lastUsedCategoryId and merges it', () => {
    const next = expectOk(frozen(), { type: 'settings/update', patch: { lastUsedCategoryId: { income: 'cat-extras' } as unknown as { expense: null; income: string } } })
    expect(next.settings.lastUsedCategoryId).toEqual({ expense: 'cat-suscripciones', income: 'cat-extras' })
  })

  it('returns the same reference when nothing changes', () => {
    const state = frozen()
    expect(reduce(state, { type: 'settings/update', patch: {} })).toEqual({ ok: true, value: state })
    const same = reduce(state, {
      type: 'settings/update',
      patch: { currency: 'EUR', theme: 'system', initialBalanceCents: 10000, budgetWarnRatio: 0.8, locale: 'es-ES', lastUsedCategoryId: { expense: 'cat-suscripciones', income: 'cat-nomina' } },
    })
    expect(same.ok && same.value).toBe(state)
  })
})

// ----------------------------------------------------------------------------
// data/*
// ----------------------------------------------------------------------------

describe('data/replace and data/reset', () => {
  it('data/replace returns the given data as-is', () => {
    const state = frozen()
    const replacement = deepFreeze(seedData(NOW))
    const r = reduce(state, { type: 'data/replace', data: replacement })
    expect(r.ok && r.value).toBe(replacement)
    const same = reduce(state, { type: 'data/replace', data: state })
    expect(same.ok && same.value).toBe(state)
  })

  it('data/reset reseeds from scratch (settings included) without touching the input', () => {
    const state = frozen()
    const next = expectOk(state, { type: 'data/reset', now: NOW })
    expect(next).toEqual(seedData(NOW))
    expect(next.transactions).toEqual([])
    expect(next.budgets).toEqual([])
    expect(next.settings).toEqual(DEFAULT_SETTINGS)
    expect(next).not.toBe(state)
    expect(state.transactions).toHaveLength(12)
    // Fresh objects: mutating the result must not leak into the seed.
    next.settings.currency = 'USD'
    expect(seedData(NOW).settings.currency).toBe('EUR')
  })
})

// ----------------------------------------------------------------------------
// Cross-cutting
// ----------------------------------------------------------------------------

describe('reduce', () => {
  it('never throws on a frozen input and every accepted result satisfies the invariants', () => {
    const state = frozen()
    const actions: Action[] = [
      { type: 'transaction/add', id: 'n1', input: validInput, now: NOW },
      { type: 'transaction/update', id: 't-01', patch: { note: 'x' }, now: NOW },
      { type: 'transaction/remove', id: 't-12' },
      { type: 'category/add', id: 'c1', input: { name: 'Nueva', type: 'income', icon: '🎁', color: 'amber' } },
      { type: 'category/update', id: 'cat-extras', patch: { color: 'red' } },
      { type: 'category/remove', id: 'cat-vivienda', now: NOW },
      { type: 'budget/upsert', budget: { id: 'b1', categoryId: 'cat-salud', limitCents: 1 } },
      { type: 'budget/remove', id: 'b-total' },
      { type: 'settings/update', patch: { theme: 'light' } },
      { type: 'data/reset', now: NOW },
      { type: 'data/replace', data: state },
    ]
    let current = state
    for (const action of actions) {
      const r = reduce(current, action)
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(() => assertInvariants(r.value)).not.toThrow()
        current = deepFreeze(r.value)
      }
    }
    expect(state).toEqual(fixtureData())
  })

  it('a rejected action leaves the state untouched', () => {
    const state = frozen()
    reduce(state, { type: 'transaction/add', id: 't-13', input: { ...validInput, amountCents: 0 }, now: NOW })
    expect(state).toEqual(fixtureData())
  })

  it('never throws when an untyped caller passes a null/undefined/primitive payload (§4.7)', () => {
    const state = frozen()
    const cast = <T>(x: unknown): T => x as T
    const cases: [Action, ReducerError][] = []
    for (const bad of [null, undefined, 7, 'x', true]) {
      cases.push([{ type: 'transaction/add', id: 't-13', input: cast(bad), now: NOW }, 'invalid-amount'])
      cases.push([{ type: 'transaction/update', id: 't-01', patch: cast(bad), now: NOW }, 'invalid-amount'])
      cases.push([{ type: 'category/add', id: 'c-new', input: cast(bad) }, 'invalid-category-name'])
      cases.push([{ type: 'category/update', id: 'cat-ocio', patch: cast(bad) }, 'invalid-category-name'])
      cases.push([{ type: 'budget/upsert', budget: cast(bad) }, 'invalid-budget'])
      cases.push([{ type: 'settings/update', patch: cast(bad) }, 'invalid-settings'])
    }
    for (const [action, error] of cases) {
      expect(() => reduce(state, action)).not.toThrow()
      expectError(state, action, error)
    }
    // Existence checks still come first: an unknown id wins over the bad payload.
    expectError(state, { type: 'transaction/update', id: 'ghost', patch: cast(null), now: NOW }, 'unknown-transaction')
    expectError(state, { type: 'category/update', id: 'ghost', patch: cast(null) }, 'unknown-category')
    expectError(state, { type: 'transaction/add', id: 't-01', input: cast(null), now: NOW }, 'duplicate-id')
    expect(state).toEqual(fixtureData())
  })

  it('a chain of actions applies in order', () => {
    let s = frozen()
    s = deepFreeze(expectOk(s, { type: 'category/add', id: 'cat-mascotas', input: { name: 'Mascotas', type: 'expense', icon: '🐶', color: 'teal' } }))
    s = deepFreeze(expectOk(s, { type: 'transaction/add', id: 't-13', input: { ...validInput, categoryId: 'cat-mascotas' }, now: NOW }))
    s = deepFreeze(expectOk(s, { type: 'budget/upsert', budget: { id: 'b-mascotas', categoryId: 'cat-mascotas', limitCents: 3000 } }))
    expect(s.settings.lastUsedCategoryId.expense).toBe('cat-mascotas')
    s = deepFreeze(expectOk(s, { type: 'category/remove', id: 'cat-mascotas', now: NOW + 1 }))
    expect(find(s.transactions, 't-13').categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
    expect(find(s.transactions, 't-13').updatedAt).toBe(NOW + 1)
    expect(s.budgets.some((b) => b.id === 'b-mascotas')).toBe(false)
    expect(s.settings.lastUsedCategoryId.expense).toBeNull()
    expect(s.categories).toHaveLength(15)
  })
})
