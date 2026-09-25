import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { Cents } from '../../domain/types'
import { formatCents, parseAmount } from '../../domain/money'
import { amountErrorMessage } from '../../domain/validate'
import { copy } from '../copy'

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

export type AmountInputProps = {
  id: string
  label: string
  /** Raw text as typed; the parent owns it and normalises only on save (§9). */
  value: string
  onChange: (raw: string) => void
  /** Used for the live preview («= 12,50 €») and the suffix symbol. */
  currency: string
  allowZero?: boolean
  allowNegative?: boolean
  autoFocus?: boolean
  /** Enter inside the field. */
  onSubmit?: () => void
  onBlur?: () => void
  /** Extra id(s) appended to aria-describedby (e.g. a help text). */
  describedBy?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Decimal text input (`inputmode="decimal"`) with a live preview of the parsed
 * amount or the inline error (aria-invalid + aria-describedby). The «empty»
 * error is only shown once the field has been touched (blur), so a freshly
 * opened form does not start red; `parseAmountField` still reports it.
 */
export function AmountInput({
  id,
  label,
  value,
  onChange,
  currency,
  allowZero,
  allowNegative,
  autoFocus,
  onSubmit,
  onBlur,
  describedBy,
  placeholder,
  disabled,
}: AmountInputProps) {
  const [touched, setTouched] = useState(false)
  const result = parseAmountField(value, { allowZero, allowNegative })
  const isEmpty = value.trim() === ''
  const showError = result.error !== undefined && (touched || !isEmpty)
  const hintId = `${id}-hint`
  const describedIds = [describedBy, hintId].filter((x): x is string => x !== undefined && x !== '')

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onSubmit !== undefined) {
      event.preventDefault()
      onSubmit()
    }
  }

  let hint: string | null = null
  if (result.cents !== undefined) hint = copy.transactionSheet.preview(formatCents(result.cents, currency))
  else if (showError) hint = result.error

  return (
    <div className="field field--amount">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <div className="amount">
        <input
          id={id}
          className="field__input amount__input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder ?? copy.transactionSheet.amountPlaceholder}
          value={value}
          disabled={disabled}
          aria-invalid={showError ? true : undefined}
          aria-describedby={describedIds.join(' ')}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTouched(true)
            onBlur?.()
          }}
        />
        <span className="amount__suffix" aria-hidden="true">
          {currencySymbol(currency)}
        </span>
      </div>
      <p id={hintId} className={showError ? 'field__error' : 'field__help field__preview'}>
        {hint ?? ' '}
      </p>
    </div>
  )
}
