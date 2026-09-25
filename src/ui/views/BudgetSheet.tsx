// ============================================================================
// src/ui/views/BudgetSheet.tsx — «Nuevo presupuesto» / «Editar presupuesto»
// (§2.1 F5, §7.4): category select («Total mensual» only while no total
// exists, expense categories without a budget; disabled in edit), «Límite
// mensual» with the §4.4 messages and the duplicate error from the reducer.
// ============================================================================
import { useEffect, useId, useMemo, useState } from 'react'
import { newId } from '../../domain/ids'
import { formatAmountInput } from '../../domain/money'
import { categoriesOfType } from '../../domain/queries'
import type { Budget, Id } from '../../domain/types'
import { validateBudgetInput } from '../../domain/validate'
import type { BudgetFormErrors } from '../../domain/validate'
import { AmountInput } from '../components/AmountInput'
import { parseAmountField } from '../components/amountField'
import { Dialog } from '../components/Dialog'
import { copy } from '../copy'
import { useAppData, useDispatch } from '../state/useStore'
import { useUi, useUiActions } from '../state/useUi'
import './budgets.css'

/** Sentinel value of the «Total mensual» option (a budget with `categoryId: null`). */
const TOTAL_VALUE = '__total__'

type CategoryOption = { value: string; label: string }

function toValue(categoryId: Id | null): string {
  return categoryId === null ? TOTAL_VALUE : categoryId
}

function fromValue(value: string): Id | null {
  return value === TOTAL_VALUE ? null : value
}

export function BudgetSheet() {
  const { sheet } = useUi()
  const data = useAppData()
  const { closeSheet } = useUiActions()
  const editing = sheet.kind === 'budget/edit' ? (data.budgets.find((b) => b.id === sheet.id) ?? null) : null
  const preset = sheet.kind === 'budget/new' ? sheet.presetCategoryId : undefined

  // The edited budget disappeared (removed elsewhere, data/reset): close without saving (§9).
  const missing = sheet.kind === 'budget/edit' && editing === null
  useEffect(() => {
    if (missing) closeSheet()
  }, [missing, closeSheet])

  if (missing) return null
  return <BudgetForm key={editing?.id ?? 'new'} editing={editing} preset={preset} />
}

type BudgetFormProps = {
  editing: Budget | null
  preset: Id | null | undefined
}

function BudgetForm({ editing, preset }: BudgetFormProps) {
  const data = useAppData()
  const dispatch = useDispatch()
  const { closeSheet, showToast } = useUiActions()
  const selectId = useId()
  const helpId = useId()
  const errorId = useId()

  const [categoryValue, setCategoryValue] = useState<string>(() => {
    if (editing !== null) return toValue(editing.categoryId)
    if (preset !== undefined) return toValue(preset)
    return ''
  })
  const [limitText, setLimitText] = useState(() => (editing !== null ? formatAmountInput(editing.limitCents) : ''))
  const [errors, setErrors] = useState<BudgetFormErrors>({})

  const options = useMemo<CategoryOption[]>(() => {
    if (editing !== null) {
      const own = data.categories.find((c) => c.id === editing.categoryId)
      return [{ value: toValue(editing.categoryId), label: own?.name ?? copy.budgets.totalOption }]
    }
    const taken = new Set(data.budgets.map((b) => b.categoryId))
    const list: CategoryOption[] = []
    if (!taken.has(null)) list.push({ value: TOTAL_VALUE, label: copy.budgets.totalOption })
    for (const c of categoriesOfType(data.categories, 'expense')) {
      if (!taken.has(c.id)) list.push({ value: c.id, label: c.name })
    }
    // Keep the current choice visible even when another budget took it meanwhile: saving then reports the duplicate.
    if (categoryValue !== '' && !list.some((o) => o.value === categoryValue)) {
      const current = data.categories.find((c) => c.id === categoryValue)
      list.push({ value: categoryValue, label: current?.name ?? copy.budgets.totalOption })
    }
    return list
  }, [data, editing, categoryValue])

  const selectedValue = categoryValue !== '' ? categoryValue : (options[0]?.value ?? '')
  const limitCheck = parseAmountField(limitText)
  const canSave = selectedValue !== '' && limitCheck.error === undefined

  const submit = () => {
    if (selectedValue === '') return
    const checked = validateBudgetInput(
      { categoryId: fromValue(selectedValue), limitText },
      { categories: data.categories, budgets: data.budgets },
      editing?.id,
    )
    if (!checked.ok) {
      setErrors(checked.errors)
      return
    }
    const budget: Budget = {
      id: editing?.id ?? newId(),
      categoryId: checked.value.categoryId,
      limitCents: checked.value.limitCents,
    }
    const result = dispatch({ type: 'budget/upsert', budget })
    if (!result.ok) {
      setErrors(
        result.error === 'duplicate-budget'
          ? { category: copy.budgets.duplicate }
          : result.error === 'invalid-budget'
            ? { limit: copy.validation.amountEmptyOrZero }
            : { category: copy.validation.categoryRequired },
      )
      return
    }
    showToast(copy.budgets.toastSaved)
    closeSheet()
  }

  const footer = (
    <button type="button" className="btn btn--primary btn--block" disabled={!canSave} onClick={submit}>
      {copy.common.save}
    </button>
  )

  return (
    <Dialog
      open
      title={editing !== null ? copy.budgets.sheetEditTitle : copy.budgets.sheetNewTitle}
      onClose={closeSheet}
      footer={footer}
    >
      <div className="budget-sheet">
        <div className="field">
          <label htmlFor={selectId} className="field__label">
            {copy.budgets.category}
          </label>
          <select
            id={selectId}
            className="field__input budget-sheet__select"
            value={selectedValue}
            disabled={editing !== null}
            data-autofocus={editing === null && preset === undefined ? '' : undefined}
            aria-invalid={errors.category !== undefined ? true : undefined}
            aria-describedby={errors.category !== undefined ? errorId : undefined}
            onChange={(event) => {
              setCategoryValue(event.target.value)
              setErrors((prev) => ({ ...prev, category: undefined }))
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.category !== undefined ? (
            <p id={errorId} className="field__error">
              {errors.category}
            </p>
          ) : null}
        </div>

        <div>
          <AmountInput
            id="budget-limit"
            label={copy.budgets.limit}
            value={limitText}
            onChange={(raw) => {
              setLimitText(raw)
              setErrors((prev) => ({ ...prev, limit: undefined }))
            }}
            currency={data.settings.currency}
            autoFocus={editing !== null || preset !== undefined}
            describedBy={helpId}
            onSubmit={submit}
          />
          {errors.limit !== undefined && limitCheck.error === undefined ? <p className="field__error">{errors.limit}</p> : null}
          <p id={helpId} className="field__help">
            {copy.budgets.limitHelp}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
