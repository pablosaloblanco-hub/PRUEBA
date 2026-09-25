// src/domain/actions.ts
import type { AppData, Budget, Cents, ColorKey, Id, LocalDate, Settings, Timestamp, TransactionType } from './types'

export type TransactionInput = {
  type: TransactionType
  amountCents: Cents
  date: LocalDate
  categoryId: Id
  note: string
}

export type Action =
  | { type: 'transaction/add'; id: Id; input: TransactionInput; now: Timestamp }
  | { type: 'transaction/update'; id: Id; patch: Partial<TransactionInput>; now: Timestamp }
  | { type: 'transaction/remove'; id: Id }
  /** El reducer asigna sortOrder (max del tipo + 1) y builtIn = false; el cliente solo aporta id e input. */
  | { type: 'category/add'; id: Id; input: { name: string; type: TransactionType; icon: string; color: ColorKey } }
  | { type: 'category/update'; id: Id; patch: Partial<{ name: string; icon: string; color: ColorKey }> }
  // P1-17 (reordenar): `{ type: 'category/move'; id: Id; direction: 'up' | 'down' }`. La firma queda cerrada aquí
  // pero NO forma parte de la unión en P0 (el switch exhaustivo del reducer no la contempla).
  /** Reasigna sus movimientos a la builtIn del mismo tipo y borra su presupuesto. Rechazado si builtIn. */
  | { type: 'category/remove'; id: Id; now: Timestamp }
  | { type: 'budget/upsert'; budget: Budget }
  | { type: 'budget/remove'; id: Id }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'data/replace'; data: AppData }   // import / restaurar copia (ya validado)
  | { type: 'data/reset'; now: Timestamp }    // «Borrar todos los datos» → estado sembrado

export type ReducerError =
  | 'unknown-transaction' | 'unknown-category' | 'category-type-mismatch' | 'builtin-category'
  | 'duplicate-id' | 'duplicate-category-name' | 'invalid-amount' | 'invalid-date' | 'invalid-note'
  | 'invalid-category-name' | 'invalid-icon' | 'invalid-color'
  | 'duplicate-budget' | 'invalid-budget' | 'budget-on-income-category'
  | 'invalid-settings'
