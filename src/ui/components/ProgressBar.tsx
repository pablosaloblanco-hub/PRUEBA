export type ProgressStatus = 'ok' | 'warning' | 'over'

export type ProgressBarProps = {
  /** Ratio 0..1; values above 1 (or NaN/negative) are clamped, the colour tells the rest. */
  value: number
  /** ok → accent, warning → --color-warning, over → --color-critical (via data-status). */
  status: ProgressStatus
  /** Accessible name, e.g. «Ocio: 110 %». */
  label: string
}

/** Clamps a ratio to an integer percentage 0..100. */
function toPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  if (value >= 1) return 100
  return Math.round(value * 100)
}

/** Accessible progress bar (role=progressbar) used by budgets and the Inicio category bars. */
export function ProgressBar({ value, status, label }: ProgressBarProps) {
  const percent = toPercent(value)
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      data-status={status}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}
