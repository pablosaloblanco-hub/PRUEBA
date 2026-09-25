// ============================================================================
// src/ui/components/BudgetCard.tsx — one budget of the selected month (§2.1 F5,
// §7.4): emoji + name (or «Presupuesto total»), «Gastado x de y», progress bar
// coloured by status, status line and optional Editar / Eliminar actions (the
// delete goes through a ConfirmDialog with the §7.4 texts).
// ============================================================================
import { useState } from 'react'
import { formatCents } from '../../domain/money'
import type { BudgetProgress } from '../../domain/queries'
import { copy } from '../copy'
import { CategoryBadge } from './CategoryBadge'
import { ConfirmDialog } from './ConfirmDialog'
import { ProgressBar } from './ProgressBar'

export type BudgetCardProps = {
  progress: BudgetProgress
  currency: string
  onEdit?: () => void
  /** Called once the user confirms the deletion in the dialog. */
  onDelete?: () => void
  /** Smaller variant without actions (Inicio). */
  compact?: boolean
}

/** Name shown for a budget row: the category name or «Presupuesto total». */
function budgetName(progress: BudgetProgress): string {
  return progress.category?.name ?? copy.budgets.total
}

/** «Te quedan x» / «Has superado el presupuesto en x» (§2.1 F5). */
function budgetStatusText(progress: BudgetProgress, currency: string): string {
  return progress.status === 'over'
    ? copy.budgets.exceeded(formatCents(-progress.remainingCents, currency))
    : copy.budgets.remaining(formatCents(progress.remainingCents, currency))
}

export function BudgetCard({ progress, currency, onEdit, onDelete, compact }: BudgetCardProps) {
  const [confirming, setConfirming] = useState(false)
  const name = budgetName(progress)
  const spentText = copy.budgets.spentOf(formatCents(progress.spentCents, currency), formatCents(progress.limitCents, currency))
  const showActions = !compact && (onEdit !== undefined || onDelete !== undefined)

  const confirmTitle =
    progress.category === null ? copy.budgets.confirmDeleteTotal : copy.budgets.confirmDeleteCategory(progress.category.name)

  return (
    <article className={`card budget-card${compact ? ' budget-card--compact' : ''}`} data-status={progress.status}>
      <h3 className="card__title budget-card__title">
        <span className="budget-card__name">
          {progress.category !== null ? (
            <CategoryBadge icon={progress.category.icon} color={progress.category.color} size={compact ? 'sm' : 'md'} />
          ) : (
            <span className="badge badge--md budget-card__total-icon" data-color="gray" aria-hidden="true">
              Σ
            </span>
          )}
          <span className="truncate">{name}</span>
        </span>
      </h3>
      <p className="budget-card__spent tabular-nums">{spentText}</p>
      <ProgressBar value={progress.ratio} status={progress.status} label={`${name}: ${spentText}`} />
      <p className={`budget-card__status budget-card__status--${progress.status} tabular-nums`}>
        {budgetStatusText(progress, currency)}
      </p>
      {showActions ? (
        <div className="card__footer budget-card__actions">
          {onEdit !== undefined ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
              {copy.budgets.edit}
            </button>
          ) : null}
          {onDelete !== undefined ? (
            <button type="button" className="btn btn--ghost btn--sm budget-card__delete" onClick={() => setConfirming(true)}>
              {copy.budgets.delete}
            </button>
          ) : null}
        </div>
      ) : null}
      {onDelete !== undefined ? (
        <ConfirmDialog
          open={confirming}
          title={confirmTitle}
          confirmLabel={copy.budgets.delete}
          destructive
          onConfirm={() => {
            setConfirming(false)
            onDelete()
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </article>
  )
}
