// ============================================================================
// src/ui/components/charts/ChartFrame.tsx — sizing wrapper for a Recharts
// chart: `ResponsiveContainer` at runtime (explicit height that includes the
// axis band, no nested scroll) or a fixed width/height when `size` is given
// (tests render without ResizeObserver measurements, §10.2 «Charts»). The
// wrapper carries role="img" + aria-label (§8.2); the table/legend twin lives
// outside it.
// ============================================================================
import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import './charts.css'

export type ChartSize = { width: number; height: number }

export type ChartFrameProps = {
  /** Height in px of the chart area (240 on mobile, §7.5). Ignored when `size` is given. */
  height: number
  /** Fixed size (tests): the chart renders at exactly these pixels, without ResponsiveContainer. */
  size?: ChartSize
  /** aria-label summary of the chart (§8.2). */
  ariaLabel: string
  /**
   * Renders the chart element. `dims` is undefined at runtime (ResponsiveContainer injects
   * width/height into the returned element) and the fixed size in tests.
   */
  children: (dims: ChartSize | undefined) => ReactElement
  /** HTML overlay drawn over the chart (e.g. the donut centre label). */
  overlay?: ReactNode
  className?: string
}

export function ChartFrame({ height, size, ariaLabel, children, overlay, className }: ChartFrameProps) {
  const classes = `chart-frame${className !== undefined ? ` ${className}` : ''}`
  const style = size !== undefined ? { width: `${size.width}px`, height: `${size.height}px` } : { height: `${height}px` }
  return (
    <div className={classes} style={style} role="img" aria-label={ariaLabel}>
      {size !== undefined ? (
        children(size)
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children(undefined)}
        </ResponsiveContainer>
      )}
      {overlay !== undefined ? (
        <div className="chart-frame__overlay" aria-hidden="true">
          {overlay}
        </div>
      ) : null}
    </div>
  )
}
