// ============================================================================
// src/ui/components/charts/chartColors.ts — resolves the chart tokens of
// src/styles/tokens.css (--series-1..8, --series-other, --series-income,
// --series-expense, grid/axis/text/surface) to concrete colour strings, because
// Recharts needs literal values inside SVG attributes (CHART_BRIEF). The hook
// re-reads them when <html data-theme> changes or prefers-color-scheme flips;
// in jsdom (no stylesheet → empty values) the light-theme defaults are used.
// ============================================================================
import { useEffect, useState } from 'react'

/** CSS custom property of a positional donut slot (§7.5): `--series-{i+1}`, or `--series-other` for «Otras». */
export type SeriesSlot =
  | '--series-1'
  | '--series-2'
  | '--series-3'
  | '--series-4'
  | '--series-5'
  | '--series-6'
  | '--series-7'
  | '--series-8'
  | '--series-other'

export const SERIES_SLOTS: readonly SeriesSlot[] = [
  '--series-1',
  '--series-2',
  '--series-3',
  '--series-4',
  '--series-5',
  '--series-6',
  '--series-7',
  '--series-8',
]

export type ChartColors = {
  /** Positional category slots --series-1..8 (never cycled; >8 fold into «Otras»). */
  series: readonly string[]
  other: string
  income: string
  expense: string
  grid: string
  axis: string
  tick: string
  surface: string
  border: string
  text: string
}

/** Light-theme values of tokens.css, used when getComputedStyle returns nothing (jsdom). */
export const CHART_COLOR_FALLBACKS: ChartColors = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  other: '#898781',
  income: '#008300',
  expense: '#e34948',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  tick: '#898781',
  surface: '#fcfcfb',
  border: 'rgba(11, 11, 11, 0.1)',
  text: '#0b0b0b',
}

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/** Media query that disables chart animations (CHART_BRIEF, §8.2). */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim()
  return value === '' ? fallback : value
}

/** Reads the current chart tokens from `<html>`; every missing token falls back to the light default. */
export function readChartColors(): ChartColors {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return CHART_COLOR_FALLBACKS
  const style = getComputedStyle(document.documentElement)
  const f = CHART_COLOR_FALLBACKS
  return {
    series: SERIES_SLOTS.map((slot, i) => readVar(style, slot, f.series[i] ?? f.other)),
    other: readVar(style, '--series-other', f.other),
    income: readVar(style, '--series-income', f.income),
    expense: readVar(style, '--series-expense', f.expense),
    grid: readVar(style, '--color-grid', f.grid),
    axis: readVar(style, '--color-border-strong', f.axis),
    tick: readVar(style, '--color-text-muted', f.tick),
    surface: readVar(style, '--color-surface', f.surface),
    border: readVar(style, '--color-border', f.border),
    text: readVar(style, '--color-text', f.text),
  }
}

/** Slot of the i-th row of the folded breakdown: `--series-{i+1}`, or `--series-other` for the «Otras» row. */
export function seriesSlot(index: number, isOthers: boolean): SeriesSlot {
  if (isOthers) return '--series-other'
  return SERIES_SLOTS[index] ?? '--series-other'
}

/** Colour of a slot from a resolved `ChartColors`. */
export function slotColor(colors: ChartColors, slot: SeriesSlot): string {
  if (slot === '--series-other') return colors.other
  const index = SERIES_SLOTS.indexOf(slot)
  return colors.series[index] ?? colors.other
}

function sameColors(a: ChartColors, b: ChartColors): boolean {
  return (
    a.other === b.other &&
    a.income === b.income &&
    a.expense === b.expense &&
    a.grid === b.grid &&
    a.axis === b.axis &&
    a.tick === b.tick &&
    a.surface === b.surface &&
    a.border === b.border &&
    a.text === b.text &&
    a.series.length === b.series.length &&
    a.series.every((c, i) => c === b.series[i])
  )
}

/**
 * Chart colours that follow the theme: re-read on `<html data-theme>` changes
 * (MutationObserver) and when the OS colour scheme flips. The returned object
 * keeps its reference while the values are unchanged (safe for memo deps).
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(readChartColors)

  useEffect(() => {
    const refresh = () => {
      const next = readChartColors()
      setColors((prev) => (sameColors(prev, next) ? prev : next))
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mql = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_SCHEME_QUERY) : null
    mql?.addEventListener('change', refresh)
    return () => {
      observer.disconnect()
      mql?.removeEventListener('change', refresh)
    }
  }, [])

  return colors
}
