import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'
import type { TransactionType } from '../../domain/types'

const options = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
] as const

function Harness({ onChange, disabled }: { onChange?: (v: TransactionType) => void; disabled?: boolean }) {
  const [value, setValue] = useState<TransactionType>('expense')
  return (
    <SegmentedControl
      legend="Tipo"
      name="type"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
    />
  )
}

describe('SegmentedControl', () => {
  it('is a fieldset named by its legend with one radio per option', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Tipo' })
    expect(group.tagName).toBe('FIELDSET')
    expect(group).toHaveClass('segmented')
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Gasto' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Ingreso' })).not.toBeChecked()
    for (const radio of radios) expect(radio).toHaveAttribute('name', 'type')
  })

  it('calls onChange with the option value on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }))
    expect(onChange).toHaveBeenCalledWith('income')
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Gasto' })).not.toBeChecked()
  })

  it('works by clicking the visible label', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByText('Ingreso'))
    expect(onChange).toHaveBeenCalledWith('income')
  })

  it('disables every radio when disabled', () => {
    render(<Harness disabled />)
    expect(screen.getByRole('group', { name: 'Tipo' })).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
  })
})
