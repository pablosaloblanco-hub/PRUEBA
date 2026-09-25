// ============================================================================
// src/ui/components/MonthSelector.tsx — «‹ septiembre 2026 ›» + «Hoy» pill
// (§7.0). Clamped to MIN_MONTH..MAX_MONTH: the edge button is disabled.
// ============================================================================
import { formatMonthLabel, monthKeyOf } from '../../domain/dates'
import { MAX_MONTH, MIN_MONTH } from '../../domain/types'
import { copy } from '../copy'
import { useToday, useUi, useUiActions } from '../state/useUi'

export function MonthSelector() {
  const { month } = useUi()
  const today = useToday()
  const { shiftMonth, setMonth } = useUiActions()
  const thisMonth = monthKeyOf(today)

  return (
    <div className="month-selector">
      <button
        type="button"
        className="month-selector__btn"
        aria-label={copy.month.previous}
        disabled={month <= MIN_MONTH}
        onClick={() => shiftMonth(-1)}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <span className="month-selector__label" aria-live="polite">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        className="month-selector__btn"
        aria-label={copy.month.next}
        disabled={month >= MAX_MONTH}
        onClick={() => shiftMonth(1)}
      >
        <span aria-hidden="true">›</span>
      </button>
      {month !== thisMonth ? (
        <button type="button" className="month-selector__today" onClick={() => setMonth(thisMonth)}>
          {copy.month.today}
        </button>
      ) : null}
    </div>
  )
}
