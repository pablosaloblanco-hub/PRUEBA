import { describe, expect, it } from 'vitest'
import {
  VALIDATION_MESSAGES as M,
  amountErrorMessage,
  assertInvariants,
  findInvariantViolation,
  validateAmountInput,
  validateAppData,
  validateBudgetCategory,
  validateBudgetInput,
  validateCategoryChoice,
  validateCategoryName,
  validateDate,
  validateInitialBalanceInput,
  validateNote,
  validateTransactionForm,
} from './validate'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, EMOJI_CHOICES, seedData } from './seed'
import { MAX_CENTS, WELL_KNOWN_IDS } from './types'
import type { AppData, Budget, Category, Transaction } from './types'

// ----------------------------------------------------------------------------
// §3.7 fixture data (inline so this file does not depend on the storage agent)
// ----------------------------------------------------------------------------

const DAY = 86_400_000
const BASE = 1_782_864_000_000

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

type Loose = {
  transactions: Record<string, unknown>[]
  categories: Record<string, unknown>[]
  budgets: Record<string, unknown>[]
  settings: Record<string, unknown>
  [extra: string]: unknown
}

/** Plain JSON clone of the fixture, typed loosely so tests can corrupt any field. */
function raw(): Loose {
  return JSON.parse(JSON.stringify(fixtureData())) as Loose
}

function at(items: Record<string, unknown>[], i: number): Record<string, unknown> {
  const item = items[i]
  if (item === undefined) throw new Error(`no element at ${i}`)
  return item
}

function expectRejected(x: unknown, detail?: RegExp): void {
  const r = validateAppData(x)
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(typeof r.error).toBe('string')
    expect(r.error.length).toBeGreaterThan(0)
    if (detail !== undefined) expect(r.error).toMatch(detail)
  }
}

/** Accepts the input, asserts the number of warnings and the invariants, and returns the data. */
function expectNormalized(x: unknown, warningCount: number): { data: AppData; warnings: string[] } {
  const r = validateAppData(x)
  if (!r.ok) throw new Error(`expected ok, got: ${r.error}`)
  expect(r.value.warnings).toHaveLength(warningCount)
  for (const w of r.value.warnings) expect(typeof w).toBe('string')
  expect(() => assertInvariants(r.value.data)).not.toThrow()
  return r.value
}

/** True when `s` has no lone surrogate (ES2024's String#isWellFormed; the ES2023 lib has no typing for it). */
function wellFormed(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = s.charCodeAt(i + 1)
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false
      i++
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false
    }
  }
  return true
}

const categories: readonly Category[] = DEFAULT_CATEGORIES
const budgets: readonly Budget[] = fixtureData().budgets

// ----------------------------------------------------------------------------
// Form validators (§4.4)
// ----------------------------------------------------------------------------

describe('amountErrorMessage', () => {
  it('maps every parse error to its §4.4 message', () => {
    expect(amountErrorMessage('empty')).toBe('Introduce un importe mayor que 0')
    expect(amountErrorMessage('zero')).toBe('Introduce un importe mayor que 0')
    expect(amountErrorMessage('too-many-decimals')).toBe('Máximo dos decimales')
    expect(amountErrorMessage('invalid')).toBe('Importe no válido. Ejemplos: 12,50 · 1.234,56')
    expect(amountErrorMessage('too-large')).toBe('Importe demasiado grande (máx. 999.999.999,99)')
    expect(amountErrorMessage('negative')).toBe('El importe no puede ser negativo')
  })
})

describe('validateAmountInput', () => {
  it('returns cents for valid text', () => {
    expect(validateAmountInput('12,50')).toEqual({ ok: true, value: 1250 })
    expect(validateAmountInput('1.234,56')).toEqual({ ok: true, value: 123456 })
    expect(validateAmountInput('  12,50 € ')).toEqual({ ok: true, value: 1250 })
  })

  it('returns each Spanish message', () => {
    expect(validateAmountInput('')).toEqual({ ok: false, message: 'Introduce un importe mayor que 0' })
    expect(validateAmountInput('   ')).toEqual({ ok: false, message: M.amountEmptyOrZero })
    expect(validateAmountInput('0')).toEqual({ ok: false, message: 'Introduce un importe mayor que 0' })
    expect(validateAmountInput('0,00')).toEqual({ ok: false, message: M.amountEmptyOrZero })
    expect(validateAmountInput('12,505')).toEqual({ ok: false, message: 'Máximo dos decimales' })
    expect(validateAmountInput('12a')).toEqual({ ok: false, message: 'Importe no válido. Ejemplos: 12,50 · 1.234,56' })
    expect(validateAmountInput('1.2,3')).toEqual({ ok: false, message: M.amountInvalid })
    expect(validateAmountInput('1000000000')).toEqual({ ok: false, message: 'Importe demasiado grande (máx. 999.999.999,99)' })
    expect(validateAmountInput('-5')).toEqual({ ok: false, message: 'El importe no puede ser negativo' })
  })

  it('honours allowZero / allowNegative', () => {
    expect(validateAmountInput('0', { allowZero: true })).toEqual({ ok: true, value: 0 })
    expect(validateAmountInput('-5', { allowNegative: true })).toEqual({ ok: true, value: -500 })
  })
})

