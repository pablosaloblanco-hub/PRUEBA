// ============================================================================
// src/ui/views/CategoriesView.tsx — Categorías screen (§2.1 F4, §7.6): tabs
// Gastos | Ingresos, a <ul> of <li> rows (badge, name, «{n} movimientos» and an
// icon button «Editar {nombre}») and «+ Nueva categoría». Rows are NOT buttons.
// ============================================================================
import { useMemo, useState } from 'react'
import { countTransactionsByCategory } from '../../domain/queries'
import type { TransactionType } from '../../domain/types'
import { CategoryBadge } from '../components/CategoryBadge'
import { SegmentedControl } from '../components/SegmentedControl'
import { copy } from '../copy'
import { useAppData } from '../state/useStore'
import { useUiActions } from '../state/useUi'
import './categories.css'

const TYPE_OPTIONS = [
  { value: 'expense', label: copy.categories.expenses },
  { value: 'income', label: copy.categories.incomes },
] as const

export function CategoriesView() {
  const data = useAppData()
  const { openSheet } = useUiActions()
  const [type, setType] = useState<TransactionType>('expense')

  const counts = useMemo(() => countTransactionsByCategory(data.transactions), [data])
  const rows = useMemo(
    () => data.categories.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder),
    [data, type],
  )

  return (
    <div className="screen screen--categories" data-screen={copy.nav.categories}>
      <div className="screen__toolbar">
        <SegmentedControl legend={copy.categories.type} name="categories-type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        <button type="button" className="btn btn--primary" onClick={() => openSheet({ kind: 'category/new', type })}>
          {copy.categories.newCategory}
        </button>
      </div>

      <ul className="list category-list">
        {rows.map((category) => (
          <li key={category.id} className="list-row category-row">
            <span className="category-row__badge">
              <CategoryBadge icon={category.icon} color={category.color} />
            </span>
            <div className="list-row__main">
              <span className="list-row__title truncate">{category.name}</span>
              <span className="list-row__subtitle">{copy.categories.transactionCount(counts.get(category.id) ?? 0)}</span>
            </div>
            <div className="list-row__actions">
              <button
                type="button"
                className="btn btn--ghost btn--icon category-row__edit"
                aria-label={copy.categories.editAria(category.name)}
                onClick={() => openSheet({ kind: 'category/edit', id: category.id })}
              >
                <span aria-hidden="true">✎</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
