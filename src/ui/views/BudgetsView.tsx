// ============================================================================
// src/ui/views/BudgetsView.tsx — Presupuestos screen (§2.1 F5, §7.4): the
// month's budgets (total first, then by ratio), «+ Nuevo presupuesto» in the
// toolbar (icon-only on mobile; disabled with help when every option is taken)
// and the empty state.
// ============================================================================
import { useId, useMemo } from 'react'
import { budgetProgress } from '../../domain/queries'
import type { AppData } from '../../domain/types'
import { BudgetCard } from '../components/BudgetCard'
import { EmptyState } from '../components/EmptyState'
import { copy } from '../copy'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useAppData, useDispatch } from '../state/useStore'
import { useUi, useUiActions } from '../state/useUi'
import './budgets.css'

/** Whether a new budget can still be created: no total yet, or an expense category without one. */
function hasBudgetOptions(data: AppData): boolean {
  const budgeted = new Set(data.budgets.map((b) => b.categoryId))
  if (!budgeted.has(null)) return true
  return data.categories.some((c) => c.type === 'expense' && !budgeted.has(c.id))
}

export function BudgetsView() {
  const data = useAppData()
  const dispatch = useDispatch()
  const { month } = useUi()
  const { openSheet, showToast } = useUiActions()
  const isDesktop = useIsDesktop()
  const helpId = useId()

  const rows = useMemo(() => budgetProgress(data, month), [data, month])
  const canCreate = useMemo(() => hasBudgetOptions(data), [data])
  const currency = data.settings.currency

  const openNew = () => openSheet({ kind: 'budget/new' })
  const remove = (id: string) => {
    const result = dispatch({ type: 'budget/remove', id })
    if (result.ok) showToast(copy.budgets.toastDeleted)
  }

  return (
    <div className="screen screen--budgets" data-screen={copy.nav.budgets}>
      <div className="screen__toolbar budgets__toolbar">
        <div className="stack">
          {isDesktop ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canCreate}
              aria-describedby={canCreate ? undefined : helpId}
              onClick={openNew}
            >
              {copy.budgets.newBudget}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--icon"
              aria-label={copy.budgets.newBudgetShort}
              disabled={!canCreate}
              aria-describedby={canCreate ? undefined : helpId}
              onClick={openNew}
            >
              <span aria-hidden="true">+</span>
            </button>
          )}
          {!canCreate ? (
            <p id={helpId} className="budgets__toolbar-help">
              {copy.budgets.allHaveBudget}
            </p>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={copy.budgets.emptyTitle}
          text={copy.budgets.emptyText}
          actionLabel={copy.budgets.emptyCta}
          onAction={openNew}
        />
      ) : (
        <div className="grid-2 budgets__grid">
          {rows.map((row) => (
            <BudgetCard
              key={row.budget.id}
              progress={row}
              currency={currency}
              onEdit={() => openSheet({ kind: 'budget/edit', id: row.budget.id })}
              onDelete={() => remove(row.budget.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
