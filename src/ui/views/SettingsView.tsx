// ============================================================================
// src/ui/views/SettingsView.tsx — Ajustes (§2.1 F9/F10, §7.7): General
// (currency, theme, initial balance), Organización (Categorías, mobile),
// Copia de seguridad (export JSON / import with preview + confirmation),
// Zona peligrosa (delete everything, keyword-guarded) and the footer with the
// storage usage.
//
// Storage usage: the Store does not expose its repository, so the footer
// estimates the bytes with a throw-away `createLocalStorageRepository` over
// `window.localStorage` (`estimateBytes` = STORAGE_KEY + BACKUP_STORAGE_KEY,
// length × 2 each). When localStorage is unavailable the estimate is 0.
// ============================================================================
import { useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { formatBytes, formatCentsPlain } from '../../domain/money'
import { exportJson, parseImport } from '../../domain/storage/jsonio'
import { createLocalStorageRepository } from '../../domain/storage/localStorageRepository'
import type { ImportError, ImportPreview } from '../../domain/storage/schema'
import { SUPPORTED_CURRENCIES, Theme } from '../../domain/types'
import type { AppData, Cents } from '../../domain/types'
import { AmountInput } from '../components/AmountInput'
import { parseAmountField } from '../components/amountField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Dialog } from '../components/Dialog'
import { SegmentedControl } from '../components/SegmentedControl'
import { copy } from '../copy'
import { backupFilename, downloadText, JSON_MIME } from '../hooks/useDownload'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useAppData, useDispatch } from '../state/useStore'
import { useToday, useUiActions } from '../state/useUi'
import './settings.css'

/** Files above this size are rejected before reading them (§4.8, `too-large`). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024

const THEME_OPTIONS = [
  { value: Theme.system, label: copy.settings.themeSystem },
  { value: Theme.light, label: copy.settings.themeLight },
  { value: Theme.dark, label: copy.settings.themeDark },
] as const

/** Spanish message for each import failure (§2.1 F9). */
function importErrorMessage(error: ImportError): string {
  switch (error) {
    case 'invalid-json':
      return copy.settings.importErrorInvalidJson
    case 'newer-version':
      return copy.settings.importErrorNewer
    case 'too-large':
      return copy.settings.importErrorTooLarge
    case 'not-an-envelope':
    case 'invalid-data':
      return copy.settings.importErrorNotBackup
  }
}

type ImportState =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'preview'; data: AppData; preview: ImportPreview }

/** `window.localStorage` can throw on access (SecurityError); the estimate is then 0. */
function readLocalStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function estimateStorageBytes(): number {
  return createLocalStorageRepository(readLocalStorage()).estimateBytes()
}

/** Raw text for the initial-balance field: '-1234,56' style, round-trips through parseAmount. */
function balanceText(cents: Cents): string {
  return formatCentsPlain(cents)
}

