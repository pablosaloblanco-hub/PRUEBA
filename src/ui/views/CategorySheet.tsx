// ============================================================================
// src/ui/views/CategorySheet.tsx — STUB (Skeleton phase). Replaced by the sheet
// agent; keep the contract: no props, reads `ui.sheet` and closes with
// closeSheet() (docs/UI_CONVENTIONS.md). Uses a minimal inline <dialog> until
// the shared Dialog component exists.
// ============================================================================
import { useEffect, useId, useRef } from 'react'
import { copy } from '../copy'
import { useUi, useUiActions } from '../state/useUi'

export function CategorySheet() {
  const { sheet } = useUi()
  const { closeSheet } = useUiActions()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const title = sheet.kind.endsWith('/edit') ? copy.categories.sheetEditTitle : copy.categories.sheetNewTitle

  useEffect(() => {
    const dialog = ref.current
    if (dialog !== null && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog ref={ref} className="dialog dialog--sheet" aria-labelledby={titleId} onClose={closeSheet}>
      <div className="dialog__panel">
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--icon dialog__close"
            aria-label={copy.common.close}
            onClick={() => ref.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </dialog>
  )
}
