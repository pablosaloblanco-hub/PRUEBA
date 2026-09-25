// ============================================================================
// src/ui/views/RecoveryView.test.tsx — §10.2 «RecoveryView / Banners»: corrupt
// with and without backup, unreadable backup, newer, quota and unavailable.
// ============================================================================
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { serializeEnvelope } from '../../domain/storage/jsonio'
import { createMemoryRepository } from '../../domain/storage/memoryRepository'
import type { MemoryRepository } from '../../domain/storage/memoryRepository'
import { BACKUP_STORAGE_KEY, STORAGE_KEY } from '../../domain/storage/schema'
import { createStore } from '../../domain/storage/store'
import { fixtureData } from '../../test/fixtures'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'

const GOOD = serializeEnvelope(fixtureData(), FIXTURE_NOW)
const BAD = '{bad'
const NEWER = JSON.stringify({ app: 'mis-finanzas', schemaVersion: 99, savedAt: FIXTURE_NOW, data: {} })

/** A memory repository whose raw keys are set directly (entries is the live backing map). */
function rawRepo(entries: Record<string, string>): MemoryRepository {
  const repo = createMemoryRepository()
  const map = repo.entries as Map<string, string>
  for (const [key, value] of Object.entries(entries)) map.set(key, value)
  return repo
}

const card = () => screen.getByRole('region', { name: 'No se han podido leer tus datos guardados.' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecoveryView (corrupt)', () => {
  it('replaces the content, offers restore/download/reset when a backup exists, and restore keeps the backup intact', async () => {
    const repo = rawRepo({ [STORAGE_KEY]: BAD, [BACKUP_STORAGE_KEY]: GOOD })
    const { user, store } = renderApp({ repo })
    expect(store.getPersistence().mode).toBe('readonly')
    const region = card()
    expect(within(region).getByRole('button', { name: 'Restaurar copia automática' })).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Descargar datos en bruto' })).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Empezar de cero' })).toBeInTheDocument()
    expect(document.querySelector('.screen--home')).toBeNull()

    await user.click(within(region).getByRole('button', { name: 'Restaurar copia automática' }))
    expect(screen.queryByRole('region', { name: 'No se han podido leer tus datos guardados.' })).not.toBeInTheDocument()
    expect(document.querySelector('.screen--home')).not.toBeNull()
    expect(store.getPersistence().mode).toBe('normal')
    expect(store.getSnapshot().transactions).toHaveLength(12)
    expect(repo.entries.get(BACKUP_STORAGE_KEY)).toBe(GOOD)
    expect(repo.entries.get(STORAGE_KEY)).not.toBe(BAD)
  })

  it('hides «Restaurar copia automática» when there is no backup', () => {
    renderApp({ repo: rawRepo({ [STORAGE_KEY]: BAD }) })
    const region = card()
    expect(within(region).queryByRole('button', { name: 'Restaurar copia automática' })).not.toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Descargar datos en bruto' })).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Empezar de cero' })).toBeInTheDocument()
  })

  it('reports an unreadable backup and hides the restore button; the corrupt payload is untouched', async () => {
    const repo = rawRepo({ [STORAGE_KEY]: BAD, [BACKUP_STORAGE_KEY]: '{also bad' })
    const { user, store } = renderApp({ repo })
    await user.click(screen.getByRole('button', { name: 'Restaurar copia automática' }))
    expect(screen.getByText('La copia automática tampoco se puede leer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Restaurar copia automática' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descargar datos en bruto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar de cero' })).toBeInTheDocument()
    expect(store.getPersistence().mode).toBe('readonly')
    expect(repo.entries.get(STORAGE_KEY)).toBe(BAD)
  })

  it('«Descargar datos en bruto» downloads the raw payload as text', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const { user } = renderApp({ repo: rawRepo({ [STORAGE_KEY]: BAD }) })
    await user.click(screen.getByRole('button', { name: 'Descargar datos en bruto' }))
    expect(createUrl).toHaveBeenCalledTimes(1)
    const blob = createUrl.mock.calls[0]?.[0] as Blob
    expect(blob.type).toContain('text/plain')
    expect(await blob.text()).toBe(BAD)
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('«Empezar de cero» requires typing BORRAR, then reseeds without touching the backup', async () => {
    const repo = rawRepo({ [STORAGE_KEY]: BAD, [BACKUP_STORAGE_KEY]: GOOD })
    const { user, store } = renderApp({ repo })
    await user.click(screen.getByRole('button', { name: 'Empezar de cero' }))
    const dialog = screen.getByRole('dialog', { name: 'Empezar de cero' })
    expect(within(dialog).getByText('Esta acción no se puede deshacer. Escribe BORRAR para confirmar')).toBeInTheDocument()
    const input = within(dialog).getByLabelText('Escribe BORRAR')
    const confirm = within(dialog).getByRole('button', { name: 'Borrar' })
    expect(confirm).toBeDisabled()
    await user.type(input, 'borrar')
    expect(confirm).toBeDisabled()
    await user.clear(input)
    await user.type(input, 'BORRAR')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(screen.queryByRole('region', { name: 'No se han podido leer tus datos guardados.' })).not.toBeInTheDocument()
    expect(store.getPersistence().mode).toBe('normal')
    expect(store.getSnapshot().transactions).toHaveLength(0)
    expect(repo.entries.get(BACKUP_STORAGE_KEY)).toBe(GOOD)
    expect(repo.entries.get(STORAGE_KEY)).not.toBe(BAD)
  })

  it('«Cancelar» hides the confirmation and keeps the card', async () => {
    const { user } = renderApp({ repo: rawRepo({ [STORAGE_KEY]: BAD }) })
    await user.click(screen.getByRole('button', { name: 'Empezar de cero' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar de cero' })).toBeInTheDocument()
  })

  it('disables the add-transaction entry points and never opens a sheet while the card is shown (§5.5)', async () => {
    const repo = rawRepo({ [STORAGE_KEY]: BAD })
    const { user, store } = renderApp({ repo, ui: { sheet: { kind: 'transaction/new' } } })
    expect(card()).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const fab = screen.getByRole('button', { name: 'Añadir movimiento' })
    expect(fab).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Mes anterior' })).not.toBeInTheDocument()
    await user.click(fab)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getPersistence().mode).toBe('readonly')
    expect(repo.entries.get(STORAGE_KEY)).toBe(BAD)
  })
})

describe('RecoveryView (newer)', () => {
  it('shows the newer-version card with only the raw download; the store stays readonly and never saves', () => {
    const repo = rawRepo({ [STORAGE_KEY]: NEWER })
    const { store } = renderApp({ repo })
    const region = screen.getByRole('region', {
      name: 'Estos datos son de una versión más reciente de Mis Finanzas. Actualiza la app o descarga los datos.',
    })
    expect(within(region).getByRole('button', { name: 'Descargar datos en bruto' })).toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Empezar de cero' })).not.toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Restaurar copia automática' })).not.toBeInTheDocument()
    expect(store.getPersistence().mode).toBe('readonly')
    expect(repo.entries.get(STORAGE_KEY)).toBe(NEWER)
  })
})

