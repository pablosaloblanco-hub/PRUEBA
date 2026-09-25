// ============================================================================
// src/domain/dates.ts — local calendar dates as 'YYYY-MM-DD' strings and months
// as 'YYYY-MM'. Never `new Date('YYYY-MM-DD')` (parsed as UTC) and never
// `toISOString()` for business dates. Only `todayLocal` reads the clock, and it
// accepts an injected `Date`. Formatting builds `new Date(y, m - 1, d, 12)`
// (local noon) so no timezone can shift the day.
// ============================================================================
import type { LocalDate, MonthKey } from './types'

const LOCALE = 'es-ES'
const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_KEY_RE = /^(\d{4})-(\d{2})$/

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalDate(y: number, m: number, d: number): LocalDate {
  return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`
}

function toMonthKey(y: number, m: number): MonthKey {
  return `${String(y).padStart(4, '0')}-${pad2(m)}`
}

/** Splits a (trusted) 'YYYY-MM-DD' into numbers. */
function dateParts(d: LocalDate): { y: number; m: number; d: number } {
  return { y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) }
}

/** Splits a (trusted) 'YYYY-MM' into numbers. */
function monthParts(m: MonthKey): { y: number; m: number } {
  return { y: Number(m.slice(0, 4)), m: Number(m.slice(5, 7)) }
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

/** Local noon of a calendar day; safe to hand to Intl in any timezone. */
function localNoon(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 12)
}

/** Today's local calendar date (getFullYear/getMonth/getDate), zero-padded. */
export function todayLocal(now: Date = new Date()): LocalDate {
  return toLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/** Shape plus real calendar check (rejects 2025-02-30, 2026-9-3). */
export function isLocalDate(s: string): s is LocalDate {
  const match = LOCAL_DATE_RE.exec(s)
  if (match === null) return false
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12) return false
  return d >= 1 && d <= daysInMonth(toMonthKey(y, m))
}

export function isMonthKey(s: string): s is MonthKey {
  const match = MONTH_KEY_RE.exec(s)
  if (match === null) return false
  const m = Number(match[2])
  return m >= 1 && m <= 12
}

export function monthKeyOf(d: LocalDate): MonthKey {
  return d.slice(0, 7)
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return monthKeyOf(todayLocal(now))
}

export function dayOf(d: LocalDate): number {
  return Number(d.slice(8, 10))
}

/** Leap-year arithmetic, no Date involved. */
export function daysInMonth(m: MonthKey): number {
  const p = monthParts(m)
  switch (p.m) {
    case 2:
      return isLeapYear(p.y) ? 29 : 28
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
    default:
      return 31
  }
}

/** '2026-01' + (−1) → '2025-12'; '2026-12' + 1 → '2027-01'. */
export function addMonths(m: MonthKey, n: number): MonthKey {
  const p = monthParts(m)
  const index = p.y * 12 + (p.m - 1) + n
  const y = Math.floor(index / 12)
  const month = index - y * 12 + 1
  return toMonthKey(y, month)
}

/** Day arithmetic through Date.UTC so DST transitions can never skip or repeat a day. */
export function addDays(d: LocalDate, n: number): LocalDate {
  const p = dateParts(d)
  const shifted = new Date(Date.UTC(p.y, p.m - 1, p.d + n))
  return toLocalDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/** `n` month keys, oldest first, ending in `end`. */
export function lastNMonths(end: MonthKey, n: number): MonthKey[] {
  const out: MonthKey[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addMonths(end, -i))
  return out
}

/** Lexicographic order equals chronological order for 'YYYY-MM-DD'. */
export function compareDates(a: LocalDate, b: LocalDate): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/** Long month name in es-ES ('septiembre'). */
function longMonthName(y: number, m: number): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(localNoon(y, m, 1))
}

/**
 * Abbreviated month in es-ES, normalized to three letters: ICU emits 'sept' or
 * 'sep.' depending on the version, the UI always shows 'sep'.
 */
function shortMonthName(y: number, m: number): string {
  const raw = new Intl.DateTimeFormat(LOCALE, { month: 'short' }).format(localNoon(y, m, 1))
  return raw.replace(/\.$/, '').slice(0, 3)
}

/** 'septiembre 2026' (ICU would say 'septiembre de 2026'; the UI drops the preposition). */
export function formatMonthLabel(m: MonthKey): string {
  const p = monthParts(m)
  return `${longMonthName(p.y, p.m)} ${p.y}`
}

/** 'Hoy' | 'Ayer' | 'jueves, 18 sep' (weekday long, day numeric, month short). */
export function formatDayHeader(d: LocalDate, today: LocalDate): string {
  if (d === today) return 'Hoy'
  if (d === addDays(today, -1)) return 'Ayer'
  const p = dateParts(d)
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(localNoon(p.y, p.m, p.d))
  return `${weekday}, ${p.d} ${shortMonthName(p.y, p.m)}`
}

/** 'sep' (chart X axis). */
export function formatShortMonth(m: MonthKey): string {
  const p = monthParts(m)
  return shortMonthName(p.y, p.m)
}

/** '25/09/2026'. */
export function formatDateLabel(d: LocalDate): string {
  const p = dateParts(d)
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    localNoon(p.y, p.m, p.d),
  )
}
