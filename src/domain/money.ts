// ============================================================================
// src/domain/money.ts — money as integer cents. Parsing is a text grammar
// (§4.1): only integer arithmetic on digit strings; no float parsing of the
// full text and no float rounding. The only division by 100 happens right
// before Intl and is never stored.
import type { Cents, Result, TransactionType } from './types'
import { CENTS_PER_UNIT, MAX_CENTS, SUPPORTED_CURRENCIES } from './types'

export type AmountParseError = 'empty' | 'invalid' | 'too-many-decimals' | 'too-large' | 'zero' | 'negative'

/** Currency tokens accepted once at the start or the end of the input, longest first. */
const CURRENCY_TOKENS: readonly string[] = [
  'US$', 'CHF', 'R$', '€', '$', '£',
  ...SUPPORTED_CURRENCIES,
]

const MAX_INT_DIGITS = 9
const LOCALE = 'es-ES'
const FALLBACK_CURRENCY = 'EUR'
const MINUS_SIGN = '−'

function err(error: AmountParseError): Result<Cents, AmountParseError> {
  return { ok: false, error }
}

/** Strips exactly one currency token from the start or the end of `s`. */
function stripCurrency(s: string): string {
  for (const token of CURRENCY_TOKENS) {
    if (s.startsWith(token)) return s.slice(token.length)
  }
  for (const token of CURRENCY_TOKENS) {
    if (s.endsWith(token)) return s.slice(0, s.length - token.length)
  }
  return s
}

/**
 * Splits `body` (only digits, ',' and '.') into integer digits and fraction digits
 * following steps 4–6 of the grammar. Returns null when the shape is invalid.
 */
function splitParts(body: string): { intDigits: string; fracDigits: string } | null {
  const hasComma = body.includes(',')
  const hasDot = body.includes('.')

  if (hasComma && hasDot) {
    // Step 4: the last separator to appear is the decimal one; the other groups thousands.
    const lastComma = body.lastIndexOf(',')
    const lastDot = body.lastIndexOf('.')
    const decimalIndex = Math.max(lastComma, lastDot)
    const thousandsSep = decimalIndex === lastComma ? '.' : ','
    const intPart = body.slice(0, decimalIndex)
    const fracDigits = body.slice(decimalIndex + 1)
    if (!/^[0-9]*$/.test(fracDigits)) return null
    return splitThousands(intPart, thousandsSep, fracDigits)
  }

  if (hasComma) {
    // Step 5: exactly one comma → decimal separator.
    const first = body.indexOf(',')
    if (body.indexOf(',', first + 1) !== -1) return null
    return { intDigits: body.slice(0, first), fracDigits: body.slice(first + 1) }
  }

  if (hasDot) {
    // Step 6: a single dot followed by exactly 3 digits (with digits before it) → thousands;
    // several dots, all followed by 3-digit groups → thousands; anything else → decimal.
    const first = body.indexOf('.')
    const single = body.indexOf('.', first + 1) === -1
    if (single) {
      const before = body.slice(0, first)
      const after = body.slice(first + 1)
      if (before.length > 0 && after.length === 3) return { intDigits: before + after, fracDigits: '' }
      return { intDigits: before, fracDigits: after }
    }
    return splitThousands(body, '.', '')
  }

  return { intDigits: body, fracDigits: '' }
}

/** Validates that `intPart` is digit groups separated by `sep`, every group after the first being exactly 3 digits. */
function splitThousands(intPart: string, sep: string, fracDigits: string): { intDigits: string; fracDigits: string } | null {
  const groups = intPart.split(sep)
  const head = groups[0] ?? ''
  if (!/^[0-9]+$/.test(head)) return null
  for (let i = 1; i < groups.length; i++) {
    if (!/^[0-9]{3}$/.test(groups[i] ?? '')) return null
  }
  return { intDigits: groups.join(''), fracDigits }
}

/**
 * Parses a user-typed amount into integer cents (§4.1 grammar).
 * Accepts `12`, `12,5`, `12.50`, `1.234,56`, `1,234.56`, `,5`, `€12`, `12 USD`…
 */
export function parseAmount(
  input: string,
  opts?: { allowZero?: boolean; allowNegative?: boolean },
): Result<Cents, AmountParseError> {
  // Step 1: trim, drop whitespace (incl. NBSP), a leading '+', and one currency token.
  let s = input.trim().replace(/\s+/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  s = stripCurrency(s)

  // Step 2: empty and sign.
  if (s === '') return err('empty')
  let negative = false
  if (s.startsWith('-')) {
    if (!opts?.allowNegative) return err('negative')
    negative = true
    s = s.slice(1)
  }

  // Step 3: only digits and separators from here on, and at least one digit
  // (a lone '.' or ',' is not an amount, not even a zero).
  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) return err('invalid')

  // Steps 4–6: split into integer and fraction digits.
  const parts = splitParts(s)
  if (parts === null) return err('invalid')

  // Step 7: fraction → cents.
  const { fracDigits } = parts
  if (fracDigits.length > 2) return err('too-many-decimals')
  let fractionCents = 0
  if (fracDigits.length === 1) fractionCents = Number(fracDigits) * 10
  else if (fracDigits.length === 2) fractionCents = Number(fracDigits)

  // Step 8: leading zeros are not significant; cap significant integer digits before multiplying.
  const intDigits = parts.intDigits.replace(/^0+/, '')
  if (intDigits.length > MAX_INT_DIGITS) return err('too-large')
  const cents = (intDigits === '' ? 0 : Number(intDigits)) * CENTS_PER_UNIT + fractionCents
  if (cents > MAX_CENTS) return err('too-large')

  // Step 9: zero.
  if (cents === 0) {
    if (!opts?.allowZero) return err('zero')
    return { ok: true, value: 0 }
  }
  return { ok: true, value: negative ? -cents : cents }
}