describe('validateInitialBalanceInput', () => {
  it('allows zero and negatives, keeps the other messages', () => {
    expect(validateInitialBalanceInput('0')).toEqual({ ok: true, value: 0 })
    expect(validateInitialBalanceInput('-1.234,56')).toEqual({ ok: true, value: -123456 })
    expect(validateInitialBalanceInput('100')).toEqual({ ok: true, value: 10000 })
    expect(validateInitialBalanceInput('')).toEqual({ ok: false, message: M.amountEmptyOrZero })
    expect(validateInitialBalanceInput('abc')).toEqual({ ok: false, message: M.amountInvalid })
    expect(validateInitialBalanceInput('1,234')).toEqual({ ok: false, message: M.amountTooManyDecimals })
    expect(validateInitialBalanceInput('9999999999')).toEqual({ ok: false, message: M.amountTooLarge })
  })
})

describe('validateDate', () => {
  it('accepts real local dates and rejects the rest with «Fecha no válida»', () => {
    expect(validateDate('2026-09-25')).toEqual({ ok: true, value: '2026-09-25' })
    expect(validateDate('2024-02-29')).toEqual({ ok: true, value: '2024-02-29' })
    expect(validateDate('2025-02-29')).toEqual({ ok: false, message: 'Fecha no válida' })
    expect(validateDate('2026-9-3')).toEqual({ ok: false, message: M.dateInvalid })
    expect(validateDate('')).toEqual({ ok: false, message: M.dateInvalid })
  })
})

describe('validateCategoryChoice', () => {
  it('requires an existing category of the same type', () => {
    const ok = validateCategoryChoice('cat-ocio', 'expense', categories)
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.id).toBe('cat-ocio')
    expect(validateCategoryChoice('cat-ocio', 'income', categories)).toEqual({ ok: false, message: 'Elige una categoría' })
    expect(validateCategoryChoice('nope', 'expense', categories)).toEqual({ ok: false, message: M.categoryRequired })
    expect(validateCategoryChoice(null, 'expense', categories)).toEqual({ ok: false, message: M.categoryRequired })
    expect(validateCategoryChoice(undefined, 'expense', categories)).toEqual({ ok: false, message: M.categoryRequired })
  })
})

describe('validateNote', () => {
  it('trims and limits to 140 characters', () => {
    expect(validateNote('  hola  ')).toEqual({ ok: true, value: 'hola' })
    expect(validateNote('')).toEqual({ ok: true, value: '' })
    expect(validateNote('x'.repeat(140))).toEqual({ ok: true, value: 'x'.repeat(140) })
    expect(validateNote('x'.repeat(141))).toEqual({ ok: false, message: 'La nota no puede superar 140 caracteres' })
    expect(validateNote(`  ${'x'.repeat(140)}  `)).toEqual({ ok: true, value: 'x'.repeat(140) })
  })
})

describe('validateCategoryName', () => {
  it('requires 1..30 trimmed characters', () => {
    expect(validateCategoryName('', 'expense', categories)).toEqual({ ok: false, message: 'El nombre es obligatorio' })
    expect(validateCategoryName('   ', 'expense', categories)).toEqual({ ok: false, message: M.categoryNameRequired })
    expect(validateCategoryName('x'.repeat(31), 'expense', categories)).toEqual({ ok: false, message: 'Máximo 30 caracteres' })
    expect(validateCategoryName(`  ${'x'.repeat(30)}  `, 'expense', categories)).toEqual({ ok: true, value: 'x'.repeat(30) })
    expect(validateCategoryName('  Mascotas ', 'expense', categories)).toEqual({ ok: true, value: 'Mascotas' })
  })

  it('is unique per type ignoring case and accents, and allows renaming to itself', () => {
    expect(validateCategoryName('ocio', 'expense', categories)).toEqual({ ok: false, message: 'Ya existe una categoría con ese nombre' })
    expect(validateCategoryName('Ócio', 'expense', categories)).toEqual({ ok: false, message: M.categoryNameDuplicate })
    expect(validateCategoryName('OCIO ', 'expense', categories)).toEqual({ ok: false, message: M.categoryNameDuplicate })
    expect(validateCategoryName('Ocio', 'income', categories)).toEqual({ ok: true, value: 'Ocio' })
    expect(validateCategoryName('Ocio', 'expense', categories, 'cat-ocio')).toEqual({ ok: true, value: 'Ocio' })
    expect(validateCategoryName('Ocio', 'expense', categories, 'cat-salud')).toEqual({ ok: false, message: M.categoryNameDuplicate })
  })
})

describe('validateBudgetCategory', () => {
  it('accepts null (total) or an expense category without another budget', () => {
    expect(validateBudgetCategory(null, categories, [])).toEqual({ ok: true, value: null })
    expect(validateBudgetCategory('cat-salud', categories, budgets)).toEqual({ ok: true, value: 'cat-salud' })
    expect(validateBudgetCategory(null, categories, budgets)).toEqual({ ok: false, message: 'Ya existe un presupuesto para esta categoría' })
    expect(validateBudgetCategory('cat-ocio', categories, budgets)).toEqual({ ok: false, message: M.budgetDuplicate })
    expect(validateBudgetCategory('cat-ocio', categories, budgets, 'b-ocio')).toEqual({ ok: true, value: 'cat-ocio' })
    expect(validateBudgetCategory(null, categories, budgets, 'b-total')).toEqual({ ok: true, value: null })
    expect(validateBudgetCategory('cat-nomina', categories, [])).toEqual({ ok: false, message: M.categoryRequired })
    expect(validateBudgetCategory('nope', categories, [])).toEqual({ ok: false, message: M.categoryRequired })
  })
})

