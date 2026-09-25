import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AmountInput } from './AmountInput'
import { currencySymbol, parseAmountField } from './amountField'
import type { AmountInputProps } from './AmountInput'
import { copy } from '../copy'

const norm = (s: string | null): string => (s ?? '').replace(/\s/g, ' ')

type HarnessProps = Partial<Omit<AmountInputProps, 'value' | 'onChange'>> & { initial?: string }

function Harness({ initial = '', ...rest }: HarnessProps) {
  const [value, setValue] = useState(initial)
  return <AmountInput id="amount" label="Importe" currency="EUR" value={value} onChange={setValue} {...rest} />
}

describe('parseAmountField', () => {
  it('returns cents for valid input and the Spanish message otherwise', () => {
    expect(parseAmountField('12,50')).toEqual({ cents: 1250 })
    expect(parseAmountField('1.234,56')).toEqual({ cents: 123456 })
    expect(parseAmountField('')).toEqual({ error: copy.validation.amountEmptyOrZero })
    expect(parseAmountField('0')).toEqual({ error: copy.validation.amountEmptyOrZero })
    expect(parseAmountField('12,505')).toEqual({ error: copy.validation.amountTooManyDecimals })
    expect(parseAmountField('12a')).toEqual({ error: copy.validation.amountInvalid })
    expect(parseAmountField('1000000000')).toEqual({ error: copy.validation.amountTooLarge })
    expect(parseAmountField('-5')).toEqual({ error: copy.validation.amountNegative })
  })

  it('honours allowZero and allowNegative', () => {
    expect(parseAmountField('0', { allowZero: true })).toEqual({ cents: 0 })
    expect(parseAmountField('-5', { allowNegative: true })).toEqual({ cents: -500 })
  })
})

describe('currencySymbol', () => {
  it('derives the es-ES symbol from the formatter', () => {
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('USD')).toBe('US$')
    // Codes ICU has no es-ES symbol for keep the code itself; unknown codes fall back to EUR.
    expect(currencySymbol('GBP')).toBe('GBP')
    expect(currencySymbol('XXX')).toBe('€')
  })
})

describe('AmountInput', () => {
  it('renders a labelled decimal text input with the expected attributes', () => {
    render(<Harness />)
    const input = screen.getByLabelText('Importe')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    expect(input).toHaveAttribute('autocomplete', 'off')
    expect(input).toHaveAttribute('placeholder', '0,00')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).toHaveAttribute('aria-describedby', 'amount-hint')
  })

  it('shows the live preview while the text parses', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Importe')
    await user.type(input, '12,50')
    expect(norm(document.getElementById('amount-hint')?.textContent ?? null)).toBe('= 12,50 €')
    expect(input).not.toHaveAttribute('aria-invalid')

    await user.clear(input)
    await user.type(input, '1.234,56')
    expect(norm(document.getElementById('amount-hint')?.textContent ?? null)).toBe('= 1.234,56 €')
  })

  it('formats the preview in the given currency', async () => {
    const user = userEvent.setup()
    render(<Harness currency="USD" />)
    await user.type(screen.getByLabelText('Importe'), '5')
    expect(norm(document.getElementById('amount-hint')?.textContent ?? null)).toBe('= 5,00 US$')
  })

  it.each([
    ['12,505', copy.validation.amountTooManyDecimals],
    ['abc', copy.validation.amountInvalid],
    ['0', copy.validation.amountEmptyOrZero],
    ['-5', copy.validation.amountNegative],
    ['1000000000', copy.validation.amountTooLarge],
  ])('shows the inline error for %s with aria-invalid and aria-describedby', async (text, message) => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Importe')
    await user.type(input, text)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(message)
    expect(screen.getByText(message)).toHaveClass('field__error')
  })

  it('does not show the empty error until the field is touched', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByLabelText('Importe')
    expect(screen.queryByText(copy.validation.amountEmptyOrZero)).toBeNull()
    expect(input).not.toHaveAttribute('aria-invalid')

    await user.click(input)
    await user.tab()
    expect(screen.getByText(copy.validation.amountEmptyOrZero)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('accepts zero and negatives when allowed', async () => {
    const user = userEvent.setup()
    render(<Harness allowZero allowNegative />)
    const input = screen.getByLabelText('Importe')
    await user.type(input, '0')
    expect(norm(document.getElementById('amount-hint')?.textContent ?? null)).toBe('= 0,00 €')
    await user.clear(input)
    await user.type(input, '-5')
    expect(norm(document.getElementById('amount-hint')?.textContent ?? null)).toBe('= −5,00 €')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('calls onSubmit on Enter and onBlur on blur', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onBlur = vi.fn()
    render(<Harness onSubmit={onSubmit} onBlur={onBlur} initial="12" />)
    const input = screen.getByLabelText('Importe')
    await user.click(input)
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await user.tab()
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('merges describedBy with the hint id and supports autoFocus', () => {
    render(
      <>
        <p id="help">Se aplica a todos los meses</p>
        <Harness describedBy="help" autoFocus />
      </>,
    )
    const input = screen.getByLabelText('Importe')
    expect(input).toHaveAttribute('aria-describedby', 'help amount-hint')
    expect(input).toHaveFocus()
  })
})
