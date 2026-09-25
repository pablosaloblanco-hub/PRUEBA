import type { TransactionType } from '../../domain/types'
import { formatCents, formatSigned } from '../../domain/money'

export type MoneyType = TransactionType | 'neutral'

export type MoneyProps = {
  cents: number
  currency: string
  /** 'expense' → «−12,50 €» in red, 'income' → «+12,50 €» in green, 'neutral' (default) → formatCents. */
  type?: MoneyType
  /** Only used for 'neutral'; expense/income always carry their sign. */
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero'
  className?: string
}

/** Formatted amount that never wraps, with tabular digits and a semantic colour class. */
export function Money({ cents, currency, type = 'neutral', signDisplay, className }: MoneyProps) {
  const text = type === 'neutral' ? formatCents(cents, currency, { signDisplay }) : formatSigned(cents, type, currency)
  const classes = `money money--${type}${className !== undefined ? ` ${className}` : ''}`
  return <span className={classes}>{text}</span>
}