describe('validateBudgetInput', () => {
  const data = { categories, budgets }
  it('returns the parsed budget or per-field errors', () => {
    expect(validateBudgetInput({ categoryId: 'cat-salud', limitText: '200' }, data)).toEqual({
      ok: true,
      value: { categoryId: 'cat-salud', limitCents: 20000 },
    })
    expect(validateBudgetInput({ categoryId: 'cat-ocio', limitText: '0' }, data)).toEqual({
      ok: false,
      errors: { category: M.budgetDuplicate, limit: M.amountEmptyOrZero },
    })
    expect(validateBudgetInput({ categoryId: 'cat-ocio', limitText: '150' }, data, 'b-ocio')).toEqual({
      ok: true,
      value: { categoryId: 'cat-ocio', limitCents: 15000 },
    })
    expect(validateBudgetInput({ categoryId: null, limitText: '12,505' }, { categories, budgets: [] })).toEqual({
      ok: false,
      errors: { limit: M.amountTooManyDecimals },
    })
  })
})

describe('validateTransactionForm', () => {
  it('returns a TransactionInput or per-field messages', () => {
    expect(
      validateTransactionForm({ type: 'expense', amountText: '12,50', date: '2026-09-25', categoryId: 'cat-ocio', note: ' Cine ' }, categories),
    ).toEqual({ ok: true, value: { type: 'expense', amountCents: 1250, date: '2026-09-25', categoryId: 'cat-ocio', note: 'Cine' } })
    expect(
      validateTransactionForm({ type: 'expense', amountText: '', date: '2026-02-30', categoryId: 'cat-nomina', note: 'x'.repeat(141) }, categories),
    ).toEqual({
      ok: false,
      errors: { amount: M.amountEmptyOrZero, date: M.dateInvalid, category: M.categoryRequired, note: M.noteTooLong },
    })
    expect(
      validateTransactionForm({ type: 'income', amountText: '12', date: '2026-09-25', categoryId: null, note: '' }, categories),
    ).toEqual({ ok: false, errors: { category: M.categoryRequired } })
  })
})

// ----------------------------------------------------------------------------
// validateAppData — RECHAZA
// ----------------------------------------------------------------------------

describe('validateAppData rejects', () => {
  it('data that is not an object (null, array, string, number, undefined)', () => {
    expectRejected(null, /not an object/)
    expectRejected([], /not an object/)
    expectRejected('{}', /not an object/)
    expectRejected(42)
    expectRejected(undefined)
  })

  it('transactions / categories / budgets that are not arrays', () => {
    for (const key of ['transactions', 'categories', 'budgets'] as const) {
      for (const bad of [undefined, null, {}, 'x', 3]) {
        const r = raw()
        r[key] = bad as never
        expectRejected(r, new RegExp(`${key} is not an array`))
      }
    }
  })

  it('a transaction element that is not an object', () => {
    for (const bad of [null, 'x', 3, [], undefined]) {
      const r = raw()
      r.transactions.push(bad as never)
      expectRejected(r, /transactions\[12\] is not an object/)
    }
  })

  it('amountCents that is a float, a string, negative, zero, > MAX_CENTS or missing', () => {
    for (const bad of [12.5, '1250', -3, 0, MAX_CENTS + 1, Number.NaN, Number.POSITIVE_INFINITY, undefined, null]) {
      const r = raw()
      at(r.transactions, 0).amountCents = bad
      expectRejected(r, /transactions\[0\]\.amountCents/)
    }
    const r = raw()
    at(r.transactions, 0).amountCents = MAX_CENTS
    expectNormalized(r, 0)
  })

  it('an invalid date', () => {
    for (const bad of ['2025-02-30', '2026-9-3', '', 20260925, null, undefined, 'hoy']) {
      const r = raw()
      at(r.transactions, 3).date = bad
      expectRejected(r, /transactions\[3\]\.date/)
    }
  })

  it('an unknown transaction type', () => {
    for (const bad of ['transfer', 'Expense', '', null, undefined, 1]) {
      const r = raw()
      at(r.transactions, 2).type = bad
      expectRejected(r, /transactions\[2\]\.type/)
    }
  })

  it('ids that are not strings, empty or duplicated in each collection', () => {
    for (const key of ['transactions', 'categories', 'budgets'] as const) {
      for (const bad of ['', 7, null, undefined, {}]) {
        const r = raw()
        at(r[key], 0).id = bad
        expectRejected(r, new RegExp(`${key}\\[0\\]\\.id`))
      }
      const r = raw()
      at(r[key], 1).id = at(r[key], 0).id
      expectRejected(r, new RegExp(`duplicate id .* in ${key}`))
    }
  })

  it('category and budget elements that are not objects', () => {
    const c = raw()
    c.categories.push('x' as never)
    expectRejected(c, /categories\[15\] is not an object/)
    const b = raw()
    b.budgets.push(null as never)
    expectRejected(b, /budgets\[2\] is not an object/)
  })

  it('a missing (non-string) categoryId', () => {
    for (const bad of [undefined, null, 5, {}]) {
      const r = raw()
      at(r.transactions, 5).categoryId = bad
      expectRejected(r, /transactions\[5\]\.categoryId/)
    }
  })

  it('does not accumulate warnings from a rejected payload', () => {
    const r = raw()
    at(r.categories, 0).color = 'magenta'
    at(r.transactions, 0).amountCents = 0
    expectRejected(r)
  })
})

// ----------------------------------------------------------------------------
// validateAppData — NORMALIZA (one Spanish warning per adjustment)
// ----------------------------------------------------------------------------

