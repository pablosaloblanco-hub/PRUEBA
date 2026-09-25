import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { normalizeText } from './text'

describe('normalizeText', () => {
  it("'  Café ' → 'cafe'", () => {
    expect(normalizeText('  Café ')).toBe('cafe')
  })
  it("'Ócio' → 'ocio'", () => {
    expect(normalizeText('Ócio')).toBe('ocio')
  })
  it("'Ñandú' → 'nandu'", () => {
    expect(normalizeText('Ñandú')).toBe('nandu')
  })
  it('empty and whitespace-only → empty', () => {
    expect(normalizeText('')).toBe('')
    expect(normalizeText('   ')).toBe('')
    expect(normalizeText('\t\n')).toBe('')
  })
  it('keeps inner spaces and digits, lowercases everything', () => {
    expect(normalizeText('Compra Semanal 2')).toBe('compra semanal 2')
    expect(normalizeText('ALIMENTACIÓN')).toBe('alimentacion')
  })
  it('makes accent/case variants collide (category uniqueness)', () => {
    expect(normalizeText('Ocio')).toBe(normalizeText('ocio'))
    expect(normalizeText('Ocio')).toBe(normalizeText('Ócio'))
    expect(normalizeText('Educación')).toBe(normalizeText('EDUCACION'))
  })
  it('handles precomposed and decomposed input the same way', () => {
    expect(normalizeText('Café')).toBe('cafe')
    expect(normalizeText('Café')).toBe('cafe')
  })
  it('does not strip non-Latin letters or emoji', () => {
    expect(normalizeText('🛒 Súper')).toBe('🛒 super')
  })
})

describe('normalizeText source form (§4.3)', () => {
  it('writes the combining-diacritics range with \\u escapes, never with raw code points', () => {
    const source = readFileSync(resolve(__dirname, 'text.ts'), 'utf8')
    expect(source).toContain('[\\u0300-\\u036f]')
    for (let i = 0; i < source.length; i++) {
      const code = source.charCodeAt(i)
      if (code >= 0x0300 && code <= 0x036f) {
        throw new Error(`raw combining mark U+${code.toString(16).toUpperCase().padStart(4, '0')} at offset ${i}`)
      }
    }
  })
})
