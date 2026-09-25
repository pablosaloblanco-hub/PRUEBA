export type EmptyStateProps = {
  title: string
  text?: string
  /** Primary call to action (rendered only together with `onAction`). */
  actionLabel?: string
  onAction?: () => void
  /** Secondary, ghost-styled action. */
  secondaryLabel?: string
  onSecondary?: () => void
}

/** Centred placeholder for empty lists and first use (§7). */
export function EmptyState({ title, text, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  const hasPrimary = actionLabel !== undefined && onAction !== undefined
  const hasSecondary = secondaryLabel !== undefined && onSecondary !== undefined
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {text !== undefined ? <p className="empty__text">{text}</p> : null}
      {hasPrimary || hasSecondary ? (
        <div className="empty__actions">
          {hasPrimary ? (
            <button type="button" className="btn btn--primary" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
          {hasSecondary ? (
            <button type="button" className="btn btn--ghost" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