describe('validateAppData normalizes', () => {
  it('the §3.7 fixture round-trips with no warnings and deep-equal data', () => {
    const r = validateAppData(raw())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.warnings).toEqual([])
    expect(r.value.data).toEqual(fixtureData())
    expect(() => assertInvariants(r.value.data)).not.toThrow()
  })

  it('the seeded state round-trips with no warnings', () => {
    const r = validateAppData(JSON.parse(JSON.stringify(seedData(0))))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.warnings).toEqual([])
      expect(r.value.data).toEqual(seedData(0))
    }
  })

  it('drops unknown fields everywhere without a warning', () => {
    const r = raw()
    r.extra = { anything: true }
    at(r.transactions, 0).foo = 'bar'
    at(r.categories, 0).legacyColor = '#fff'
    at(r.budgets, 0).month = '2026-09'
    r.settings.unknownFlag = true
    const { data, warnings } = expectNormalized(r, 0)
    expect(warnings).toEqual([])
    expect(data).toEqual(fixtureData())
    expect(Object.keys(data)).toEqual(['transactions', 'categories', 'budgets', 'settings'])
    expect(Object.keys(at(data.transactions as unknown as Record<string, unknown>[], 0))).not.toContain('foo')
    expect(Object.keys(at(data.categories as unknown as Record<string, unknown>[], 0))).not.toContain('legacyColor')
    expect(Object.keys(at(data.budgets as unknown as Record<string, unknown>[], 0))).not.toContain('month')
    expect(Object.keys(data.settings)).not.toContain('unknownFlag')
  })

  it('a category with an invalid type is discarded and its transactions go to the builtIn of their own type', () => {
    const r = raw()
    const ocio = r.categories.find((c) => c.id === 'cat-ocio')
    if (ocio === undefined) throw new Error('fixture')
    ocio.type = 'weird'
    // t-07 and t-11 use cat-ocio → 1 (category) + 2 (transactions) + 1 (budget b-ocio) adjustments
    const { data, warnings } = expectNormalized(r, 4)
    expect(data.categories.some((c) => c.id === 'cat-ocio')).toBe(false)
    expect(data.categories).toHaveLength(14)
    expect(data.transactions.find((t) => t.id === 't-07')?.categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
    expect(data.transactions.find((t) => t.id === 't-11')?.categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
    expect(data.budgets.map((b) => b.id)).toEqual(['b-total'])
    expect(warnings[0]).toContain('cat-ocio')
    expect(warnings.some((w) => w.includes('Otros gastos'))).toBe(true)
  })

  it('an invalid color becomes gray', () => {
    for (const bad of ['magenta', '', 7, null, undefined]) {
      const r = raw()
      at(r.categories, 1).color = bad
      const { data, warnings } = expectNormalized(r, 1)
      expect(data.categories[1]?.color).toBe('gray')
      expect(warnings[0]).toContain('Restaurantes')
    }
  })

  it('an icon outside EMOJI_CHOICES becomes 📦', () => {
    for (const bad of ['🦄', 'x', '', 3, undefined]) {
      const r = raw()
      at(r.categories, 2).icon = bad
      const { data } = expectNormalized(r, 1)
      expect(data.categories[2]?.icon).toBe('📦')
    }
    const r = raw()
    at(r.categories, 2).icon = EMOJI_CHOICES[41]
    expectNormalized(r, 0)
  })

  it('an empty or non-string name becomes «Categoría {n}»', () => {
    const r = raw()
    at(r.categories, 0).name = ''
    at(r.categories, 3).name = 42
    at(r.categories, 11).name = '   '
    const { data, warnings } = expectNormalized(r, 3)
    expect(data.categories[0]?.name).toBe('Categoría 1')
    expect(data.categories[3]?.name).toBe('Categoría 2')
    expect(data.categories[11]?.name).toBe('Categoría 3')
    expect(warnings[0]).toContain('Categoría 1')
  })

  it('a name longer than 30 characters is truncated (and surrounding whitespace trimmed silently)', () => {
    const r = raw()
    at(r.categories, 0).name = `${'a'.repeat(29)} bcd`
    at(r.categories, 1).name = '  Restaurantes  '
    const { data } = expectNormalized(r, 1)
    expect(data.categories[0]?.name).toBe('a'.repeat(29))
    expect(data.categories[1]?.name).toBe('Restaurantes')
  })

  it('colliding names (case/accent-insensitive, same type) get « (2)», « (3)»…', () => {
    const r = raw()
    at(r.categories, 1).name = 'ócio'
    at(r.categories, 2).name = 'OCIO'
    at(r.categories, 11).name = 'Ocio' // income: no collision
    // Order of appearance wins: index 1 keeps its name, later collisions get (2), (3)…
    const { data, warnings } = expectNormalized(r, 2)
    expect(data.categories[1]?.name).toBe('ócio')
    expect(data.categories[2]?.name).toBe('OCIO (2)')
    expect(data.categories[5]?.name).toBe('Ocio (3)')
    expect(data.categories[11]?.name).toBe('Ocio')
    expect(warnings[0]).toContain('OCIO (2)')
    expect(warnings[1]).toContain('Ocio (3)')
  })

  it('a colliding 30-character name is shortened to fit the suffix', () => {
    const r = raw()
    const long = 'z'.repeat(30)
    at(r.categories, 0).name = long
    at(r.categories, 1).name = long
    const { data } = expectNormalized(r, 1)
    expect(data.categories[0]?.name).toBe(long)
    expect(data.categories[1]?.name).toBe(`${'z'.repeat(26)} (2)`)
    expect(data.categories[1]?.name.length).toBe(30)
  })

  it('truncating a name never splits a surrogate pair (the cut emoji is dropped, the string stays well-formed)', () => {
    const r = raw()
    at(r.categories, 0).name = `${'a'.repeat(29)}😀` // length 31: the cut would land inside 😀
    at(r.categories, 1).name = `${'b'.repeat(28)}😀x` // length 31: 😀 fits, only 'x' is cut
    const { data, warnings } = expectNormalized(r, 2)
    const first = data.categories[0]?.name ?? ''
    const second = data.categories[1]?.name ?? ''
    expect(first).toBe('a'.repeat(29))
    expect(wellFormed(first)).toBe(true)
    expect(second).toBe(`${'b'.repeat(28)}😀`)
    expect(wellFormed(second)).toBe(true)
    expect(second.length).toBe(30)
    for (const w of warnings) expect(wellFormed(w)).toBe(true)
    expect(warnings[0]).toBe(`El nombre de la categoría «${'a'.repeat(29)}» superaba los 30 caracteres y se ha recortado`)
  })

  it('the « (2)» suffix cut never splits a surrogate pair either', () => {
    const r = raw()
    const base = `${'z'.repeat(25)}😀🎉` // length 29: fits, but ' (2)' leaves room for 26 units → cut inside 😀
    at(r.categories, 0).name = base
    at(r.categories, 1).name = base
    const { data } = expectNormalized(r, 1)
    expect(data.categories[0]?.name).toBe(base)
    const renamed = data.categories[1]?.name ?? ''
    expect(renamed).toBe(`${'z'.repeat(25)} (2)`)
    expect(wellFormed(renamed)).toBe(true)
  })

  it('a non-integer or duplicated sortOrder is renumbered by order of appearance within the type', () => {
    const r = raw()
    at(r.categories, 0).sortOrder = 1.5
    at(r.categories, 12).sortOrder = 0 // cat-extras duplicates cat-nomina (income)
    const { data } = expectNormalized(r, 2)
    expect(data.categories.filter((c) => c.type === 'expense').map((c) => c.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(data.categories.filter((c) => c.type === 'income').map((c) => c.sortOrder)).toEqual([0, 1, 2, 3])
    for (const bad of ['1', null, undefined, Number.NaN]) {
      const r2 = raw()
      at(r2.categories, 4).sortOrder = bad
      expectNormalized(r2, 1)
    }
  })

  it('a valid but non-contiguous sortOrder is closed silently keeping the relative order', () => {
    const r = raw()
    at(r.categories, 0).sortOrder = 100
    at(r.categories, 1).sortOrder = -7
    const { data } = expectNormalized(r, 0)
    const expense = data.categories.filter((c) => c.type === 'expense')
    expect(expense[1]?.sortOrder).toBe(0)
    expect(expense[0]?.sortOrder).toBe(10)
    expect(expense[2]?.sortOrder).toBe(1)
    expect(expense[10]?.sortOrder).toBe(9)
  })

  it('a non-boolean builtIn becomes false', () => {
    const r = raw()
    at(r.categories, 0).builtIn = 'yes'
    at(r.categories, 1).builtIn = undefined
    const { data } = expectNormalized(r, 2)
    expect(data.categories[0]?.builtIn).toBe(false)
    expect(data.categories[1]?.builtIn).toBe(false)
  })

  it('a missing builtIn category is recreated with its WELL_KNOWN id at the end of its type', () => {
    const r = raw()
    r.categories = r.categories.filter((c) => c.id !== WELL_KNOWN_IDS.otherExpense && c.id !== WELL_KNOWN_IDS.otherIncome)
    const { data, warnings } = expectNormalized(r, 2)
    const otherExpense = data.categories.find((c) => c.id === WELL_KNOWN_IDS.otherExpense)
    const otherIncome = data.categories.find((c) => c.id === WELL_KNOWN_IDS.otherIncome)
    expect(otherExpense).toEqual(DEFAULT_CATEGORIES.find((c) => c.id === WELL_KNOWN_IDS.otherExpense))
    expect(otherIncome).toEqual(DEFAULT_CATEGORIES.find((c) => c.id === WELL_KNOWN_IDS.otherIncome))
    expect(warnings).toEqual(['Se ha recreado la categoría «Otros gastos»', 'Se ha recreado la categoría «Otros ingresos»'])
  })

  it('a builtIn whose sole categories were missing gets sortOrder 0', () => {
    const r = raw()
    r.categories = r.categories.filter((c) => c.type === 'expense')
    r.transactions = r.transactions.filter((t) => t.type === 'expense')
    r.settings.lastUsedCategoryId = { expense: 'cat-suscripciones', income: null }
    const { data } = expectNormalized(r, 1)
    expect(data.categories.filter((c) => c.type === 'income')).toEqual([
      { ...DEFAULT_CATEGORIES.find((c) => c.id === WELL_KNOWN_IDS.otherIncome), sortOrder: 0 },
    ])
  })

  it('a non-builtIn category marked builtIn is demoted; the well-known one is promoted', () => {
    const r = raw()
    at(r.categories, 0).builtIn = true
    at(r.categories, 10).builtIn = false
    const { data } = expectNormalized(r, 2)
    expect(data.categories[0]?.builtIn).toBe(false)
    expect(data.categories[10]?.builtIn).toBe(true)
    expect(data.categories.filter((c) => c.builtIn).map((c) => c.id)).toEqual([WELL_KNOWN_IDS.otherExpense, WELL_KNOWN_IDS.otherIncome])
  })

  it('the well-known category with the wrong type is returned to its type', () => {
    const r = raw()
    at(r.categories, 10).type = 'income'
    const { data } = expectNormalized(r, 1)
    const other = data.categories.find((c) => c.id === WELL_KNOWN_IDS.otherExpense)
    expect(other?.type).toBe('expense')
    expect(other?.builtIn).toBe(true)
  })

  it('a transaction with a nonexistent categoryId goes to the builtIn of its type', () => {
    const r = raw()
    at(r.transactions, 0).categoryId = 'cat-missing' // income
    at(r.transactions, 1).categoryId = '' // expense
    const { data, warnings } = expectNormalized(r, 2)
    expect(data.transactions[0]?.categoryId).toBe(WELL_KNOWN_IDS.otherIncome)
    expect(data.transactions[1]?.categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
    expect(warnings[0]).toContain('Otros ingresos')
    expect(warnings[1]).toContain('Otros gastos')
  })

  it('a transaction with a categoryId of another type goes to the builtIn of its own type', () => {
    const r = raw()
    at(r.transactions, 0).categoryId = 'cat-ocio' // income tx, expense category
    at(r.transactions, 1).categoryId = 'cat-nomina' // expense tx, income category
    const { data } = expectNormalized(r, 2)
    expect(data.transactions[0]?.categoryId).toBe(WELL_KNOWN_IDS.otherIncome)
    expect(data.transactions[1]?.categoryId).toBe(WELL_KNOWN_IDS.otherExpense)
  })

  it('a non-string note becomes empty and a long note is cut to 140', () => {
    const r = raw()
    at(r.transactions, 0).note = 7
    at(r.transactions, 1).note = undefined
    at(r.transactions, 2).note = 'n'.repeat(141)
    at(r.transactions, 3).note = '  trimmed  '
    const { data } = expectNormalized(r, 3)
    expect(data.transactions[0]?.note).toBe('')
    expect(data.transactions[1]?.note).toBe('')
    expect(data.transactions[2]?.note).toBe('n'.repeat(140))
    expect(data.transactions[3]?.note).toBe('trimmed')
  })

  it('cutting a note never splits a surrogate pair', () => {
    const r = raw()
    at(r.transactions, 0).note = `${'b'.repeat(139)}😀` // length 141: the cut would land inside 😀
    at(r.transactions, 1).note = `${'c'.repeat(138)}😀x` // length 141: 😀 fits
    const { data, warnings } = expectNormalized(r, 2)
    const first = data.transactions[0]?.note ?? ''
    const second = data.transactions[1]?.note ?? ''
    expect(first).toBe('b'.repeat(139))
    expect(wellFormed(first)).toBe(true)
    expect(second).toBe(`${'c'.repeat(138)}😀`)
    expect(wellFormed(second)).toBe(true)
    expect(second.length).toBe(140)
    expect(warnings).toHaveLength(2)
  })

  it('createdAt / updatedAt that are not safe integers become 0 (never reads the clock)', () => {
    const r = raw()
    at(r.transactions, 0).createdAt = 1.5
    at(r.transactions, 0).updatedAt = 'ayer'
    at(r.transactions, 1).createdAt = undefined
    const { data } = expectNormalized(r, 3)
    expect(data.transactions[0]?.createdAt).toBe(0)
    expect(data.transactions[0]?.updatedAt).toBe(0)
    expect(data.transactions[1]?.createdAt).toBe(0)
    expect(data.transactions[1]?.updatedAt).toBe(BASE + 2 * DAY)
  })

  it('a duplicated budget (same categoryId, including two totals) is discarded', () => {
    const r = raw()
    r.budgets.push({ id: 'b-ocio-2', categoryId: 'cat-ocio', limitCents: 5000 })
    r.budgets.push({ id: 'b-total-2', categoryId: null, limitCents: 5000 })
    const { data, warnings } = expectNormalized(r, 2)
    expect(data.budgets.map((b) => b.id)).toEqual(['b-ocio', 'b-total'])
    expect(warnings[0]).toContain('b-ocio-2')
  })

  it('a budget on an income or nonexistent category, or with a bad categoryId type, is discarded', () => {
    const r = raw()
    r.budgets.push({ id: 'b-nomina', categoryId: 'cat-nomina', limitCents: 5000 })
    r.budgets.push({ id: 'b-ghost', categoryId: 'cat-ghost', limitCents: 5000 })
    r.budgets.push({ id: 'b-undef', limitCents: 5000 })
    r.budgets.push({ id: 'b-num', categoryId: 3, limitCents: 5000 })
    const { data } = expectNormalized(r, 4)
    expect(data.budgets.map((b) => b.id)).toEqual(['b-ocio', 'b-total'])
  })

  it('a budget whose limitCents is not an integer > 0 is discarded', () => {
    for (const bad of [0, -1, 12.5, '1000', null, undefined, MAX_CENTS + 1]) {
      const r = raw()
      at(r.budgets, 0).limitCents = bad
      const { data } = expectNormalized(r, 1)
      expect(data.budgets.map((b) => b.id)).toEqual(['b-total'])
    }
  })

  it('settings that are not an object are replaced by the defaults with one warning', () => {
    for (const bad of [undefined, null, 'x', [], 5]) {
      const r = raw()
      r.settings = bad as never
      const { data } = expectNormalized(r, 1)
      expect(data.settings).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('partial settings get defaults per field, each with a warning', () => {
    const r = raw()
    r.settings = {}
    const { data, warnings } = expectNormalized(r, 6)
    expect(data.settings).toEqual(DEFAULT_SETTINGS)
    expect(warnings).toHaveLength(6)

    const r2 = raw()
    r2.settings = { currency: 'USD', locale: 'es-ES', theme: 'dark', initialBalanceCents: -500, lastUsedCategoryId: { expense: null, income: null }, budgetWarnRatio: 0.5 }
    const { data: d2 } = expectNormalized(r2, 0)
    expect(d2.settings).toEqual({ currency: 'USD', locale: 'es-ES', theme: 'dark', initialBalanceCents: -500, lastUsedCategoryId: { expense: null, income: null }, budgetWarnRatio: 0.5 })
  })

  it('currency that is not a 3-letter code becomes EUR', () => {
    for (const bad of ['eur', 'EURO', 'E', '', 3, null, undefined, 'bitcoin']) {
      const r = raw()
      r.settings.currency = bad
      const { data } = expectNormalized(r, 1)
      expect(data.settings.currency).toBe('EUR')
    }
    const r = raw()
    r.settings.currency = 'XXX'
    expect(expectNormalized(r, 0).data.settings.currency).toBe('XXX')
  })

  it('an unknown theme becomes system, a wrong locale becomes es-ES', () => {
    for (const bad of ['blue', '', null, undefined, 1]) {
      const r = raw()
      r.settings.theme = bad
      expect(expectNormalized(r, 1).data.settings.theme).toBe('system')
    }
    const r = raw()
    r.settings.locale = 'en-US'
    expect(expectNormalized(r, 1).data.settings.locale).toBe('es-ES')
  })

  it('initialBalanceCents that is not a safe integer becomes 0', () => {
    for (const bad of [1.5, '100', null, undefined, Number.NaN, 2 ** 53]) {
      const r = raw()
      r.settings.initialBalanceCents = bad
      expect(expectNormalized(r, 1).data.settings.initialBalanceCents).toBe(0)
    }
    const r = raw()
    r.settings.initialBalanceCents = -1234
    expect(expectNormalized(r, 0).data.settings.initialBalanceCents).toBe(-1234)
  })

  it('lastUsedCategoryId with a nonexistent id, an id of the other type or a bad shape becomes null', () => {
    const r = raw()
    r.settings.lastUsedCategoryId = { expense: 'cat-ghost', income: 'cat-ocio' }
    const { data } = expectNormalized(r, 2)
    expect(data.settings.lastUsedCategoryId).toEqual({ expense: null, income: null })

    const r2 = raw()
    r2.settings.lastUsedCategoryId = { expense: 'cat-ocio' }
    expect(expectNormalized(r2, 1).data.settings.lastUsedCategoryId).toEqual({ expense: 'cat-ocio', income: null })

    const r3 = raw()
    r3.settings.lastUsedCategoryId = 'cat-ocio'
    expect(expectNormalized(r3, 1).data.settings.lastUsedCategoryId).toEqual({ expense: null, income: null })

    const r4 = raw()
    r4.settings.lastUsedCategoryId = { expense: 7, income: null }
    expect(expectNormalized(r4, 1).data.settings.lastUsedCategoryId).toEqual({ expense: null, income: null })
  })

  it('lastUsedCategoryId pointing to a discarded category becomes null', () => {
    const r = raw()
    const sub = r.categories.find((c) => c.id === 'cat-suscripciones')
    if (sub === undefined) throw new Error('fixture')
    sub.type = 'nope'
    // category discarded (1) + t-12 reassigned (1) + lastUsed reset (1)
    const { data } = expectNormalized(r, 3)
    expect(data.settings.lastUsedCategoryId.expense).toBeNull()
  })

  it('budgetWarnRatio outside (0, 1) becomes 0.8', () => {
    for (const bad of [0, 1, -0.5, 1.5, '0.8', null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = raw()
      r.settings.budgetWarnRatio = bad
      expect(expectNormalized(r, 1).data.settings.budgetWarnRatio).toBe(0.8)
    }
    const r = raw()
    r.settings.budgetWarnRatio = 0.999
    expect(expectNormalized(r, 0).data.settings.budgetWarnRatio).toBe(0.999)
  })

  it('warnings.length equals the number of adjustments across a combined payload', () => {
    const r = raw()
    at(r.categories, 0).color = 'bad' // 1
    at(r.categories, 1).icon = 'bad' // 1
    at(r.categories, 2).name = '' // 1
    at(r.transactions, 0).note = 'x'.repeat(200) // 1
    at(r.transactions, 1).categoryId = 'ghost' // 1
    at(r.transactions, 2).createdAt = 'x' // 1
    r.budgets.push({ id: 'dup', categoryId: null, limitCents: 1 }) // 1
    r.settings.theme = 'neon' // 1
    r.settings.budgetWarnRatio = 2 // 1
    const { warnings } = expectNormalized(r, 9)
    expect(new Set(warnings).size).toBe(9)
  })

  it('accepts an empty but well-formed state (recreating both builtIn categories)', () => {
    const { data, warnings } = expectNormalized({ transactions: [], categories: [], budgets: [], settings: {} }, 2 + 6)
    expect(data.categories.map((c) => c.id)).toEqual([WELL_KNOWN_IDS.otherExpense, WELL_KNOWN_IDS.otherIncome])
    expect(data.categories.map((c) => c.sortOrder)).toEqual([0, 0])
    expect(warnings).toHaveLength(8)
  })
})

// ----------------------------------------------------------------------------
// assertInvariants
// ----------------------------------------------------------------------------

describe('assertInvariants', () => {
  it('seedData passes', () => {
    expect(() => assertInvariants(seedData(0))).not.toThrow()
    expect(() => assertInvariants(seedData(1_783_900_800_000))).not.toThrow()
    expect(findInvariantViolation(seedData(0))).toBeNull()
  })

  it('the §3.7 fixture passes', () => {
    expect(() => assertInvariants(fixtureData())).not.toThrow()
  })

  function broken(mutate: (d: AppData) => void): () => void {
    const d = fixtureData()
    mutate(d)
    return () => assertInvariants(d)
  }

  function first<T>(items: T[]): T {
    const item = items[0]
    if (item === undefined) throw new Error('empty')
    return item
  }

  it('throws with a descriptive message for each broken invariant', () => {
    expect(broken((d) => { first(d.transactions).id = 't-02' })).toThrow(/duplicate transaction id "t-02"/)
    expect(broken((d) => { first(d.categories).id = 'cat-ocio' })).toThrow(/duplicate category id/)
    expect(broken((d) => { first(d.budgets).id = 'b-total' })).toThrow(/duplicate budget id/)
    expect(broken((d) => { first(d.transactions).id = '' })).toThrow(/transaction has no id/)
    expect(broken((d) => { first(d.transactions).categoryId = 'ghost' })).toThrow(/unknown category/)
    expect(broken((d) => { first(d.transactions).categoryId = 'cat-ocio' })).toThrow(/another type/)
    expect(broken((d) => { first(d.transactions).amountCents = 0 })).toThrow(/amountCents/)
    expect(broken((d) => { first(d.transactions).amountCents = 12.5 })).toThrow(/amountCents/)
    expect(broken((d) => { first(d.transactions).amountCents = MAX_CENTS + 1 })).toThrow(/amountCents/)
    expect(broken((d) => { first(d.transactions).date = '2026-02-30' })).toThrow(/invalid date/)
    expect(broken((d) => { first(d.transactions).type = 'transfer' as never })).toThrow(/unknown type/)
    expect(broken((d) => { first(d.transactions).note = 'x'.repeat(141) })).toThrow(/invalid note/)
    expect(broken((d) => { first(d.transactions).createdAt = 1.5 })).toThrow(/timestamps/)
    expect(broken((d) => { first(d.categories).type = 'x' as never })).toThrow(/unknown type/)
    expect(broken((d) => { first(d.categories).name = '' })).toThrow(/invalid name/)
    expect(broken((d) => { first(d.categories).name = ' Alimentación' })).toThrow(/invalid name/)
    expect(broken((d) => { first(d.categories).name = 'x'.repeat(31) })).toThrow(/invalid name/)
    expect(broken((d) => { first(d.categories).name = 'ócio' })).toThrow(/duplicate category name/)
    expect(broken((d) => { first(d.categories).icon = '🦄' })).toThrow(/EMOJI_CHOICES/)
    expect(broken((d) => { first(d.categories).color = 'magenta' as never })).toThrow(/invalid color/)
    expect(broken((d) => { first(d.categories).sortOrder = 1.5 })).toThrow(/non-integer sortOrder/)
    expect(broken((d) => { first(d.categories).sortOrder = 1 })).toThrow(/not contiguous/)
    expect(broken((d) => { first(d.categories).sortOrder = 11 })).toThrow(/not contiguous/)
    expect(broken((d) => { first(d.categories).builtIn = 'yes' as never })).toThrow(/non-boolean builtIn/)
    expect(broken((d) => { first(d.categories).builtIn = true })).toThrow(/exactly one builtIn expense category, found 2/)
    expect(broken((d) => { d.categories = d.categories.filter((c) => !c.builtIn) })).toThrow(/exactly one builtIn/)
    expect(
      broken((d) => {
        d.categories = d.categories.map((c) => (c.type === 'expense' ? { ...c, builtIn: c.id === 'cat-ocio' } : c))
      }),
    ).toThrow(/must have id "cat-otros-gastos"/)
    expect(broken((d) => { first(d.budgets).categoryId = 'ghost' })).toThrow(/unknown category/)
    expect(broken((d) => { first(d.budgets).categoryId = 'cat-nomina' })).toThrow(/income category/)
    expect(broken((d) => { first(d.budgets).categoryId = null })).toThrow(/duplicate budget for category null/)
    expect(broken((d) => { first(d.budgets).limitCents = 0 })).toThrow(/limitCents/)
    expect(broken((d) => { d.settings.currency = 'eur' })).toThrow(/currency/)
    expect(broken((d) => { d.settings.locale = 'en' as never })).toThrow(/locale/)
    expect(broken((d) => { d.settings.theme = 'neon' as never })).toThrow(/theme/)
    expect(broken((d) => { d.settings.initialBalanceCents = 0.5 })).toThrow(/initialBalanceCents/)
    expect(broken((d) => { d.settings.lastUsedCategoryId.expense = 'ghost' })).toThrow(/lastUsedCategoryId\.expense/)
    expect(broken((d) => { d.settings.lastUsedCategoryId.income = 'cat-ocio' })).toThrow(/lastUsedCategoryId\.income/)
    expect(broken((d) => { d.settings.budgetWarnRatio = 1 })).toThrow(/budgetWarnRatio/)
    expect(broken((d) => { d.settings = null as never })).toThrow(/settings/)
    expect(broken((d) => { d.transactions = null as never })).toThrow(/transactions/)
    expect(() => assertInvariants(null as never)).toThrow(/Invariant violated/)
  })

  it('reports non-object elements', () => {
    expect(broken((d) => { d.transactions.push(null as never) })).toThrow(/not an object/)
    expect(broken((d) => { d.categories.push('x' as never) })).toThrow(/not an object/)
    expect(broken((d) => { d.budgets.push(3 as never) })).toThrow(/not an object/)
    expect(broken((d) => { d.categories.push({ ...first(d.categories), id: '' }) })).toThrow(/no id/)
    expect(broken((d) => { d.budgets.push({ id: '', categoryId: null, limitCents: 1 }) })).toThrow(/no id/)
    expect(broken((d) => { d.settings.lastUsedCategoryId = 'x' as never })).toThrow(/lastUsedCategoryId/)
  })
})