export function SettingsView() {
  const data = useAppData()
  const dispatch = useDispatch()
  const today = useToday()
  const { nav, showToast } = useUiActions()
  const isDesktop = useIsDesktop()
  const currencyId = useId()
  const currencyHelpId = useId()
  const fileId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { settings } = data
  const currency = settings.currency

  // Initial balance: local raw text, re-synced from the snapshot whenever the
  // stored value changes (after a save, an import or a reset), never per key.
  const [balance, setBalance] = useState(() => ({ cents: settings.initialBalanceCents, text: balanceText(settings.initialBalanceCents) }))
  if (balance.cents !== settings.initialBalanceCents) {
    setBalance({ cents: settings.initialBalanceCents, text: balanceText(settings.initialBalanceCents) })
  }
  const [balanceSaveError, setBalanceSaveError] = useState<string | null>(null)

  const [importState, setImportState] = useState<ImportState>({ kind: 'idle' })
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Recomputed per render: two getItem calls, and every accepted action changes `data` anyway.
  const usageBytes = estimateStorageBytes()

  const updateCurrency = (event: ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'settings/update', patch: { currency: event.target.value } })
  }

  const updateTheme = (theme: Theme) => {
    dispatch({ type: 'settings/update', patch: { theme } })
  }

  const commitBalance = () => {
    const parsed = parseAmountField(balance.text, { allowZero: true, allowNegative: true })
    if (parsed.cents === undefined) return // AmountInput shows the §4.4 error inline
    if (parsed.cents === settings.initialBalanceCents) {
      setBalanceSaveError(null)
      return
    }
    const result = dispatch({ type: 'settings/update', patch: { initialBalanceCents: parsed.cents } })
    setBalanceSaveError(result.ok ? null : copy.validation.saveFailed)
  }

  const exportBackup = () => {
    downloadText(backupFilename(today), exportJson(data, Date.now()), JSON_MIME)
    showToast(copy.settings.toastExported)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow re-selecting the same file
    if (file === undefined) return
    if (file.size > MAX_IMPORT_BYTES) {
      setImportState({ kind: 'error', message: importErrorMessage('too-large') })
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setImportState({ kind: 'error', message: importErrorMessage('invalid-json') })
      return
    }
    const result = parseImport(text)
    if (result.kind === 'ok') setImportState({ kind: 'preview', data: result.data, preview: result.preview })
    else setImportState({ kind: 'error', message: importErrorMessage(result.error) })
  }

  const cancelImport = () => setImportState({ kind: 'idle' })

  const confirmImport = () => {
    if (importState.kind !== 'preview') return
    const result = dispatch({ type: 'data/replace', data: importState.data })
    setImportState(result.ok ? { kind: 'idle' } : { kind: 'error', message: copy.validation.saveFailed })
    if (result.ok) showToast(copy.settings.toastImported)
  }

  const deleteAll = () => {
    setConfirmingDelete(false)
    const result = dispatch({ type: 'data/reset', now: Date.now() })
    if (result.ok) showToast(copy.settings.toastDeleted)
  }

  const preview = importState.kind === 'preview' ? importState.preview : null

  return (
    <div className="screen screen--settings" data-screen={copy.nav.settings}>
      <section className="section settings-section" aria-labelledby="settings-general">
        <h3 id="settings-general" className="section__title">
          {copy.settings.general}
        </h3>
        <div className="stack">
          <div className="field">
            <label htmlFor={currencyId} className="field__label">
              {copy.settings.currency}
            </label>
            <select
              id={currencyId}
              className="field__input settings-select"
              value={currency}
              aria-describedby={currencyHelpId}
              onChange={updateCurrency}
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p id={currencyHelpId} className="field__help">
              {copy.settings.currencyHelp}
            </p>
          </div>

          <div className="field">
            <span className="field__label" aria-hidden="true">
              {copy.settings.theme}
            </span>
            <SegmentedControl
              legend={copy.settings.theme}
              name="settings-theme"
              options={THEME_OPTIONS}
              value={settings.theme}
              onChange={updateTheme}
            />
          </div>

          <div className="settings-balance">
            <AmountInput
              id="settings-initial-balance"
              label={copy.settings.initialBalance}
              value={balance.text}
              onChange={(text) => setBalance({ cents: balance.cents, text })}
              currency={currency}
              allowZero
              allowNegative
              onBlur={commitBalance}
              onSubmit={commitBalance}
              describedBy="settings-initial-balance-help"
            />
            <p id="settings-initial-balance-help" className="field__help settings-balance__help">
              {copy.settings.initialBalanceHelp}
            </p>
            {balanceSaveError !== null ? (
              <p role="alert" className="field__error">
                {balanceSaveError}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {!isDesktop ? (
        <section className="section settings-section" aria-labelledby="settings-organisation">
          <h3 id="settings-organisation" className="section__title">
            {copy.settings.organisation}
          </h3>
          <button type="button" className="btn btn--ghost settings-link" onClick={() => nav('categories')}>
            <span>{copy.settings.categories}</span>
            <span aria-hidden="true">›</span>
          </button>
        </section>
      ) : null}

      <section className="section settings-section" aria-labelledby="settings-backup">
        <h3 id="settings-backup" className="section__title">
          {copy.settings.backup}
        </h3>
        <div className="settings-actions">
          <button type="button" className="btn btn--primary" onClick={exportBackup}>
            {copy.settings.exportJson}
          </button>
          <label htmlFor={fileId} className="visually-hidden">
            {copy.settings.importJson}
          </label>
          <input
            id={fileId}
            ref={fileInputRef}
            className="visually-hidden settings-file"
            type="file"
            accept=".json,application/json"
            tabIndex={-1}
            onChange={handleFile}
          />
          <button type="button" className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
            {copy.settings.importJson}
          </button>
        </div>
        {importState.kind === 'error' ? (
          <p role="alert" className="field__error settings-import-error">
            {importState.message}
          </p>
        ) : null}
      </section>

      <section className="section settings-section settings-danger" aria-labelledby="settings-danger">
        <h3 id="settings-danger" className="section__title">
          {copy.settings.dangerZone}
        </h3>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
          {copy.settings.deleteAll}
        </button>
      </section>

      <footer className="settings-footer">
        <p>{copy.app.version}</p>
        <p>{copy.app.localOnly}</p>
        <p>{copy.app.usage(formatBytes(usageBytes))}</p>
      </footer>

      <Dialog
        open={preview !== null}
        title={copy.settings.importConfirm}
        onClose={cancelImport}
        variant="modal"
        footer={
          <>
            <button type="button" className="btn btn--ghost btn--block" onClick={cancelImport}>
              {copy.common.cancel}
            </button>
            <button type="button" className="btn btn--primary btn--block" onClick={confirmImport}>
              {copy.settings.importReplace}
            </button>
          </>
        }
      >
        {preview !== null ? (
          <div className="settings-import-preview">
            <p className="dialog__text">
              {copy.settings.importPreview(preview.transactions, preview.categories, preview.budgets)}
            </p>
            {preview.warnings.length > 0 ? (
              <p className="dialog__text settings-import-preview__warnings">
                {copy.settings.importWarnings(preview.warnings.length, preview.warnings.join('; '))}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmingDelete}
        title={copy.settings.deleteAll}
        text={copy.settings.deleteAllConfirmText}
        confirmLabel={copy.settings.deleteAllButton}
        destructive
        requireKeyword={copy.settings.deleteAllKeyword}
        onConfirm={deleteAll}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}
