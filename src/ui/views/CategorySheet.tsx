// ============================================================================
// src/ui/views/CategorySheet.tsx — «Nueva categoría» / «Editar categoría»
// (§2.1 F4, §7.6): Nombre (1–30, unique per type), Icono (EMOJI_CHOICES grid of
// aria-pressed buttons), Color (9 swatches), Tipo (disabled in edit) and
// Eliminar with the reassignment confirmation (hidden for builtIn).
// ============================================================================
import { useEffect, useId, useMemo, useState } from 'react'
import { newId } from '../../domain/ids'
import { categoriesById, countTransactionsByCategory } from '../../domain/queries'
import { EMOJI_CHOICES } from '../../domain/seed'
import type { Category, ColorKey, TransactionType } from '../../domain/types'
import { ColorKey as COLOR_KEYS } from '../../domain/types'
import { validateCategoryName, wellKnownIdOf } from '../../domain/validate'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Dialog } from '../components/Dialog'
import { SegmentedControl } from '../components/SegmentedControl'
import { copy } from '../copy'
import { useAppData, useDispatch } from '../state/useStore'
import { useUi, useUiActions } from '../state/useUi'
import './categories.css'

const TYPE_OPTIONS = [
  { value: 'expense', label: copy.transactionSheet.expense },
  { value: 'income', label: copy.transactionSheet.income },
] as const

const COLOR_ORDER: readonly ColorKey[] = Object.values(COLOR_KEYS)
const DEFAULT_ICON = '📦'

export function CategorySheet() {
  const { sheet } = useUi()
  const data = useAppData()
  const { closeSheet } = useUiActions()
  const editing = sheet.kind === 'category/edit' ? (data.categories.find((c) => c.id === sheet.id) ?? null) : null
  const presetType: TransactionType = sheet.kind === 'category/new' ? sheet.type : 'expense'

  // The edited category disappeared (removed elsewhere, data/reset): close without saving (§9).
  const missing = sheet.kind === 'category/edit' && editing === null
  useEffect(() => {
    if (missing) closeSheet()
  }, [missing, closeSheet])

  if (missing) return null
  return <CategoryForm key={editing?.id ?? 'new'} editing={editing} presetType={presetType} />
}

type CategoryFormProps = {
  editing: Category | null
  presetType: TransactionType
}

function CategoryForm({ editing, presetType }: CategoryFormProps) {
  const data = useAppData()
  const dispatch = useDispatch()
  const { closeSheet, showToast } = useUiActions()
  const nameId = useId()
  const nameErrorId = useId()
  const iconLabelId = useId()
  const colorLabelId = useId()

  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState<string>(editing?.icon ?? DEFAULT_ICON)
  const [color, setColor] = useState<ColorKey>(editing?.color ?? 'blue')
  const [type, setType] = useState<TransactionType>(editing?.type ?? presetType)
  const [nameError, setNameError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const transactionCount = useMemo(
    () => (editing === null ? 0 : (countTransactionsByCategory(data.transactions).get(editing.id) ?? 0)),
    [data, editing],
  )
  const othersName = useMemo(() => {
    if (editing === null) return ''
    return categoriesById(data.categories).get(wellKnownIdOf(editing.type))?.name ?? ''
  }, [data, editing])

  const submit = () => {
    const checked = validateCategoryName(name, type, data.categories, editing?.id)
    if (!checked.ok) {
      setNameError(checked.message)
      return
    }
    const result =
      editing === null
        ? dispatch({ type: 'category/add', id: newId(), input: { name: checked.value, type, icon, color } })
        : dispatch({ type: 'category/update', id: editing.id, patch: { name: checked.value, icon, color } })
    if (!result.ok) {
      setNameError(result.error === 'duplicate-category-name' ? copy.categories.nameDuplicate : copy.categories.nameRequired)
      return
    }
    showToast(copy.categories.toastSaved)
    closeSheet()
  }

  const confirmDelete = () => {
    if (editing === null) return
    setConfirming(false)
    const result = dispatch({ type: 'category/remove', id: editing.id, now: Date.now() })
    if (!result.ok) return
    showToast(copy.categories.toastDeleted)
    closeSheet()
  }

  const footer = (
    <div className="category-sheet__footer">
      <button type="button" className="btn btn--primary btn--block" onClick={submit}>
        {copy.categories.save}
      </button>
      {editing !== null && !editing.builtIn ? (
        <button
          type="button"
          className="btn btn--ghost btn--block category-sheet__delete"
          onClick={() => setConfirming(true)}
        >
          {copy.categories.delete}
        </button>
      ) : null}
      {editing !== null && editing.builtIn ? (
        <p className="category-sheet__cannot-delete">{copy.categories.cannotDelete}</p>
      ) : null}
    </div>
  )

  return (
    <Dialog
      open
      title={editing !== null ? copy.categories.sheetEditTitle : copy.categories.sheetNewTitle}
      onClose={closeSheet}
      footer={footer}
    >
      <div className="category-sheet">
        <div className="field">
          <label htmlFor={nameId} className="field__label">
            {copy.categories.name}
          </label>
          <input
            id={nameId}
            className="field__input"
            type="text"
            autoComplete="off"
            data-autofocus=""
            value={name}
            aria-invalid={nameError !== null ? true : undefined}
            aria-describedby={nameError !== null ? nameErrorId : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setNameError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submit()
              }
            }}
          />
          {nameError !== null ? (
            <p id={nameErrorId} className="field__error">
              {nameError}
            </p>
          ) : null}
        </div>

        <div>
          <span id={iconLabelId} className="category-sheet__group-label">
            {copy.categories.icon}
          </span>
          <div role="group" aria-labelledby={iconLabelId} className="emoji-grid">
            {EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-tile"
                aria-pressed={emoji === icon}
                onClick={() => setIcon(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span id={colorLabelId} className="category-sheet__group-label">
            {copy.categories.color}
          </span>
          <div role="group" aria-labelledby={colorLabelId} className="swatch-grid">
            {COLOR_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                className="swatch"
                data-color={key}
                aria-label={copy.categories.colorNames[key]}
                aria-pressed={key === color}
                onClick={() => setColor(key)}
              />
            ))}
          </div>
        </div>

        <SegmentedControl
          legend={copy.categories.type}
          name="category-sheet-type"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          disabled={editing !== null}
        />
      </div>

      {editing !== null ? (
        <ConfirmDialog
          open={confirming}
          title={copy.categories.confirmDelete(editing.name)}
          text={transactionCount > 0 ? copy.categories.confirmDeleteWithTransactions(transactionCount, othersName) : undefined}
          confirmLabel={copy.categories.delete}
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </Dialog>
  )
}
