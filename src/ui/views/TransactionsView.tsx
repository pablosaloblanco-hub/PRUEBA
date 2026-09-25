// ============================================================================
// src/ui/views/TransactionsView.tsx — «Movimientos» (§7.3, F3): search with a
// 150 ms debounce, type chips, the drilldown category chip, «Limpiar filtros»,
// the totals strip of the visible set and the list grouped by day. The month
// selector lives in the Shell header; the filter state lives in the UI reducer.
// ============================================================================
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatMonthLabel } from '../../domain/dates'
import { formatCents } from '../../domain/money'
import { filterTransactions, sortTransactions, summarize } from '../../domain/queries'
import type { Category, Id, TransactionType } from '../../domain/types'
import { Chip, ChipRow } from '../components/Chips'
import { EmptyState } from '../components/EmptyState'
import { TransactionList } from '../components/TransactionList'
import { copy } from '../copy'
import { useAppData } from '../state/useStore'
import { useToday, useUi, useUiActions } from '../state/useUi'
import './transactions.css'

/** Debounce of the search field (§2.1 F3). */
export const SEARCH_DEBOUNCE_MS = 150

const TYPE_CHIPS: readonly { value: TransactionType | 'all'; label: string }[] = [
  { value: 'all', label: copy.transactions.all },
  { value: 'expense', label: copy.transactions.expenses },
  { value: 'income', label: copy.transactions.incomes },
]

export function TransactionsView() {
  const data = useAppData()
  const today = useToday()
  const { month, filter } = useUi()
  const { setFilter, clearFilter, openSheet } = useUiActions()
  const searchId = useId()

  // Raw search text lives here; `filter.query` is dispatched after the debounce.
  const [rawQuery, setRawQuery] = useState(filter.query)
  const timer = useRef<number | null>(null)
  const cancelPending = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }
  useEffect(() => cancelPending, [])

  const changeQuery = (value: string) => {
    setRawQuery(value)
    cancelPending()
    timer.current = window.setTimeout(() => {
      timer.current = null
      setFilter({ query: value })
    }, SEARCH_DEBOUNCE_MS)
  }

  const clearSearch = () => {
    cancelPending()
    setRawQuery('')
    setFilter({ query: '' })
  }

  const clearAll = () => {
    cancelPending()
    setRawQuery('')
    clearFilter()
  }

  const categoryMap = useMemo(() => new Map<Id, Category>(data.categories.map((c) => [c.id, c])), [data.categories])
  const visible = useMemo(
    () => filterTransactions(sortTransactions(data.transactions), categoryMap, { month, ...filter }),
    [data.transactions, categoryMap, month, filter],
  )
  const totals = useMemo(() => summarize(visible), [visible])
  const currency = data.settings.currency
  const activeCategory = filter.categoryId === null ? null : (categoryMap.get(filter.categoryId) ?? null)
  const hasFilters = filter.query !== '' || filter.type !== 'all' || filter.categoryId !== null
  const isEmpty = visible.length === 0

  return (
    <div className="screen screen--transactions">
      <div className="field search">
        <label htmlFor={searchId} className="field__label visually-hidden">
          {copy.transactions.searchLabel}
        </label>
        <input
          id={searchId}
          className="field__input search__input"
          type="search"
          autoComplete="off"
          placeholder={copy.transactions.searchPlaceholder}
          value={rawQuery}
          onChange={(event) => changeQuery(event.target.value)}
        />
        {rawQuery !== '' ? (
          <button
            type="button"
            className="btn btn--ghost btn--icon search__clear"
            aria-label={copy.transactions.clearSearch}
            onClick={clearSearch}
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="transactions__filters">
        <ChipRow>
          {TYPE_CHIPS.map((chip) => (
            <Chip key={chip.value} pressed={filter.type === chip.value} onClick={() => setFilter({ type: chip.value })}>
              {chip.label}
            </Chip>
          ))}
          {activeCategory !== null ? (
            <Chip
              pressed
              onClick={() => setFilter({ categoryId: null })}
              onRemove={() => setFilter({ categoryId: null })}
              removeLabel={copy.transactions.removeCategoryFilter}
            >
              {activeCategory.name}
            </Chip>
          ) : null}
        </ChipRow>
        {hasFilters && !isEmpty ? (
          <button type="button" className="btn btn--ghost btn--sm transactions__clear" onClick={clearAll}>
            {copy.transactions.clearFilters}
          </button>
        ) : null}
      </div>

      <p className="transactions__totals">
        {copy.transactions.totals(
          formatCents(totals.incomeCents, currency),
          formatCents(totals.expenseCents, currency),
          formatCents(totals.balanceCents, currency, { signDisplay: 'exceptZero' }),
        )}
      </p>

      {isEmpty ? (
        hasFilters ? (
          <EmptyState
            title={copy.transactions.emptyFiltered}
            actionLabel={copy.transactions.emptyFilteredCta}
            onAction={clearAll}
          />
        ) : (
          <EmptyState
            title={copy.transactions.emptyMonth(formatMonthLabel(month))}
            actionLabel={copy.transactions.emptyMonthCta}
            onAction={() => openSheet({ kind: 'transaction/new' })}
          />
        )
      ) : (
        <TransactionList
          transactions={visible}
          categories={categoryMap}
          currency={currency}
          today={today}
          onSelect={(id) => openSheet({ kind: 'transaction/edit', id })}
        />
      )}
    </div>
  )
}
