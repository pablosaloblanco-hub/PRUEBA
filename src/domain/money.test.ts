import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  formatAmountInput,
  formatBytes,
  formatCents,
  formatCentsPlain,
  formatCompactCents,
  formatSigned,
  isCents,
  largestRemainderPercents,
  parseAmount,
} from './money'
import type { AmountParseError } from './money'
import { MAX_CENTS } from './types'
import { makePrng } from '../test/prng'

/** Intl may emit NBSP / narrow NBSP; compare on plain spaces. */
const norm = (s: string): string => s.replace(/\s/g, ' ')
const MINUS = '−'

function ok(input: string, opts?: Parameters<typeof parseAmount>[1]): number {
  const r = parseAmount(input, opts)
  if (!r.ok) throw new Error(`expected ok for ${JSON.stringify(input)}, got ${r.error}`)
  return r.value
}

function fail(input: string, opts?: Parameters<typeof parseAmount>[1]): AmountParseError {
  const r = parseAmount(input, opts)
  if (r.ok) throw new Error(`expected error for ${JSON.stringify(input)}, got ${r.value}`)
  return r.error
}

describe('parseAmount — §9 «Importes» table', () => {
  const valid: [string, number][] = [
    ['12', 1200],
    ['12,5', 1250],
    ['12.5', 1250],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['0,07', 7],
    [',5', 50],
    ['.5', 50],
    ['  12,50 € ', 1250],
    ['+12', 1200],
    ['12 USD', 1200],
    ['$12', 1200],
    ['US$12', 1200],
    ['12 £', 1200],
    ['000000000012', 1200],
    ['999999999,99', MAX_CENTS],
    ['12 €', 1200],
    ['12 €', 1200],
    ['€12', 1200],
    ['12€', 1200],
    ['CHF 12', 1200],
    ['12 CHF', 1200],
    ['R$12', 1200],
    ['12 GBP', 1200],
    ['MXN 12', 1200],
    ['1.234.567,89', 123456789],
    ['1,234,567.89', 123456789],
    ['0,5', 50],
    ['12,', 1200],
    ['100', 10000],
  ]
  it.each(valid)('parses %j → %i', (input, cents) => {
    expect(ok(input)).toBe(cents)
  })

  const errors: [string, AmountParseError][] = [
    ['', 'empty'],
    ['   ', 'empty'],
    ['€', 'empty'],
    ['0', 'zero'],
    ['0,00', 'zero'],
    ['000', 'zero'],
    ['-5', 'negative'],
    ['-0', 'negative'],
    ['12,505', 'too-many-decimals'],
    ['0,005', 'too-many-decimals'],
    ['1.2,3', 'invalid'],
    ['1,2,3', 'invalid'],
    ['12a', 'invalid'],
    ['12 usd', 'invalid'],
    ['12 eur', 'invalid'],
    ['€12€', 'invalid'],
    ['1..2', 'invalid'],
    ['1e3', 'invalid'],
    ['1.2.3', 'invalid'],
    ['1.23.456', 'invalid'],
    ['1,23.456', 'invalid'],
    ['1.234,5.6', 'invalid'],
    ['12 ABC', 'invalid'],
    ['12 US$ €', 'invalid'],
    ['++12', 'invalid'],
    ['12-', 'invalid'],
    ['abc', 'invalid'],
    ['1000000000', 'too-large'],
    ['1.000.000.000', 'too-large'],
    ['1000000000,00', 'too-large'],
    ['0001000000000', 'too-large'],
  ]
  it.each(errors)('rejects %j with %s', (input, error) => {
    expect(fail(input)).toBe(error)
  })

  it('checks the integer digit count before multiplying (no overflow path)', () => {
    expect(fail('9'.repeat(30))).toBe('too-large')
    expect(ok('9'.repeat(9) + ',99')).toBe(MAX_CENTS)
  })

  it('reports too-many-decimals before too-large', () => {
    expect(fail('1000000000,005')).toBe('too-many-decimals')
  })

  it('only strips one currency token, at the start or the end', () => {
    expect(ok('USD12')).toBe(1200)
    expect(fail('USD12USD')).toBe('invalid')
    expect(fail('$12€')).toBe('invalid')
  })
})

