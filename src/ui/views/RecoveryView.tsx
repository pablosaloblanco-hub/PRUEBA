// ============================================================================
// src/ui/views/RecoveryView.tsx — the card that replaces the content while
// persistence.load is `corrupt` or `newer` (§5.5). «Empezar de cero» asks to
// type BORRAR inline (the shared ConfirmDialog is built in parallel).
// ============================================================================
import { useId, useState } from 'react'
import { copy } from '../copy'
import { downloadText, RAW_DATA_FILENAME, TEXT_MIME } from '../hooks/useDownload'
import { usePersistence, useStore } from '../state/useStore'

export function RecoveryView() {
  const store = useStore()
  const { load, backupUnreadable } = usePersistence()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const titleId = useId()
  const inputId = useId()

  if (load === null || (load.kind !== 'corrupt' && load.kind !== 'newer')) return null

  const downloadRaw = () => downloadText(RAW_DATA_FILENAME, load.raw, TEXT_MIME)
  const cancelConfirm = () => {
    setConfirming(false)
    setTyped('')
  }
  const canRestore = load.kind === 'corrupt' && load.hasBackup && !backupUnreadable
  const keywordMatches = typed === copy.settings.deleteAllKeyword

  return (
    <section className="section recovery" aria-labelledby={titleId}>
      <h3 id={titleId} className="section__title">
        {load.kind === 'corrupt' ? copy.persistence.corruptTitle : copy.persistence.newerTitle}
      </h3>
      {backupUnreadable ? <p className="recovery__note">{copy.persistence.backupUnreadable}</p> : null}
      <div className="recovery__actions">
        {canRestore ? (
          <button type="button" className="btn btn--primary" onClick={() => store.recover('restore-backup')}>
            {copy.persistence.restoreBackup}
          </button>
        ) : null}
        <button type="button" className="btn btn--ghost" onClick={downloadRaw}>
          {copy.persistence.downloadRaw}
        </button>
        {load.kind === 'corrupt' && !confirming ? (
          <button type="button" className="btn btn--danger" onClick={() => setConfirming(true)}>
            {copy.persistence.startOver}
          </button>
        ) : null}
      </div>
      {confirming ? (
        <form
          className="recovery__confirm field"
          onSubmit={(event) => {
            event.preventDefault()
            if (keywordMatches) store.recover('reset')
          }}
        >
          <label className="field__label" htmlFor={inputId}>
            {copy.settings.deleteAllConfirmText}
          </label>
          <input
            id={inputId}
            className="field__input"
            type="text"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <div className="recovery__actions">
            <button type="submit" className="btn btn--danger" disabled={!keywordMatches}>
              {copy.settings.deleteAllButton}
            </button>
            <button type="button" className="btn btn--ghost" onClick={cancelConfirm}>
              {copy.common.cancel}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
