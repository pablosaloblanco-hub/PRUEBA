import { render, screen } from '@testing-library/react'
import { Money } from './Money'

const norm = (s: string | null): string => (s ?? '').replace(/\s/g, ' ')

describe('Money', () => {
  it('renders expenses with a leading U+2212 and the expense class', () => {
    render(<Money cents={1250} currency="EUR" type="expense" />)
    const el = screen.getByText((_, node) => node?.classList.contains('money') === true)
    expect(norm(el.textContent)).toBe('−12,50 €')
    expect(el).toHaveClass('money', 'money--expense')
    expect(el.tagName).toBe('SPAN')
  })

  it('renders incomes with a plus sign and the income class', () => {
    const { container } = render(<Money cents={120000} currency="EUR" type="income" />)
    const el = container.querySelector('.money')
    expect(norm(el?.textContent ?? null)).toBe('+1.200,00 €')
    expect(el).toHaveClass('money--income')
  })

  it('takes the sign from the type, never from the amount', () => {
    const { container } = render(<Money cents={-1250} currency="EUR" type="income" />)
    expect(norm(container.querySelector('.money')?.textContent ?? null)).toBe('+12,50 €')
  })

  it('defaults to neutral with formatCents and honours signDisplay', () => {
    const { container, rerender } = render(<Money cents={35680} currency="EUR" />)
    let el = container.querySelector('.money')
    expect(norm(el?.textContent ?? null)).toBe('356,80 €')
    expect(el).toHaveClass('money--neutral')

    rerender(<Money cents={35680} currency="EUR" signDisplay="always" />)
    el = container.querySelector('.money')
    expect(norm(el?.textContent ?? null)).toBe('+356,80 €')

    rerender(<Money cents={-35680} currency="EUR" />)
    el = container.querySelector('.money')
    expect(norm(el?.textContent ?? null)).toBe('−356,80 €')
  })

  it('formats other currencies and appends extra class names', () => {
    const { container } = render(<Money cents={500} currency="USD" className="kpi__value" />)
    const el = container.querySelector('.money')
    expect(norm(el?.textContent ?? null)).toBe('5,00 US$')
    expect(el).toHaveClass('money--neutral', 'kpi__value')
  })
})