describe('parseAmount — options', () => {
  it('allowZero accepts 0 and 0,00', () => {
    expect(ok('0', { allowZero: true })).toBe(0)
    expect(ok('0,00', { allowZero: true })).toBe(0)
    expect(fail('0')).toBe('zero')
    expect(fail('', { allowZero: true })).toBe('empty')
  })

  it('allowNegative accepts a leading minus and keeps the magnitude grammar', () => {
    expect(ok('-5', { allowNegative: true })).toBe(-500)
    expect(ok('-1.234,56', { allowNegative: true })).toBe(-123456)
    expect(ok('-12 €', { allowNegative: true })).toBe(-1200)
    expect(ok('€-12', { allowNegative: true })).toBe(-1200)
    expect(fail('-12,505', { allowNegative: true })).toBe('too-many-decimals')
    expect(fail('-12a', { allowNegative: true })).toBe('invalid')
    expect(fail('-', { allowNegative: true })).toBe('invalid')
    expect(fail('--5', { allowNegative: true })).toBe('invalid')
  })

  it('allowNegative + allowZero never yields -0', () => {
    const r = parseAmount('-0', { allowNegative: true, allowZero: true })
    expect(r).toEqual({ ok: true, value: 0 })
    expect(Object.is(r.ok ? r.value : NaN, -0)).toBe(false)
  })

  it('negative without allowNegative is reported before validity', () => {
    expect(fail('-abc')).toBe('negative')
    expect(fail('-0', { allowZero: true })).toBe('negative')
  })

  it('a negative result with allowNegative but not allowZero still reports zero', () => {
    expect(fail('-0', { allowNegative: true })).toBe('zero')
  })

  it('a lone separator is invalid, never a zero (even with allowZero)', () => {
    for (const input of ['.', ',', '..', ',,', '.,', ' , ', '€.', '.€', '-.', '+,']) {
      expect(fail(input, { allowZero: true, allowNegative: true })).toBe('invalid')
      expect(fail(input, { allowZero: true })).toBe(input.startsWith('-') ? 'negative' : 'invalid')
    }
  })

  it('a trailing separator with no fraction digits is still a whole amount', () => {
    expect(ok('1.')).toBe(100)
    expect(ok('12,')).toBe(1200)
    expect(ok(',5')).toBe(50)
    expect(ok('.5')).toBe(50)
  })
})

