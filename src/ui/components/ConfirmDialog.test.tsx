import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'

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

beforeAll(polyfillDialog)

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} title="¿Eliminar?" confirmLabel="Sí" onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows title, text and both buttons, wiring confirm and cancel', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="¿Eliminar este movimiento?"
        text="No se puede deshacer"
        confirmLabel="Sí, eliminar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByRole('dialog', { name: '¿Eliminar este movimiento?' })).toBeInTheDocument()
    expect(screen.getByText('No se puede deshacer')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'Sí, eliminar' })
    expect(confirm).toBeEnabled()
    expect(confirm).not.toHaveClass('btn--danger')
    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('uses a custom cancel label and the destructive style', () => {
    render(
      <ConfirmDialog
        open
        title="Borrar"
        confirmLabel="Borrar"
        cancelLabel="Atrás"
        destructive
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Atrás' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Borrar' })).toHaveClass('btn--danger')
  })

  it('keeps confirm disabled until the keyword matches exactly', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="Borrar todos los datos"
        text="Esta acción no se puede deshacer. Escribe BORRAR para confirmar"
        confirmLabel="Borrar"
        destructive
        requireKeyword="BORRAR"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    const input = screen.getByLabelText('Escribe BORRAR')
    const confirm = screen.getByRole('button', { name: 'Borrar' })
    expect(confirm).toBeDisabled()

    await user.type(input, 'borrar')
    expect(confirm).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, 'BORRAR')
    expect(confirm).toBeEnabled()
    await user.keyboard('{Enter}')
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  it('resets the typed keyword when reopened', async () => {
    const user = userEvent.setup()
    const props = {
      title: 'Borrar',
      confirmLabel: 'Borrar',
      requireKeyword: 'BORRAR',
      onConfirm: () => {},
      onCancel: () => {},
    }
    const { rerender } = render(<ConfirmDialog open {...props} />)
    await user.type(screen.getByLabelText('Escribe BORRAR'), 'BORRAR')
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeEnabled()

    rerender(<ConfirmDialog open={false} {...props} />)
    rerender(<ConfirmDialog open {...props} />)
    expect(screen.getByLabelText('Escribe BORRAR')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Borrar' })).toBeDisabled()
  })

  it('treats Escape (cancel event) and «Cerrar» as cancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="Borrar" confirmLabel="Borrar" onConfirm={() => {}} onCancel={onCancel} />)
    screen.getByRole('dialog').dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
