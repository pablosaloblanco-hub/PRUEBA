import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

function valueNow(): string | null {
  return screen.getByRole('progressbar').getAttribute('aria-valuenow')
}

describe('ProgressBar', () => {
  it('exposes the progressbar role with value, bounds and label', () => {
    render(<ProgressBar value={0.79} status="ok" label="Ocio: 79 %" />)
    const bar = screen.getByRole('progressbar', { name: 'Ocio: 79 %' })
    expect(bar).toHaveAttribute('aria-valuenow', '79')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(bar).toHaveAttribute('data-status', 'ok')
    expect(bar.querySelector('.progress__fill')).toHaveStyle({ width: '79%' })
  })

  it('clamps values above 1 to 100 % and keeps the status', () => {
    render(<ProgressBar value={1.1} status="over" label="Ocio: 110 %" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('data-status', 'over')
    expect(bar.querySelector('.progress__fill')).toHaveStyle({ width: '100%' })
  })

  it('reflects the warning status', () => {
    render(<ProgressBar value={0.8} status="warning" label="Total: 80 %" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-status', 'warning')
    expect(valueNow()).toBe('80')
  })

  it.each([
    [0, '0'],
    [0.5, '50'],
    [0.795, '80'],
    [1, '100'],
    [1.5, '100'],
    [-0.2, '0'],
    [Number.NaN, '0'],
    [Number.POSITIVE_INFINITY, '0'],
  ])('maps value %s to aria-valuenow %s (clamped, rounded)', (value, expected) => {
    render(<ProgressBar value={value} status="ok" label="x" />)
    expect(valueNow()).toBe(expected)
    expect(screen.getByRole('progressbar').querySelector('.progress__fill')).toHaveStyle({ width: `${expected}%` })
  })
})
