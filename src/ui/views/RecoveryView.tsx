// ============================================================================
// src/ui/views/RecoveryView.tsx — the card that replaces the content while
// persistence.load is `corrupt` or `newer` (§5.5). «Empezar de cero» goes
// through the shared ConfirmDialog with the «type BORRAR» guard (§7.7).
// ============================================================================
import { useId, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { copy } from '../copy'
import { downloadText, RAW_DATA_FILENAME, TEXT_MIME } from '../hooks/useDownload'
import { usePersistence, useStore } from '../state/useStore'

export function RecoveryView() {
  const store = useStore()
  const { load, backupUnreadable } = usePersistence()
  const [confirming, setConfirming] = useState(false)
  const titleId = useId()

  if (load === null || (load.kind !== 'corrupt' && load.kind !== 'newer')) return null

  const downloadRaw = () => downloadText(RAW_DATA_FILENAME, load.raw, TEXT_MIME)
  const canRestore = load.kind === 'corrupt' && load.hasBackup && !backupUnreadable

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
        {load.kind === 'corrupt' ? (
          <button type="button" className="btn btn--danger" onClick={() => setConfirming(true)}>
            {copy.persistence.startOver}
          </button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        title={copy.persistence.startOver}
        text={copy.settings.deleteAllConfirmText}
        confirmLabel={copy.settings.deleteAllButton}
        destructive
        requireKeyword={copy.settings.deleteAllKeyword}
        onConfirm={() => {
          setConfirming(false)
          store.recover('reset')
        }}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}
