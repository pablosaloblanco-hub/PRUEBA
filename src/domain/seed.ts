// ============================================================================
// src/domain/seed.ts — default categories, emoji palette, default settings and
// the seeded AppData for a first run. Pure TypeScript; no React, no DOM.
// ============================================================================
import type { AppData, Category, Settings, Timestamp } from './types'

/**
 * The fixed emoji choices of the category sheet: the 40 of §3.4 in order, plus
 * the two icons the §3.4 seed table uses for «Devoluciones» (↩️) and «Otros
 * ingresos» (➕). The spec lists them in the seed table but not in the palette,
 * and §4.4 normalizes any icon outside EMOJI_CHOICES to 📦, so they must be
 * members for the seeded data and the §3.7 fixture to validate without warnings.
 */
export const EMOJI_CHOICES = [
  '🛒', '🍽️', '☕', '🍺', '🚌', '🚗', '⛽', '🏠', '💡', '📶',
  '🎬', '🎮', '🎵', '📚', '💊', '🏥', '💪', '👕', '🛍️', '💇',
  '🎁', '✈️', '🏖️', '🐶', '👶', '🧾', '💳', '🏦', '📱', '💻',
  '🔧', '🧹', '🎓', '🎉', '⚽', '🚲', '🍼', '📦', '💼', '💶',
  '↩️', '➕',
] as const
export type EmojiChoice = (typeof EMOJI_CHOICES)[number]

/** Default categories (§3.4). Seeded ids are stable so fixtures and migrations can reference them. */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'cat-alimentacion', name: 'Alimentación', type: 'expense', icon: '🛒', color: 'blue', sortOrder: 0, builtIn: false },
  { id: 'cat-restaurantes', name: 'Restaurantes', type: 'expense', icon: '🍽️', color: 'orange', sortOrder: 1, builtIn: false },
  { id: 'cat-transporte', name: 'Transporte', type: 'expense', icon: '🚌', color: 'teal', sortOrder: 2, builtIn: false },
  { id: 'cat-vivienda', name: 'Vivienda', type: 'expense', icon: '🏠', color: 'violet', sortOrder: 3, builtIn: false },
  { id: 'cat-suministros', name: 'Suministros', type: 'expense', icon: '💡', color: 'amber', sortOrder: 4, builtIn: false },
  { id: 'cat-ocio', name: 'Ocio', type: 'expense', icon: '🎬', color: 'pink', sortOrder: 5, builtIn: false },
  { id: 'cat-salud', name: 'Salud', type: 'expense', icon: '💊', color: 'red', sortOrder: 6, builtIn: false },
  { id: 'cat-compras', name: 'Compras', type: 'expense', icon: '👕', color: 'green', sortOrder: 7, builtIn: false },
  { id: 'cat-suscripciones', name: 'Suscripciones', type: 'expense', icon: '📱', color: 'violet', sortOrder: 8, builtIn: false },
  { id: 'cat-educacion', name: 'Educación', type: 'expense', icon: '📚', color: 'blue', sortOrder: 9, builtIn: false },
  { id: 'cat-otros-gastos', name: 'Otros gastos', type: 'expense', icon: '📦', color: 'gray', sortOrder: 10, builtIn: true },
  { id: 'cat-nomina', name: 'Nómina', type: 'income', icon: '💼', color: 'green', sortOrder: 0, builtIn: false },
  { id: 'cat-extras', name: 'Extras', type: 'income', icon: '💶', color: 'teal', sortOrder: 1, builtIn: false },
  { id: 'cat-devoluciones', name: 'Devoluciones', type: 'income', icon: '↩️', color: 'blue', sortOrder: 2, builtIn: false },
  { id: 'cat-otros-ingresos', name: 'Otros ingresos', type: 'income', icon: '➕', color: 'gray', sortOrder: 3, builtIn: true },
]

/** Default settings (§3.5). */
export const DEFAULT_SETTINGS: Settings = {
  currency: 'EUR',
  locale: 'es-ES',
  theme: 'system',
  initialBalanceCents: 0,
  lastUsedCategoryId: { expense: null, income: null },
  budgetWarnRatio: 0.8,
}

/**
 * Fresh seeded state for a first run or after «Borrar todos los datos».
 * Returns new objects on every call so callers can never share mutable state.
 * `now` is part of the contract (§3.4) for future seeds that need a timestamp;
 * v1 seeds nothing dated.
 */
export function seedData(_now: Timestamp): AppData {
  return {
    transactions: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    budgets: [],
    settings: {
      ...DEFAULT_SETTINGS,
      lastUsedCategoryId: { ...DEFAULT_SETTINGS.lastUsedCategoryId },
    },
  }
}
