import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, EMOJI_CHOICES, seedData } from './seed'
import { ColorKey, SUPPORTED_CURRENCIES, Theme, WELL_KNOWN_IDS } from './types'
import type { Category, TransactionType } from './types'

// `seedData(now)` must also pass `assertInvariants` (§10.1); that assertion lives in
// validate.test.ts because validate.ts is built by another module owner.

const byType = (type: TransactionType): Category[] => DEFAULT_CATEGORIES.filter((c) => c.type === type)

describe('DEFAULT_CATEGORIES (§3.4)', () => {
  it('has 11 expense and 4 income categories', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(15)
    expect(byType('expense')).toHaveLength(11)
    expect(byType('income')).toHaveLength(4)
  })

  it('has unique ids and unique names per type', () => {
    expect(new Set(DEFAULT_CATEGORIES.map((c) => c.id)).size).toBe(15)
    for (const type of ['expense', 'income'] as const) {
      const names = byType(type).map((c) => c.name.toLowerCase())
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('has exactly one builtIn per type with the well-known ids', () => {
    const expenseBuiltIn = byType('expense').filter((c) => c.builtIn)
    const incomeBuiltIn = byType('income').filter((c) => c.builtIn)
    expect(expenseBuiltIn).toHaveLength(1)
    expect(incomeBuiltIn).toHaveLength(1)
    expect(expenseBuiltIn[0]?.id).toBe(WELL_KNOWN_IDS.otherExpense)
    expect(expenseBuiltIn[0]?.name).toBe('Otros gastos')
    expect(incomeBuiltIn[0]?.id).toBe(WELL_KNOWN_IDS.otherIncome)
    expect(incomeBuiltIn[0]?.name).toBe('Otros ingresos')
  })

  it('sortOrder is contiguous from 0 within each type', () => {
    for (const type of ['expense', 'income'] as const) {
      const orders = byType(type).map((c) => c.sortOrder)
      expect(orders).toEqual(orders.map((_, i) => i))
    }
  })

  it('every icon belongs to EMOJI_CHOICES and every color to ColorKey', () => {
    const choices: readonly string[] = EMOJI_CHOICES
    for (const c of DEFAULT_CATEGORIES) {
      expect(choices).toContain(c.icon)
      expect(Object.values(ColorKey)).toContain(c.color)
    }
  })

  it('matches the §3.4 table exactly', () => {
    const table: [string, string, TransactionType, string, ColorKey, number, boolean][] = [
      ['cat-alimentacion', 'Alimentación', 'expense', '🛒', 'blue', 0, false],
      ['cat-restaurantes', 'Restaurantes', 'expense', '🍽️', 'orange', 1, false],
      ['cat-transporte', 'Transporte', 'expense', '🚌', 'teal', 2, false],
      ['cat-vivienda', 'Vivienda', 'expense', '🏠', 'violet', 3, false],
      ['cat-suministros', 'Suministros', 'expense', '💡', 'amber', 4, false],
      ['cat-ocio', 'Ocio', 'expense', '🎬', 'pink', 5, false],
      ['cat-salud', 'Salud', 'expense', '💊', 'red', 6, false],
      ['cat-compras', 'Compras', 'expense', '👕', 'green', 7, false],
      ['cat-suscripciones', 'Suscripciones', 'expense', '📱', 'violet', 8, false],
      ['cat-educacion', 'Educación', 'expense', '📚', 'blue', 9, false],
      ['cat-otros-gastos', 'Otros gastos', 'expense', '📦', 'gray', 10, true],
      ['cat-nomina', 'Nómina', 'income', '💼', 'green', 0, false],
      ['cat-extras', 'Extras', 'income', '💶', 'teal', 1, false],
      ['cat-devoluciones', 'Devoluciones', 'income', '↩️', 'blue', 2, false],
      ['cat-otros-ingresos', 'Otros ingresos', 'income', '➕', 'gray', 3, true],
    ]
    expect(DEFAULT_CATEGORIES).toEqual(
      table.map(([id, name, type, icon, color, sortOrder, builtIn]) => ({ id, name, type, icon, color, sortOrder, builtIn })),
    )
  })

  it('names are trimmed and within 1..30 characters', () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(c.name).toBe(c.name.trim())
      expect(c.name.length).toBeGreaterThanOrEqual(1)
      expect(c.name.length).toBeLessThanOrEqual(30)
    }
  })
})

