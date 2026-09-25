import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from './Dialog'

/** jsdom has no showModal/close; setup.ts may add them later, so only fill the gaps. */
function polyfillDialog(): void {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

beforeAll(polyfillDialog)
afterEach(() => vi.unstubAllGlobals())

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} title="Hola" onClose={() => {}}>
        <p>contenido</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('contenido')).toBeNull()
  })

  it('opens with showModal, is labelled by its title and renders body and footer', () => {
    render(
      <Dialog open title="Nuevo movimiento" onClose={() => {}} footer={<button type="button">Guardar</button>}>
        <p>contenido</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Nuevo movimiento' })
    expect(dialog).toHaveAttribute('open')
    const heading = screen.getByRole('heading', { level: 2, name: 'Nuevo movimiento' })
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id)
    expect(screen.getByText('contenido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })

  it('honours labelledBy when given', () => {
    render(
      <Dialog open title="Título" onClose={() => {}} labelledBy="custom-id">
        <p id="custom-id">Etiqueta externa</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'custom-id')
  })

  it('calls onClose from the «Cerrar» button', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Dialog open title="Título" onClose={onClose}>
        <p>x</p>
      </Dialog>,
    )
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on the native cancel event (Escape) and keeps the element controlled', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Título" onClose={onClose}>
        <p>x</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    const cancel = new Event('cancel', { cancelable: true })
    const notPrevented = dialog.dispatchEvent(cancel)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(notPrevented).toBe(false)
  })

  it('closes on backdrop click but not on clicks inside the panel', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Título" onClose={onClose}>
        <p>dentro</p>
      </Dialog>,
    )
    fireEvent.click(screen.getByText('dentro'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the previously focused element when it closes', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'abrir'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { rerender } = render(
      <Dialog open title="Título" onClose={() => {}}>
        <input aria-label="campo" />
      </Dialog>,
    )
    screen.getByLabelText('campo').focus()
    expect(trigger).not.toHaveFocus()

    rerender(
      <Dialog open={false} title="Título" onClose={() => {}}>
        <input aria-label="campo" />
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('is a bottom sheet with a handle when the viewport is narrow', () => {
    stubMatchMedia(false)
    render(
      <Dialog open title="Título" onClose={() => {}}>
        <p>x</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('dialog', 'dialog--sheet')
    expect(dialog.querySelector('.dialog__handle')).not.toBeNull()
  })

  it('is a centred modal on desktop and lets variant override the choice', () => {
    stubMatchMedia(true)
    const { rerender } = render(
      <Dialog open title="Título" onClose={() => {}}>
        <p>x</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('dialog--modal')
    expect(screen.getByRole('dialog').querySelector('.dialog__handle')).toBeNull()

    rerender(
      <Dialog open title="Título" onClose={() => {}} variant="sheet">
        <p>x</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toHaveClass('dialog--sheet')
  })

  it('does not render a footer element without footer content', () => {
    render(
      <Dialog open title="Título" onClose={() => {}}>
        <p>x</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog').querySelector('.dialog__footer')).toBeNull()
  })
})
