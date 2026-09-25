// ============================================================================
// src/ui/views/TransactionSheet.tsx — «Nuevo movimiento» / «Editar movimiento»
// (§7.2, F1, F2). No props: reads `ui.sheet` (transaction/new with an optional
// presetType, transaction/edit with an id) and closes itself with closeSheet().
// Money parsing/formatting and validation come from src/domain only.
// ============================================================================
import { useEffect, useId, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ReducerError, TransactionInput } from '../../domain/actions'
import { addDays } from '../../domain/dates'
import { newId } from '../../domain/ids'
import { formatAmountInput } from '../../domain/money'
import type { AppData, Category, Id, LocalDate, Transaction, TransactionType } from '../../domain/types'
import { MAX_NOTE_LENGTH } from '../../domain/types'
import { validateTransactionForm } from '../../domain/validate'
import { AmountInput } from '../components/AmountInput'
import { CategoryPicker } from '../components/CategoryPicker'
import { Chip } from '../components/Chips'
import { Dialog } from '../components/Dialog'
import { SegmentedControl } from '../components/SegmentedControl'
import { copy } from '../copy'
import { useAppData, useDispatch } from '../state/useStore'
import { useToday, useUi, useUiActions } from '../state/useUi'
import './transactions.css'

const TYPE_OPTIONS = [
  { value: 'expense', label: copy.transactionSheet.expense },
  { value: 'income', label: copy.transactionSheet.income },
] as const satisfies readonly { value: TransactionType; label: string }[]

