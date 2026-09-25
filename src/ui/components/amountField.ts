// ============================================================================
// src/ui/components/amountField.ts — pure helpers shared by AmountInput and the
// forms that derive the disabled state of «Guardar» from the raw amount text.
// Kept out of AmountInput.tsx so that file only exports components.
// ============================================================================
import type { Cents } from '../../domain/types'
import { formatCents, parseAmount } from '../../domain/money'
import { amountErrorMessage } from '../../domain/validate'

export type AmountFieldOptions = { allowZero?: boolean; allowNegative?: boolean }

export type AmountFieldResult = { cents: Cents; error?: undefined } | { cents?: undefined; error: string }

/**
 * Parses the raw text of an amount field into cents or the Spanish §4.4 message.
 * Pure: parents use it to derive the disabled state of «Guardar».
 */
export function parseAmountField(raw: string, opts?: AmountFieldOptions): AmountFieldResult {
  const parsed = parseAmount(raw, opts)
  return parsed.ok ? { cents: parsed.value } : { error: amountErrorMessage(parsed.error) }
}

/** Currency symbol as es-ES renders it («€», «US$», «£»), derived from the formatter itself. */
export function currencySymbol(currency: string): string {
  return formatCents(0, currency, { signDisplay: 'never' })
    .replace(/[0-9.,\s]/g, '')
    .trim()
}
