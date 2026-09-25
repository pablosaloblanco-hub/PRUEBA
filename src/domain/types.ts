// ============================================================================
// src/domain/types.ts — tipos y constantes puros. Sin React, sin DOM.
// Convenciones (verificadas por src/domain/validate.ts):
//   - Dinero SIEMPRE en céntimos enteros (Cents). Nunca floats.
//   - Fechas locales 'YYYY-MM-DD' (LocalDate) y meses 'YYYY-MM' (MonthKey),
//     construidas con getFullYear/getMonth/getDate, nunca con toISOString.
//   - erasableSyntaxOnly: objetos `as const` + tipos unión en lugar de enums.
// ============================================================================

/** Céntimos enteros. En campos persistidos > 0 salvo Settings.initialBalanceCents. */
export type Cents = number
/** 'YYYY-MM-DD' local. El orden lexicográfico coincide con el cronológico. */
export type LocalDate = string
/** 'YYYY-MM' */
export type MonthKey = string
/** UUID v4 (crypto.randomUUID) o 'cat-…' para las categorías sembradas. */
export type Id = string
/** Milisegundos epoch. Solo para orden estable y auditoría; nunca fecha de negocio. */
export type Timestamp = number

export const CENTS_PER_UNIT = 100
/** 999.999.999,99 → sumas de 100k filas siguen muy por debajo de 2^53. */
export const MAX_CENTS = 99_999_999_999
export const MAX_NOTE_LENGTH = 140
export const MAX_CATEGORY_NAME_LENGTH = 30
/** Rango navegable del selector de mes; `month/shift` recorta a estos límites. */
export const MIN_MONTH: MonthKey = '2000-01'
export const MAX_MONTH: MonthKey = '2099-12'

export const TransactionType = { expense: 'expense', income: 'income' } as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

/** Claves de color de categoría; el UI las resuelve a --series-1..8 / --series-other. */
export const ColorKey = {
  blue: 'blue', orange: 'orange', teal: 'teal', amber: 'amber',
  pink: 'pink', green: 'green', violet: 'violet', red: 'red', gray: 'gray',
} as const
export type ColorKey = (typeof ColorKey)[keyof typeof ColorKey]

export type Transaction = {
  id: Id
  type: TransactionType
  /** Entero 1..MAX_CENTS. El signo lo da `type`, nunca el importe. */
  amountCents: Cents
  date: LocalDate
  /** Debe existir y ser del mismo `type`. */
  categoryId: Id
  /** Recortada, 0..140 caracteres, '' permitido. */
  note: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Category = {
  id: Id
  /** Recortado, 1..30 caracteres, único por `type` sin distinguir mayúsculas/acentos. */
  name: string
  type: TransactionType
  /** Un emoji de la lista fija EMOJI_CHOICES. */
  icon: string
  color: ColorKey
  /** Orden ascendente dentro de su tipo. */
  sortOrder: number
  /** «Otros gastos» / «Otros ingresos»: no se pueden eliminar; destino de reasignación. */
  builtIn: boolean
}

export type Budget = {
  id: Id
  /** null = presupuesto total mensual. Como máximo uno por categoryId (y uno con null). */
  categoryId: Id | null
  /** Entero > 0. Se aplica a todos los meses. */
  limitCents: Cents
}

export const Theme = { system: 'system', light: 'light', dark: 'dark' } as const
export type Theme = (typeof Theme)[keyof typeof Theme]

export const SUPPORTED_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL',
] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export type Settings = {
  /** Solo formato; cambiarla nunca convierte importes. Se guarda como string por si un import trae otro código. */
  currency: string
  /** Fijo en v1; guardado para que una futura i18n tenga hogar. */
  locale: 'es-ES'
  theme: Theme
  /** Entero, puede ser negativo o 0. Se suma al saldo total. */
  initialBalanceCents: Cents
  /** Preselección de la hoja de alta, por tipo. */
  lastUsedCategoryId: Record<TransactionType, Id | null>
  /** 0 < x < 1. Umbral de aviso de presupuesto. Default 0.8. */
  budgetWarnRatio: number
}

/** Estado de dominio completo. Inmutable: el reducer devuelve objetos nuevos. */
export type AppData = {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  settings: Settings
}

export const WELL_KNOWN_IDS = {
  otherExpense: 'cat-otros-gastos',
  otherIncome: 'cat-otros-ingresos',
} as const

/** Resultado genérico sin excepciones. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