type CurrencyOpts = Omit<Intl.NumberFormatOptions, 'style' | 'currency'>

/** ICU's placeholder for a code it has no symbol or display code for (e.g. the ISO «no currency» code XXX). */
const GENERIC_CURRENCY_SIGN = '¤'

/** True when `fmt` would render the generic '¤' instead of a real symbol or code. */
function rendersGenericSign(fmt: Intl.NumberFormat): boolean {
  return fmt.formatToParts(1).some((part) => part.type === 'currency' && part.value === GENERIC_CURRENCY_SIGN)
}

/**
 * Builds a currency formatter, retrying with EUR when Intl rejects the code
 * (RangeError on a malformed code) or cannot render it (well-formed but unknown
 * codes such as 'XXX' do not throw: Intl falls back to the '¤' placeholder).
 */
function currencyFormatter(currency: string, opts: CurrencyOpts): Intl.NumberFormat {
  const fallback = (): Intl.NumberFormat =>
    new Intl.NumberFormat(LOCALE, { style: 'currency', currency: FALLBACK_CURRENCY, ...opts })
  let fmt: Intl.NumberFormat
  try {
    fmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency, ...opts })
  } catch (e) {
    if (e instanceof RangeError) return fallback()
    throw e
  }
  return rendersGenericSign(fmt) ? fallback() : fmt
}

/** The only float conversion of the domain: built right before Intl, never stored. */
function centsToNumber(cents: number): number {
  const abs = Math.abs(cents)
  const sign = cents < 0 ? -1 : 1
  return sign * (Math.trunc(abs / CENTS_PER_UNIT) + (abs % CENTS_PER_UNIT) / CENTS_PER_UNIT)
}

/** Every visible minus is U+2212 so the sign is the same glyph everywhere. */
function unifyMinus(s: string): string {
  return s.replace('-', MINUS_SIGN)
}

/** '1.234,56 €', '−12,50 €', '12,50 US$'. Never throws (unknown currency → EUR). */
export function formatCents(
  cents: number,
  currency: string,
  opts?: { signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero' },
): string {
  const fmt = currencyFormatter(currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    // ICU's es-ES skips the separator on 4-digit numbers by default; the UI always groups ('1.234,56 €').
    useGrouping: 'always',
    signDisplay: opts?.signDisplay ?? 'auto',
  })
  return unifyMinus(fmt.format(centsToNumber(cents)))
}

/** Sign from `type`, never from the amount: '−12,50 €' for expenses, '+1.200,00 €' for incomes. */
export function formatSigned(cents: Cents, type: TransactionType, currency: string): string {
  const abs = Math.abs(cents)
  return type === 'expense'
    ? formatCents(-abs, currency, { signDisplay: 'always' })
    : formatCents(abs, currency, { signDisplay: 'always' })
}

/** '-1234,56': ASCII minus, comma decimal, no grouping, exactly 2 decimals. Integer arithmetic only. */
export function formatCentsPlain(cents: number): string {
  const abs = Math.abs(cents)
  const whole = Math.trunc(abs / CENTS_PER_UNIT)
  const frac = abs % CENTS_PER_UNIT
  const sign = cents < 0 ? '-' : ''
  return `${sign}${whole},${String(frac).padStart(2, '0')}`
}

/** '1234,56' for the <input> prefill; `parseAmount(formatAmountInput(c)).value === c`. */
export function formatAmountInput(cents: Cents): string {
  return formatCentsPlain(Math.abs(cents))
}

/** Compact currency for chart axes: '1,2 mil €' (Intl notation 'compact', 1 decimal max). */
export function formatCompactCents(cents: number, currency: string): string {
  const fmt = currencyFormatter(currency, { notation: 'compact', maximumFractionDigits: 1 })
  return unifyMinus(fmt.format(centsToNumber(cents)))
}

const BYTES_PER_KB = 1000
const BYTES_PER_MB = 1000 * 1000

/** '0 kB', '1,2 kB', '1,3 MB' (es-ES, at most 1 decimal). Settings footer. */
export function formatBytes(bytes: number): string {
  const fmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 })
  const abs = Math.max(0, bytes)
  if (abs >= BYTES_PER_MB) return `${fmt.format(abs / BYTES_PER_MB)} MB`
  return `${fmt.format(abs / BYTES_PER_KB)} kB`
}

/**
 * Integer percentages that add up to exactly 100 (Hamilton / largest remainder).
 * All-zero (or empty) input yields all zeros. Ties go to the earlier part.
 */
export function largestRemainderPercents(parts: readonly number[]): number[] {
  const total = parts.reduce((acc, p) => acc + p, 0)
  if (parts.length === 0 || total <= 0) return parts.map(() => 0)
  const floors: number[] = []
  const remainders: { index: number; remainder: number }[] = []
  let assigned = 0
  for (let i = 0; i < parts.length; i++) {
    const scaled = (parts[i] ?? 0) * 100
    const floor = Math.floor(scaled / total)
    floors.push(floor)
    assigned += floor
    remainders.push({ index: i, remainder: scaled % total })
  }
  remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  let leftover = 100 - assigned
  for (const r of remainders) {
    if (leftover <= 0) break
    floors[r.index] = (floors[r.index] ?? 0) + 1
    leftover--
  }
  return floors
}

/** Integer cents guard (Number.isSafeInteger). */
export function isCents(x: unknown): x is Cents {
  return typeof x === 'number' && Number.isSafeInteger(x)
}
