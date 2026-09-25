// ============================================================================
// src/domain/text.ts — text normalization for search and name uniqueness.
// ============================================================================

/**
 * NFD, strip combining diacritics (U+0300..U+036F), lower-case, trim.
 * `normalizeText('Ñandú') === 'nandu'`, `normalizeText('  Café ') === 'cafe'`.
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