describe('formatCents', () => {
  const eur: [number, string][] = [
    [0, '0,00 €'],
    [5, '0,05 €'],
    [100, '1,00 €'],
    [123456, '1.234,56 €'],
    [-123456, `${MINUS}1.234,56 €`],
    [MAX_CENTS, '999.999.999,99 €'],
  ]
  it.each(eur)('EUR %i → %s', (cents, expected) => {
    expect(norm(formatCents(cents, 'EUR'))).toBe(expected)
  })

  const usd: [number, string][] = [
    [0, '0,00 US$'],
    [5, '0,05 US$'],
    [100, '1,00 US$'],
    [123456, '1.234,56 US$'],
    [-123456, `${MINUS}1.234,56 US$`],
    [MAX_CENTS, '999.999.999,99 US$'],
  ]
  it.each(usd)('USD %i → %s', (cents, expected) => {
    expect(norm(formatCents(cents, 'USD'))).toBe(expected)
  })

  it('every visible minus is U+2212, never ASCII', () => {
    const s = formatCents(-5, 'EUR')
    expect(s).toContain(MINUS)
    expect(s).not.toContain('-')
    expect(norm(s)).toBe(`${MINUS}0,05 €`)
  })

  it('signDisplay exceptZero shows 0 without sign and positives with +', () => {
    expect(norm(formatCents(0, 'EUR', { signDisplay: 'exceptZero' }))).toBe('0,00 €')
    expect(norm(formatCents(35680, 'EUR', { signDisplay: 'exceptZero' }))).toBe('+356,80 €')
    expect(norm(formatCents(-1000, 'EUR', { signDisplay: 'exceptZero' }))).toBe(`${MINUS}10,00 €`)
  })

  it('signDisplay always / never', () => {
    expect(norm(formatCents(1250, 'EUR', { signDisplay: 'always' }))).toBe('+12,50 €')
    expect(norm(formatCents(-1250, 'EUR', { signDisplay: 'never' }))).toBe('12,50 €')
  })

  it('never throws on an unknown currency (retries with EUR)', () => {
    expect(() => formatCents(1, 'XXX')).not.toThrow()
    expect(() => formatCents(1, 'ZZ')).not.toThrow()
    expect(() => formatCents(1, '')).not.toThrow()
    expect(norm(formatCents(1250, 'ZZ'))).toBe(norm(formatCents(1250, 'EUR')))
  })

  it("'XXX' (ISO «no currency», accepted by Intl but rendered as '¤') also falls back to EUR", () => {
    // Intl only throws on malformed codes; a well-formed unknown one gets the generic sign instead.
    expect(norm(formatCents(1, 'XXX'))).toBe('0,01 €')
    expect(formatCents(1, 'XXX')).not.toContain('¤')
    expect(norm(formatCents(-123456, 'XXX'))).toBe(norm(formatCents(-123456, 'EUR')))
    expect(norm(formatCents(0, 'XXX', { signDisplay: 'exceptZero' }))).toBe('0,00 €')
    expect(norm(formatCompactCents(1_250_000, 'XXX'))).toBe(norm(formatCompactCents(1_250_000, 'EUR')))
  })

  it('a well-formed code Intl can render (symbol or code) is kept as is', () => {
    expect(norm(formatCents(100, 'USD'))).toBe('1,00 US$')
    expect(norm(formatCents(100, 'MXN'))).toContain('MXN')
  })

  it('formats other supported currencies without throwing', () => {
    for (const c of ['GBP', 'CHF', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL']) {
      expect(formatCents(123456, c)).toMatch(/1\.234/)
    }
  })

  it('does not lose cents on large values (integer split before Intl)', () => {
    expect(norm(formatCents(99_999_999_901, 'EUR'))).toBe('999.999.999,01 €')
    expect(norm(formatCents(1, 'EUR'))).toBe('0,01 €')
    expect(norm(formatCents(-1, 'EUR'))).toBe(`${MINUS}0,01 €`)
  })
})

describe('formatSigned', () => {
  it('takes the sign from the type, never from the amount', () => {
    expect(norm(formatSigned(1250, 'expense', 'EUR'))).toBe(`${MINUS}12,50 €`)
    expect(norm(formatSigned(120000, 'income', 'EUR'))).toBe('+1.200,00 €')
    expect(norm(formatSigned(1250, 'expense', 'USD'))).toBe(`${MINUS}12,50 US$`)
    expect(norm(formatSigned(1250, 'income', 'USD'))).toBe('+12,50 US$')
  })
})

describe('formatCentsPlain / formatAmountInput', () => {
  it('formatCentsPlain: ASCII minus, comma, no grouping, two decimals', () => {
    expect(formatCentsPlain(-5)).toBe('-0,05')
    expect(formatCentsPlain(0)).toBe('0,00')
    expect(formatCentsPlain(5)).toBe('0,05')
    expect(formatCentsPlain(100)).toBe('1,00')
    expect(formatCentsPlain(123456)).toBe('1234,56')
    expect(formatCentsPlain(-123456789)).toBe('-1234567,89')
    expect(formatCentsPlain(MAX_CENTS)).toBe('999999999,99')
  })

  it('formatAmountInput: prefill without grouping nor sign', () => {
    expect(formatAmountInput(123456)).toBe('1234,56')
    expect(formatAmountInput(1)).toBe('0,01')
    expect(formatAmountInput(1250)).toBe('12,50')
    expect(formatAmountInput(MAX_CENTS)).toBe('999999999,99')
  })
})

describe('round-trips', () => {
  const fixed = [1, 10, 99, 100, 123456, MAX_CENTS]

  it.each(fixed)('fixed value %i round-trips through both formatters', (c) => {
    expect(ok(formatAmountInput(c))).toBe(c)
    expect(ok(formatCentsPlain(c), { allowNegative: true })).toBe(c)
    expect(ok(formatCentsPlain(-c), { allowNegative: true })).toBe(-c)
  })

  it('10.000 pseudo-random values round-trip through formatAmountInput', () => {
    const rnd = makePrng(20260925)
    for (let i = 0; i < 10_000; i++) {
      const c = rnd()
      expect(c).toBeGreaterThanOrEqual(1)
      expect(c).toBeLessThanOrEqual(MAX_CENTS)
      expect(Number.isSafeInteger(c)).toBe(true)
      const r = parseAmount(formatAmountInput(c))
      expect(r).toEqual({ ok: true, value: c })
    }
  })

  it('the same 10.000 values round-trip through formatCentsPlain with allowNegative', () => {
    const rnd = makePrng(20260925)
    for (let i = 0; i < 10_000; i++) {
      const c = rnd()
      const r = parseAmount(formatCentsPlain(c), { allowNegative: true })
      expect(r).toEqual({ ok: true, value: c })
      const n = parseAmount(formatCentsPlain(-c), { allowNegative: true })
      expect(n).toEqual({ ok: true, value: -c })
    }
  })

  it('the prng is deterministic for a given seed', () => {
    const a = makePrng(7)
    const b = makePrng(7)
    const seqA = Array.from({ length: 20 }, () => a())
    const seqB = Array.from({ length: 20 }, () => b())
    expect(seqA).toEqual(seqB)
    expect(new Set(seqA).size).toBeGreaterThan(1)
  })
})

describe('formatCompactCents', () => {
  it('0', () => {
    const s = norm(formatCompactCents(0, 'EUR'))
    expect(s).toContain('0')
    expect(s).toContain('€')
  })

  it('1234 cents → 12,3 €', () => {
    const s = norm(formatCompactCents(1234, 'EUR'))
    expect(s).toContain('12,3')
    expect(s).toContain('€')
  })

  it('1_250_000 cents → compact thousands (12,5 mil €)', () => {
    const s = norm(formatCompactCents(1_250_000, 'EUR'))
    expect(s).toContain('12,5')
    expect(s).toContain('€')
    expect(s).toMatch(/mil|K|k/)
  })

  it('negative uses U+2212 and unknown currency does not throw', () => {
    expect(formatCompactCents(-1234, 'EUR')).toContain(MINUS)
    expect(() => formatCompactCents(1234, 'ZZ')).not.toThrow()
    expect(norm(formatCompactCents(1234, 'ZZ'))).toBe(norm(formatCompactCents(1234, 'EUR')))
  })
})

describe('formatBytes', () => {
  it('kB / MB with one decimal, es-ES', () => {
    expect(norm(formatBytes(0))).toBe('0 kB')
    expect(norm(formatBytes(1234))).toBe('1,2 kB')
    expect(norm(formatBytes(1_250_000))).toBe('1,3 MB')
    expect(norm(formatBytes(999_949))).toBe('999,9 kB')
    expect(norm(formatBytes(5_000_000))).toBe('5 MB')
  })
})

describe('largestRemainderPercents', () => {
  it('[1,1,1] → 34/33/33', () => {
    expect(largestRemainderPercents([1, 1, 1])).toEqual([34, 33, 33])
  })
  it('[] → []', () => {
    expect(largestRemainderPercents([])).toEqual([])
  })
  it('[0,0] → [0,0]', () => {
    expect(largestRemainderPercents([0, 0])).toEqual([0, 0])
  })
  it('[5] → [100]', () => {
    expect(largestRemainderPercents([5])).toEqual([100])
  })
  it('fixture §3.7 september → 71/13/10/6', () => {
    expect(largestRemainderPercents([60000, 11000, 8320, 5000])).toEqual([71, 13, 10, 6])
  })
  it('always sums to 100 for non-zero input', () => {
    const rnd = makePrng(42)
    for (let i = 0; i < 200; i++) {
      const parts = Array.from({ length: 1 + (i % 9) }, () => rnd() % 1000)
      const total = parts.reduce((a, b) => a + b, 0)
      const pct = largestRemainderPercents(parts)
      expect(pct.length).toBe(parts.length)
      expect(pct.reduce((a, b) => a + b, 0)).toBe(total === 0 ? 0 : 100)
      for (const p of pct) expect(Number.isInteger(p)).toBe(true)
    }
  })
  it('breaks ties by position', () => {
    expect(largestRemainderPercents([1, 1])).toEqual([50, 50])
    expect(largestRemainderPercents([2, 1, 1])).toEqual([50, 25, 25])
    expect(largestRemainderPercents([1, 1, 1, 1, 1, 1])).toEqual([17, 17, 17, 17, 16, 16])
  })
})

describe('isCents', () => {
  it('accepts safe integers only', () => {
    expect(isCents(0)).toBe(true)
    expect(isCents(-5)).toBe(true)
    expect(isCents(MAX_CENTS)).toBe(true)
    expect(isCents(1.5)).toBe(false)
    expect(isCents('1')).toBe(false)
    expect(isCents(NaN)).toBe(false)
    expect(isCents(Infinity)).toBe(false)
    expect(isCents(2 ** 53)).toBe(false)
    expect(isCents(null)).toBe(false)
  })
})

describe('guardian: forbidden float/date idioms in src/', () => {
  // Tokens are assembled from pieces so this file never contains them literally.
  const FORBIDDEN: readonly string[] = [
    ['parse', 'Float'].join(''),
    ['to', 'Fixed'].join(''),
    ['toISO', 'String('].join(''),
    ['new ', "Date('"].join(''),
  ]
  // vitest runs from the project root (vite.config.ts); src/ is resolved from there.
  const SRC_DIR = resolve(process.cwd(), 'src')
  const EXEMPT = new Set([join(SRC_DIR, 'domain', 'dates.ts')])
  const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/

  function walk(dir: string, out: string[]): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, out)
      else if (statSync(full).isFile() && SOURCE_EXT.test(entry.name)) out.push(full)
    }
    return out
  }

  it('finds no forbidden token outside src/domain/dates.ts', () => {
    const files = walk(SRC_DIR, [])
    expect(files.length).toBeGreaterThan(0)
    const hits: string[] = []
    for (const file of files) {
      if (EXEMPT.has(file)) continue
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        for (const token of FORBIDDEN) {
          if (line.includes(token)) hits.push(`${file}:${i + 1}: ${token}`)
        }
      })
    }
    expect(hits).toEqual([])
  })
})