describe('EMOJI_CHOICES', () => {
  it('starts with the 40 palette emojis of §3.4 in order, plus the two seeded icons missing from it', () => {
    expect(EMOJI_CHOICES).toHaveLength(42)
    expect(new Set(EMOJI_CHOICES).size).toBe(42)
    expect(EMOJI_CHOICES[0]).toBe('🛒')
    expect(EMOJI_CHOICES[1]).toBe('🍽️')
    expect(EMOJI_CHOICES[37]).toBe('📦')
    expect(EMOJI_CHOICES[39]).toBe('💶')
    expect(EMOJI_CHOICES).toEqual([
      '🛒', '🍽️', '☕', '🍺', '🚌', '🚗', '⛽', '🏠', '💡', '📶',
      '🎬', '🎮', '🎵', '📚', '💊', '🏥', '💪', '👕', '🛍️', '💇',
      '🎁', '✈️', '🏖️', '🐶', '👶', '🧾', '💳', '🏦', '📱', '💻',
      '🔧', '🧹', '🎓', '🎉', '⚽', '🚲', '🍼', '📦', '💼', '💶',
      '↩️', '➕',
    ])
    expect(EMOJI_CHOICES.slice(0, 40)).toHaveLength(40)
  })
})

describe('DEFAULT_SETTINGS (§3.5)', () => {
  it('is valid', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      currency: 'EUR',
      locale: 'es-ES',
      theme: 'system',
      initialBalanceCents: 0,
      lastUsedCategoryId: { expense: null, income: null },
      budgetWarnRatio: 0.8,
    })
    expect(SUPPORTED_CURRENCIES).toContain(DEFAULT_SETTINGS.currency)
    expect(Object.values(Theme)).toContain(DEFAULT_SETTINGS.theme)
    expect(Number.isSafeInteger(DEFAULT_SETTINGS.initialBalanceCents)).toBe(true)
    expect(DEFAULT_SETTINGS.budgetWarnRatio).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.budgetWarnRatio).toBeLessThan(1)
  })
})

describe('seedData', () => {
  it('returns the 15 categories, no transactions, no budgets and default settings', () => {
    const data = seedData(1_783_900_800_000)
    expect(data.transactions).toEqual([])
    expect(data.budgets).toEqual([])
    expect(data.categories).toEqual(DEFAULT_CATEGORIES)
    expect(data.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('returns fresh objects on every call (no shared mutable state)', () => {
    const a = seedData(0)
    const b = seedData(0)
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.categories).not.toBe(b.categories)
    expect(a.categories[0]).not.toBe(b.categories[0])
    expect(a.categories[0]).not.toBe(DEFAULT_CATEGORIES[0])
    expect(a.settings).not.toBe(DEFAULT_SETTINGS)
    expect(a.settings.lastUsedCategoryId).not.toBe(DEFAULT_SETTINGS.lastUsedCategoryId)

    const first = a.categories[0]
    if (first === undefined) throw new Error('unreachable')
    first.name = 'Mutated'
    a.settings.lastUsedCategoryId.expense = 'cat-ocio'
    a.transactions.push({
      id: 'x', type: 'expense', amountCents: 1, date: '2026-09-25', categoryId: 'cat-ocio', note: '', createdAt: 0, updatedAt: 0,
    })
    expect(b.categories[0]?.name).toBe('Alimentación')
    expect(DEFAULT_CATEGORIES[0]?.name).toBe('Alimentación')
    expect(b.settings.lastUsedCategoryId.expense).toBeNull()
    expect(DEFAULT_SETTINGS.lastUsedCategoryId.expense).toBeNull()
    expect(seedData(0).transactions).toEqual([])
  })
})