describe('Persistence banners', () => {
  it('quota: shows the banner with «Exportar copia», which downloads the JSON export', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL')
    const base = createMemoryRepository(GOOD)
    const repo = { ...base, probeWrite: () => ({ kind: 'quota', bytesAttempted: 0 }) as const }
    const store = createStore(repo, { now: () => FIXTURE_NOW, today: () => '2026-09-25' })
    const { user } = renderApp({ store })
    expect(store.getPersistence().error?.kind).toBe('quota')
    expect(
      screen.getByText('No se ha podido guardar: el almacenamiento está lleno. Exporta una copia y elimina movimientos antiguos.'),
    ).toBeInTheDocument()
    expect(document.querySelector('.screen--home')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Exportar copia' }))
    expect(createUrl).toHaveBeenCalledTimes(1)
    const blob = createUrl.mock.calls[0]?.[0] as Blob
    expect(blob.type).toContain('application/json')
    const parsed = JSON.parse(await blob.text()) as { app: string; data: { transactions: unknown[] } }
    expect(parsed.app).toBe('mis-finanzas')
    expect(parsed.data.transactions).toHaveLength(12)
  })

  it('unavailable: shows the persistent banner while the app keeps working in memory', () => {
    const store = createStore(
      createMemoryRepository(),
      { now: () => FIXTURE_NOW, today: () => '2026-09-25' },
      { loadOverride: { kind: 'unavailable', error: 'SecurityError' } },
    )
    renderApp({ store })
    expect(
      screen.getByText('No se puede guardar en este navegador. Los datos se perderán al cerrar esta pestaña.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exportar copia' })).not.toBeInTheDocument()
    expect(document.querySelector('.screen--home')).not.toBeNull()
    expect(store.getPersistence().mode).toBe('normal')
  })
})
