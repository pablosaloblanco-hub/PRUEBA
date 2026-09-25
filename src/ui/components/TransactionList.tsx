// ============================================================================
// src/ui/components/TransactionList.tsx — transactions grouped by day (§7.3):
// a header per day («Hoy», «Ayer», «jueves, 18 sep») with the day's net
// amount, followed by the rows in the order given (canonical order comes from
// `sortTransactions`; grouping from `groupByDay`).
// ============================================================================
import { useMemo } from 'react'
import { formatDayHeader } from '../../domain/dates'
import { groupByDay } from '../../domain/queries'
import type { Category, Id, LocalDate, Transaction } from '../../domain/types'
import { Money } from './Money'
import { TransactionRow } from './TransactionRow'

export type TransactionListProps = {
  /** Already sorted (`sortTransactions`) and filtered. */
  transactions: readonly Transaction[]
  categories: ReadonlyMap<Id, Category>
  currency: string
  /** From the injected clock (`useToday()`), for «Hoy» / «Ayer». */
  today: LocalDate
  onSelect: (id: Id) => void
}

export function TransactionList({ transactions, categories, currency, today, onSelect }: TransactionListProps) {
  const groups = useMemo(() => groupByDay(transactions), [transactions])
  return (
    <div className="transaction-list">
      {groups.map((group) => (
        <section key={group.date} className="transaction-list__day" aria-label={formatDayHeader(group.date, today)}>
          <h4 className="list-header">
            <span className="list-header__label">{formatDayHeader(group.date, today)}</span>
            <Money cents={group.netCents} currency={currency} signDisplay="exceptZero" className="list-header__net" />
          </h4>
          <ul className="list">
            {group.transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                category={categories.get(transaction.categoryId)}
                currency={currency}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
