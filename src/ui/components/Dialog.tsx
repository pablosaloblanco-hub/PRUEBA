import { useEffect, useId, useRef } from 'react'
import type { MouseEvent, ReactNode, SyntheticEvent } from 'react'
import { copy } from '../copy'
import { useIsDesktop } from '../hooks/useMediaQuery'

export type DialogVariant = 'sheet' | 'modal'

export type DialogProps = {
  /** When false the dialog is not rendered at all (state resets on reopen). */
  open: boolean
  /** Rendered as the <h2> the dialog is labelled by. */
  title: string
  /** Called on Escape (native `cancel`), on backdrop click and on the «×» button. Must be idempotent. */
  onClose: () => void
  children: ReactNode
  /** Optional footer (buttons); rendered outside the scrollable body. */
  footer?: ReactNode
  /** Overrides the id used for aria-labelledby (defaults to the title's own id). */
  labelledBy?: string
  /** 'sheet' (bottom sheet) or 'modal' (centred 480px); chosen by viewport width when omitted. */
  variant?: DialogVariant
}

/**
 * Selector of the element that receives focus once the dialog is open. React's
 * `autoFocus` runs while the <dialog> is still closed (a no-op), so children mark
 * their first field with `data-autofocus` instead; without one, `showModal()`
 * focuses the first focusable element (the «×» button).
 */
export const AUTOFOCUS_SELECTOR = '[data-autofocus]'

/**
 * Accessible <dialog> opened with `showModal()` (native focus trap and Escape).
 * Closes through `onClose` on Escape, backdrop click or the «Cerrar» button and
 * returns focus to the element that was focused before it opened.
 */
export function Dialog({ open, title, onClose, children, footer, labelledBy, variant }: DialogProps) {
  if (!open) return null
  return (
    <OpenDialog title={title} onClose={onClose} footer={footer} labelledBy={labelledBy} variant={variant}>
      {children}
    </OpenDialog>
  )
}

type OpenDialogProps = Omit<DialogProps, 'open'>

function OpenDialog({ title, onClose, children, footer, labelledBy, variant }: OpenDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const isDesktop = useIsDesktop()
  const resolvedVariant: DialogVariant = variant ?? (isDesktop ? 'modal' : 'sheet')

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    const previouslyFocused = document.activeElement
    if (!dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>(AUTOFOCUS_SELECTOR)?.focus()
    }
    return () => {
      if (dialog.open) dialog.close()
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [])

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    // The native `cancel` event does not bubble, but React re-dispatches it through the
    // component tree: a nested dialog (e.g. a ConfirmDialog inside a sheet) must not close
    // this one, so only events fired on this element count.
    if (event.target !== event.currentTarget) return
    // Keep the element in sync with React state: the parent decides when it closes.
    event.preventDefault()
    onClose()
  }

  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    // Clicks on the backdrop are delivered to the <dialog> itself; the panel covers the rest.
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${resolvedVariant}`}
      aria-labelledby={labelledBy ?? titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="dialog__panel">
        {resolvedVariant === 'sheet' ? <div className="dialog__handle" aria-hidden="true" /> : null}
        <header className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--ghost btn--icon dialog__close"
            aria-label={copy.common.close}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer !== undefined && footer !== null ? <footer className="dialog__footer">{footer}</footer> : null}
      </div>
    </dialog>
  )
}
