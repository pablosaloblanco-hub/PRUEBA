import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryPicker } from './CategoryPicker'
import { cat } from '../../test/fixtures'

const categories = [
  cat({ id: 'c1', name: 'Alimentación', icon: '🛒', color: 'blue' }),
  cat({ id: 'c2', name: 'Ocio', icon: '🎬', color: 'pink' }),
  cat({ id: 'c3', name: 'Transporte', icon: '🚌', color: 'teal' }),
]

describe('CategoryPicker', () => {
  it('renders a labelled group of pressed/unpressed tiles', () => {
    render(<CategoryPicker categories={categories} value="c2" onChange={() => {}} label="Categoría" />)
    const group = screen.getByRole('group', { name: 'Categoría' })
    expect(group).toHaveClass('tile-grid')
    const tiles = screen.getAllByRole('button')
    expect(tiles).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Alimentación' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Ocio' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Transporte' })).toHaveAttribute('aria-pressed', 'false')
    for (const tile of tiles) expect(tile).toHaveAttribute('type', 'button')
  })

  it('renders the badge with the category colour and hides it from assistive tech', () => {
    render(<CategoryPicker categories={categories} value={null} onChange={() => {}} label="Categoría" />)
    const tile = screen.getByRole('button', { name: 'Ocio' })
    const badge = tile.querySelector('.badge')
    expect(badge).not.toBeNull()
    expect(badge).toHaveAttribute('data-color', 'pink')
    expect(badge).toHaveAttribute('aria-hidden', 'true')
    expect(badge).toHaveTextContent('🎬')
  })

  it('calls onChange with the id of the clicked tile', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CategoryPicker categories={categories} value={null} onChange={onChange} label="Categoría" />)
    await user.click(screen.getByRole('button', { name: 'Transporte' }))
    expect(onChange).toHaveBeenCalledWith('c3')
  })

  it('is keyboard operable', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CategoryPicker categories={categories} value={null} onChange={onChange} label="Categoría" />)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Alimentación' })).toHaveFocus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('c2')
  })

  it('renders an empty group without tiles', () => {
    render(<CategoryPicker categories={[]} value={null} onChange={() => {}} label="Categoría" />)
    expect(screen.getByRole('group', { name: 'Categoría' })).toBeEmptyDOMElement()
  })
})
