// ============================================================================
// src/ui/components/TransactionRow.tsx — one transaction as a <button> row
// (§7.3, §8.2): category badge + name, muted truncated note and the signed
// amount on the right, never wrapping. Contains no other control, so the whole
// row is the button that opens the edit sheet.
// ============================================================================
import type { Category, Id, Transaction } from '../../domain/types'
import { CategoryBadge } from './CategoryBadge'
import { Money } from './Money'

export type TransactionRowProps = {
  transaction: Transaction
  /** Resolved by the parent (`undefined` only for an orphan, which the invariants forbid). */
  category: Category | undefined
  currency: string
  onSelect: (id: Id) => void
}

/** `<li>` wrapping a `<button class="list-row">`; render inside a `<ul class="list">`. */
export function TransactionRow({ transaction, category, currency, onSelect }: TransactionRowProps) {
  return (
    <li className="transaction-row">
      <button type="button" className="list-row" onClick={() => onSelect(transaction.id)}>
        {category !== undefined ? <CategoryBadge icon={category.icon} color={category.color} /> : null}
        <span className="list-row__main">
          <span className="list-row__title">{category?.name ?? ''}</span>
          {transaction.note !== '' ? <span className="list-row__subtitle">{transaction.note}</span> : null}
        </span>
        <span className="list-row__amount">
          <Money cents={transaction.amountCents} type={transaction.type} currency={currency} />
        </span>
      </button>
    </li>
  )
}