/** Categories of one type, ordered by sortOrder. */
function categoriesOfType(categories: readonly Category[], type: TransactionType): Category[] {
  return categories.filter((c) => c.type === type).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** F1 default: the last used category of the type if it still exists, else the first by sortOrder. */
function defaultCategoryId(data: AppData, type: TransactionType): Id | null {
  const ofType = categoriesOfType(data.categories, type)
  const lastUsed = data.settings.lastUsedCategoryId[type]
  if (lastUsed !== null && ofType.some((c) => c.id === lastUsed)) return lastUsed
  return ofType[0]?.id ?? null
}

/** Spanish inline message for a rejected dispatch (the form prevents most of them). */
function reducerErrorMessage(error: ReducerError): string {
  switch (error) {
    case 'invalid-amount':
      return copy.validation.amountEmptyOrZero
    case 'invalid-date':
      return copy.validation.dateInvalid
    case 'unknown-category':
    case 'category-type-mismatch':
      return copy.validation.categoryRequired
    case 'invalid-note':
      return copy.validation.noteTooLong
    default:
      return copy.validation.saveFailed
  }
}

type FormState = {
  type: TransactionType
  amountText: string
  date: LocalDate
  categoryId: Id | null
  note: string
}

function initialForm(data: AppData, today: LocalDate, existing: Transaction | null, presetType: TransactionType): FormState {
  if (existing !== null) {
    return {
      type: existing.type,
      amountText: formatAmountInput(existing.amountCents),
      date: existing.date,
      categoryId: existing.categoryId,
      note: existing.note,
    }
  }
  return { type: presetType, amountText: '', date: today, categoryId: defaultCategoryId(data, presetType), note: '' }
}

export function TransactionSheet() {
  const { sheet } = useUi()
  const data = useAppData()
  const editingId = sheet.kind === 'transaction/edit' ? sheet.id : null
  const presetType: TransactionType = sheet.kind === 'transaction/new' ? (sheet.presetType ?? 'expense') : 'expense'
  const existing = editingId === null ? null : (data.transactions.find((t) => t.id === editingId) ?? null)
  const { closeSheet } = useUiActions()

  // The edited transaction disappeared (removed elsewhere, data/reset): close without saving (§9).
  const missing = editingId !== null && existing === null
  useEffect(() => {
    if (missing) closeSheet()
  }, [missing, closeSheet])

  if (sheet.kind !== 'transaction/new' && sheet.kind !== 'transaction/edit') return null
  if (missing) return null
  return <TransactionForm key={editingId ?? 'new'} existing={existing} presetType={presetType} />
}

type TransactionFormProps = { existing: Transaction | null; presetType: TransactionType }

function TransactionForm({ existing, presetType }: TransactionFormProps) {
  const data = useAppData()
  const dispatch = useDispatch()
  const today = useToday()
  const { closeSheet, showToast } = useUiActions()
  const idPrefix = useId()
  const amountId = `${idPrefix}-amount`
  const dateId = `${idPrefix}-date`
  const noteId = `${idPrefix}-note`
  const dateErrorId = `${idPrefix}-date-error`
  const noteErrorId = `${idPrefix}-note-error`

  const [form, setForm] = useState<FormState>(() => initialForm(data, today, existing, presetType))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEdit = existing !== null
  const yesterday = addDays(today, -1)
  const categories = useMemo(() => categoriesOfType(data.categories, form.type), [data.categories, form.type])
  const validation = validateTransactionForm(form, data.categories)
  const errors = validation.ok ? {} : validation.errors

  // Focus «Importe» once the dialog is open (showModal would otherwise focus the first control, the «×»).
  useEffect(() => {
    document.getElementById(amountId)?.focus()
  }, [amountId])

  const patch = (changes: Partial<FormState>) => {
    setSubmitError(null)
    setForm((current) => ({ ...current, ...changes }))
  }

  const changeType = (type: TransactionType) => {
    if (type === form.type) return
    patch({ type, categoryId: defaultCategoryId(data, type) })
  }

  const submit = () => {
    if (!validation.ok) return
    const input: TransactionInput = validation.value
    const now = Date.now()
    const result =
      existing === null
        ? dispatch({ type: 'transaction/add', id: newId(), input, now })
        : dispatch({ type: 'transaction/update', id: existing.id, patch: input, now })
    if (!result.ok) {
      if (result.error === 'unknown-transaction') {
        closeSheet()
        return
      }
      setSubmitError(reducerErrorMessage(result.error))
      return
    }
    closeSheet()
    if (existing === null) {
      showToast(input.type === 'expense' ? copy.transactionSheet.toastExpenseSaved : copy.transactionSheet.toastIncomeSaved)
    } else {
      showToast(copy.transactionSheet.toastChangesSaved)
    }
  }

  const remove = () => {
    if (existing === null) return
    const result = dispatch({ type: 'transaction/remove', id: existing.id })
    closeSheet()
    if (result.ok) showToast(copy.transactionSheet.toastDeleted)
  }

  const handleNoteKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const footer = confirmingDelete ? (
    <div className="tx-sheet__confirm" role="group" aria-label={copy.transactionSheet.confirmDelete}>
      <p className="tx-sheet__confirm-text">{copy.transactionSheet.confirmDelete}</p>
      <div className="tx-sheet__confirm-actions">
        <button type="button" className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>
          {copy.common.cancel}
        </button>
        <button type="button" className="btn btn--primary btn--danger" onClick={remove}>
          {copy.transactionSheet.confirmDeleteYes}
        </button>
      </div>
    </div>
  ) : (
    <div className="tx-sheet__footer">
      {submitError !== null ? (
        <p className="tx-sheet__error" role="alert">
          {submitError}
        </p>
      ) : null}
      <button type="button" className="btn btn--primary btn--block" disabled={!validation.ok} onClick={submit}>
        {isEdit ? copy.transactionSheet.saveChanges : copy.transactionSheet.save}
      </button>
      {isEdit ? (
        <button type="button" className="btn btn--ghost btn--danger btn--block" onClick={() => setConfirmingDelete(true)}>
          {copy.transactionSheet.delete}
        </button>
      ) : null}
    </div>
  )

  return (
    <Dialog
      open
      title={isEdit ? copy.transactionSheet.editTitle : copy.transactionSheet.newTitle}
      onClose={closeSheet}
      footer={footer}
    >
      <div className="tx-sheet">
        <SegmentedControl
          legend={copy.transactionSheet.typeLegend}
          name={`${idPrefix}-type`}
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={changeType}
        />

        <AmountInput
          id={amountId}
          label={copy.transactionSheet.amount}
          value={form.amountText}
          onChange={(amountText) => patch({ amountText })}
          currency={data.settings.currency}
          autoFocus
          onSubmit={submit}
        />

        <div className="field">
          <label htmlFor={dateId} className="field__label">
            {copy.transactionSheet.date}
          </label>
          <div className="tx-sheet__date-chips">
            <Chip pressed={form.date === today} onClick={() => patch({ date: today })}>
              {copy.transactionSheet.today}
            </Chip>
            <Chip pressed={form.date === yesterday} onClick={() => patch({ date: yesterday })}>
              {copy.transactionSheet.yesterday}
            </Chip>
          </div>
          <input
            id={dateId}
            className="field__input"
            type="date"
            value={form.date}
            aria-invalid={errors.date !== undefined ? true : undefined}
            aria-describedby={errors.date !== undefined ? dateErrorId : undefined}
            onChange={(event) => patch({ date: event.target.value })}
          />
          {errors.date !== undefined ? (
            <p id={dateErrorId} className="field__error">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div className="tx-sheet__group">
          <span className="tx-sheet__group-label" aria-hidden="true">
            {copy.transactionSheet.category}
          </span>
          <CategoryPicker
            categories={categories}
            value={form.categoryId}
            onChange={(categoryId) => patch({ categoryId })}
            label={copy.transactionSheet.category}
          />
          {errors.category !== undefined ? <p className="field__error">{errors.category}</p> : null}
        </div>

        <div className="field">
          <label htmlFor={noteId} className="field__label">
            {copy.transactionSheet.note}
          </label>
          <input
            id={noteId}
            className="field__input"
            type="text"
            maxLength={MAX_NOTE_LENGTH}
            autoComplete="off"
            placeholder={copy.transactionSheet.notePlaceholder}
            value={form.note}
            aria-invalid={errors.note !== undefined ? true : undefined}
            aria-describedby={errors.note !== undefined ? noteErrorId : undefined}
            onChange={(event) => patch({ note: event.target.value })}
            onKeyDown={handleNoteKeyDown}
          />
          {errors.note !== undefined ? (
            <p id={noteErrorId} className="field__error">
              {errors.note}
            </p>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
