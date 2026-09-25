// ============================================================================
// src/ui/views/SettingsView.test.tsx — §10.2 «SettingsView»: currency
// reformat, theme → data-theme, initial balance committed on blur (negative
// allowed) / invalid not dispatched, import (valid, invalid JSON, newer
// version, not an envelope, > 10 MB, with warnings), export through the
// download stubs, «Borrar todos los datos» guarded by BORRAR, footer.
// ============================================================================
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportJson } from '../../domain/storage/jsonio'
import { SCHEMA_VERSION } from '../../domain/storage/schema'
import { fixtureData } from '../../test/fixtures'
import { FIXTURE_NOW, renderApp } from '../../test/renderApp'
import { MAX_IMPORT_BYTES } from './SettingsView'

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')
const open = (options: Parameters<typeof renderApp>[0] = {}) => renderApp({ ...options, ui: { ...options.ui, screen: 'settings' } })
const balanceInput = () => screen.getByLabelText('Saldo inicial')
const fileInput = () => screen.getByLabelText('Importar copia') as HTMLInputElement
const jsonFile = (text: string, name = 'copia.json') => new File([text], name, { type: 'application/json' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SettingsView — General', () => {
  it('renders the sections, the currency select with help and the footer', () => {
    open()
    expect(screen.getByRole('heading', { level: 3, name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Organización' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Copia de seguridad' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Zona peligrosa' })).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: 'Moneda' })
    expect(select).toHaveValue('EUR')
    expect(select).toHaveAccessibleDescription('Solo cambia el formato; los importes no se convierten')
    expect(screen.getAllByRole('option')).toHaveLength(10)
    expect(screen.getByText('Mis Finanzas v1')).toBeInTheDocument()
    expect(screen.getByText('Tus datos se guardan solo en este navegador')).toBeInTheDocument()
    expect(screen.getByText(/^Uso: .* de ~5 MB$/)).toBeInTheDocument()
  })

  it('changing the currency to USD reformats amounts without touching the cents', async () => {
    const { user, store } = open()
    expect(norm(screen.getByText(/^= /).textContent)).toBe('= 100,00 €')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Moneda' }), 'USD')
    expect(store.getSnapshot().settings.currency).toBe('USD')
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(10000)
    expect(norm(screen.getByText(/^= /).textContent)).toBe('= 100,00 US$')
    expect(store.getSnapshot().transactions).toEqual(fixtureData().transactions)
  })

  it('the theme segment sets data-theme on <html> and dispatches settings/update', async () => {
    const { user, store } = open()
    const group = screen.getByRole('group', { name: 'Tema' })
    expect(within(group).getByRole('radio', { name: 'Sistema' })).toBeChecked()
    await user.click(within(group).getByRole('radio', { name: 'Oscuro' }))
    expect(document.documentElement.dataset['theme']).toBe('dark')
    expect(store.getSnapshot().settings.theme).toBe('dark')
    await user.click(within(group).getByRole('radio', { name: 'Claro' }))
    expect(document.documentElement.dataset['theme']).toBe('light')
    await user.click(within(group).getByRole('radio', { name: 'Sistema' }))
    expect(document.documentElement.dataset['theme']).toBeUndefined()
  })

  it('saves a negative initial balance on blur and re-syncs the text from the snapshot', async () => {
    const { user, store } = open()
    expect(balanceInput()).toHaveValue('100,00')
    expect(balanceInput()).toHaveAccessibleDescription(/Saldo con el que empiezas a contar/)
    await user.clear(balanceInput())
    await user.type(balanceInput(), '-250,5')
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(10000) // nothing per keystroke
    await user.tab()
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(-25050)
    expect(balanceInput()).toHaveValue('-250,50')
  })

  it('saves the initial balance on Enter and accepts 0', async () => {
    const { user, store } = open()
    await user.clear(balanceInput())
    await user.type(balanceInput(), '0{Enter}')
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(0)
    expect(balanceInput()).toHaveValue('0,00')
  })

  it('does not dispatch an invalid initial balance and shows the inline error', async () => {
    const { user, store } = open()
    await user.clear(balanceInput())
    await user.type(balanceInput(), '12,345')
    await user.tab()
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(10000)
    expect(screen.getByText('Máximo dos decimales')).toBeInTheDocument()
    expect(balanceInput()).toHaveAttribute('aria-invalid', 'true')
    expect(balanceInput()).toHaveValue('12,345')
  })

  it('«Categorías» navigates to the categories screen (mobile)', async () => {
    const { user } = open()
    await user.click(screen.getByRole('button', { name: 'Categorías' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías' })).toBeInTheDocument()
  })
})

describe('SettingsView — export', () => {
  it('«Exportar copia (JSON)» downloads mis-finanzas-2026-09-25.json and shows the toast', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const { user } = open()
    await user.click(screen.getByRole('button', { name: 'Exportar copia (JSON)' }))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]![0] as Blob
    expect(blob.type).toContain('application/json')
    expect(click).toHaveBeenCalledTimes(1)
    const anchor = click.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe('mis-finanzas-2026-09-25.json')
    expect(screen.getByText('Copia exportada')).toBeInTheDocument()
  })
})

describe('SettingsView — import', () => {
  it('a valid backup shows the preview and «Reemplazar» replaces the data', async () => {
    const data = fixtureData()
    data.transactions = data.transactions.slice(0, 3)
    data.budgets = []
    data.settings.currency = 'GBP'
    const { user, store } = open()
    await user.upload(fileInput(), jsonFile(exportJson(data, FIXTURE_NOW)))
    const dialog = await screen.findByRole('dialog', { name: '¿Reemplazar los datos actuales?' })
    expect(within(dialog).getByText('Se importarán 3 movimientos, 15 categorías y 0 presupuestos')).toBeInTheDocument()
    expect(within(dialog).queryByText(/Se han ajustado/)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Reemplazar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot()).toEqual(data)
    expect(screen.getByText('Datos importados correctamente')).toBeInTheDocument()
  })

  it('«Cancelar» keeps the current data', async () => {
    const data = fixtureData()
    data.transactions = []
    const { user, store } = open()
    const before = store.getSnapshot()
    await user.upload(fileInput(), jsonFile(exportJson(data, FIXTURE_NOW)))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot()).toBe(before)
  })

  it('invalid JSON → «El archivo no es un JSON válido»', async () => {
    const { user } = open()
    await user.upload(fileInput(), jsonFile('{"app": "mis-finanzas", '))
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo no es un JSON válido')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a newer schema version → «El archivo es de una versión más nueva de la app»', async () => {
    const { user } = open()
    const envelope = JSON.parse(exportJson(fixtureData(), FIXTURE_NOW)) as { schemaVersion: number }
    envelope.schemaVersion = SCHEMA_VERSION + 1
    await user.upload(fileInput(), jsonFile(JSON.stringify(envelope)))
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo es de una versión más nueva de la app')
  })

  it('a JSON that is not an envelope → «El archivo no es una copia válida de Mis Finanzas»', async () => {
    const { user } = open()
    await user.upload(fileInput(), jsonFile(JSON.stringify({ hello: 'world' })))
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo no es una copia válida de Mis Finanzas')
  })

  it('an envelope with invalid data → «El archivo no es una copia válida de Mis Finanzas»', async () => {
    const { user } = open()
    const envelope = JSON.parse(exportJson(fixtureData(), FIXTURE_NOW)) as { data: { transactions: unknown } }
    envelope.data.transactions = 'nope'
    await user.upload(fileInput(), jsonFile(JSON.stringify(envelope)))
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo no es una copia válida de Mis Finanzas')
  })

  it('a file over 10 MB is rejected before reading it', async () => {
    const { user } = open()
    const file = jsonFile(exportJson(fixtureData(), FIXTURE_NOW))
    Object.defineProperty(file, 'size', { value: MAX_IMPORT_BYTES + 1 })
    const text = vi.spyOn(file, 'text')
    await user.upload(fileInput(), file)
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo es demasiado grande')
    expect(text).not.toHaveBeenCalled()
  })

  it('shows the normalisation warnings under the preview', async () => {
    const { user } = open()
    const envelope = JSON.parse(exportJson(fixtureData(), FIXTURE_NOW)) as {
      data: { categories: { icon: string; color: string }[] }
    }
    envelope.data.categories[0]!.icon = 'not-an-emoji'
    envelope.data.categories[1]!.color = 'magenta'
    await user.upload(fileInput(), jsonFile(JSON.stringify(envelope)))
    const dialog = await screen.findByRole('dialog', { name: '¿Reemplazar los datos actuales?' })
    expect(within(dialog).getByText('Se importarán 12 movimientos, 15 categorías y 2 presupuestos')).toBeInTheDocument()
    expect(within(dialog).getByText(/^Se han ajustado 2 elementos: /)).toBeInTheDocument()
  })

  it('the file input only accepts JSON', () => {
    open()
    expect(fileInput()).toHaveAttribute('accept', '.json,application/json')
    expect(fileInput().type).toBe('file')
    expect(screen.getByRole('button', { name: 'Importar copia' })).toBeInTheDocument()
  })
})

describe('SettingsView — danger zone', () => {
  it('«Borrar todos los datos» needs BORRAR, then resets to the seeded state with a toast', async () => {
    const { user, store } = open()
    await user.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    const dialog = screen.getByRole('dialog', { name: 'Borrar todos los datos' })
    expect(within(dialog).getByText('Esta acción no se puede deshacer. Escribe BORRAR para confirmar')).toBeInTheDocument()
    const confirm = within(dialog).getByRole('button', { name: 'Borrar' })
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Escribe BORRAR'), 'BORRA')
    expect(confirm).toBeDisabled()
    await user.type(within(dialog).getByLabelText('Escribe BORRAR'), 'R')
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().transactions).toHaveLength(0)
    expect(store.getSnapshot().budgets).toHaveLength(0)
    expect(store.getSnapshot().settings.initialBalanceCents).toBe(0)
    expect(balanceInput()).toHaveValue('0,00')
    expect(screen.getByText('Datos borrados')).toBeInTheDocument()
  })

  it('«Cancelar» closes the dialog without deleting', async () => {
    const { user, store } = open()
    await user.click(screen.getByRole('button', { name: 'Borrar todos los datos' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(store.getSnapshot().transactions).toHaveLength(12)
  })
})
