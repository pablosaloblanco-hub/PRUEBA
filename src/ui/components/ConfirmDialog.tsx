import { useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { copy } from '../copy'
import { Dialog } from './Dialog'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  /** Optional explanatory paragraph under the title. */
  text?: string
  confirmLabel: string
  /** Defaults to «Cancelar». */
  cancelLabel?: string
  /** Renders the confirm button as destructive (red). */
  destructive?: boolean
  /** When set (e.g. 'BORRAR') a labelled input appears and confirm stays disabled until it matches exactly. */
  requireKeyword?: string
  onConfirm: () => void
  /** Also used when the dialog is dismissed (Escape, backdrop, «×»). */
  onCancel: () => void
}

/** Two-button confirmation built on Dialog, with an optional «type KEYWORD to confirm» guard. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  if (!props.open) return null
  return <OpenConfirmDialog {...props} />
}

function OpenConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel,
  destructive,
  requireKeyword,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const inputId = useId()
  const keywordRequired = requireKeyword !== undefined && requireKeyword !== ''
  const canConfirm = !keywordRequired || typed === requireKeyword

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && canConfirm) {
      event.preventDefault()
      onConfirm()
    }
  }

  const footer = (
    <>
      <button type="button" className="btn btn--ghost btn--block" onClick={onCancel}>
        {cancelLabel ?? copy.common.cancel}
      </button>
      <button
        type="button"
        className={`btn btn--primary btn--block${destructive ? ' btn--danger' : ''}`}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </>
  )

  return (
    <Dialog open title={title} onClose={onCancel} footer={footer} variant="modal">
      {text !== undefined ? <p className="dialog__text">{text}</p> : null}
      {keywordRequired ? (
        <div className="field">
          <label htmlFor={inputId} className="field__label">
            {copy.common.typeToConfirm(requireKeyword)}
          </label>
          <input
            id={inputId}
            className="field__input"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : null}
    </Dialog>
  )
}
