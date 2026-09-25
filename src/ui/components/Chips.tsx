import type { ReactNode } from 'react'

export type ChipProps = {
  /** Selected state, exposed as aria-pressed. */
  pressed: boolean
  onClick: () => void
  children: ReactNode
  /** Accessible name when the visible content is not descriptive enough. */
  ariaLabel?: string
  /**
   * When set, a separate «×» button is rendered next to the chip (never nested
   * inside it) with `removeLabel` as its aria-label.
   */
  onRemove?: () => void
  removeLabel?: string
}

/** Toggle chip: a <button aria-pressed>. With `onRemove`, a sibling remove button is added. */
export function Chip({ pressed, onClick, children, ariaLabel, onRemove, removeLabel }: ChipProps) {
  const button = (
    <button type="button" className="chip" aria-pressed={pressed} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  )
  if (onRemove === undefined) return button
  return (
    <span className="chip-group">
      {button}
      <button type="button" className="chip__remove" aria-label={removeLabel} onClick={onRemove}>
        ×
      </button>
    </span>
  )
}

export type ChipRowProps = { children: ReactNode }

/** Horizontally scrollable row of chips (no wrap, hidden scrollbar). */
export function ChipRow({ children }: ChipRowProps) {
  return <div className="chip-row">{children}</div>
}
