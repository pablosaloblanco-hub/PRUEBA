import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { formatCents } from '../../domain/money'
import { copy } from '../copy'
import { currencySymbol, parseAmountField } from './amountField'

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
  /**
   * Focus on mount. Also marks the input with `data-autofocus` so an enclosing
   * Dialog focuses it once open (React's own autoFocus runs while the <dialog>
   * is still closed, where it is a no-op).
   */
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
          data-autofocus={autoFocus ? '' : undefined}
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
