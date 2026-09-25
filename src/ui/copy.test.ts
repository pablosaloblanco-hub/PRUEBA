// ============================================================================
// src/ui/copy.test.ts — copy.ts re-exposes the §4.4 validation messages owned by
// src/domain/validate.ts (single source of truth): the UI and the validators
// must show the same text for the same error.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { VALIDATION_MESSAGES } from '../domain/validate'
import { copy } from './copy'

describe('copy.validation', () => {
  it('contains every VALIDATION_MESSAGES entry verbatim plus the generic fallback', () => {
    expect(copy.validation).toMatchObject(VALIDATION_MESSAGES)
    expect(copy.validation.saveFailed).toBe('No se ha podido guardar. Revisa los datos e inténtalo de nuevo')
  })

  it('category and budget sheet messages are the domain strings', () => {
    expect(copy.categories.nameRequired).toBe(VALIDATION_MESSAGES.categoryNameRequired)
    expect(copy.categories.nameDuplicate).toBe(VALIDATION_MESSAGES.categoryNameDuplicate)
    expect(copy.budgets.duplicate).toBe(VALIDATION_MESSAGES.budgetDuplicate)
  })
})
