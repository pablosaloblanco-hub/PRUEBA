// ============================================================================
// src/ui/components/Shell.test.tsx — §10.2 «Shell»: tab bar vs sidebar (mocked
// useMediaQuery), the FAB opens the transaction sheet, «Volver» from Ajustes
// and Categorías, no aria-current on Ajustes/Categorías, month selector,
// toast timer and theme attribute.
// ============================================================================
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixtureData } from '../../test/fixtures'
import { renderApp } from '../../test/renderApp'
import { UiProvider } from '../state/UiContext'
import { useUiActions } from '../state/useUi'
import { ToastRegion } from './ToastRegion'

const media = vi.hoisted(() => ({ desktop: false }))

vi.mock('../hooks/useMediaQuery', () => ({
  DESKTOP_QUERY: '(min-width: 900px)',
  useMediaQuery: () => media.desktop,
  useIsDesktop: () => media.desktop,
}))

const mainNav = () => screen.getByRole('navigation', { name: 'Navegación principal' })
const currentSlots = () => mainNav().querySelectorAll('[aria-current="page"]')

describe('Shell (mobile)', () => {
  beforeEach(() => {
    media.desktop = false
  })

  it('renders the visually-hidden <h1>, the screen <h2>, the tab bar and no sidebar', () => {
    renderApp()
    const h1 = screen.getByRole('heading', { level: 1, name: 'Mis Finanzas' })
    expect(h1).toHaveClass('visually-hidden')
    expect(screen.getByRole('heading', { level: 2, name: 'Inicio' })).toBeInTheDocument()
    const nav = mainNav()
    expect(nav).toHaveClass('tabbar')
    expect(within(nav).getByRole('button', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('button', { name: 'Movimientos' })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('button', { name: 'Presupuestos' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Informes' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Añadir movimiento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Nuevo movimiento' })).not.toBeInTheDocument()
    expect(document.querySelector('.sidebar')).toBeNull()
  })

  it('navigates between tabs and moves aria-current', async () => {
    const { user } = renderApp()
    await user.click(within(mainNav()).getByRole('button', { name: 'Movimientos' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Movimientos' })).toBeInTheDocument()
    expect(currentSlots()).toHaveLength(1)
    expect(within(mainNav()).getByRole('button', { name: 'Movimientos' })).toHaveAttribute('aria-current', 'page')
  })

  it('the FAB opens the «Nuevo movimiento» sheet; a second press is ignored; × closes it', async () => {
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Añadir movimiento' }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo movimiento' })
    expect(dialog).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Añadir movimiento' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('⚙ opens Ajustes (no month selector, no ⚙, no aria-current) and «Volver» returns to the previous screen', async () => {
    const { user } = renderApp()
    await user.click(within(mainNav()).getByRole('button', { name: 'Presupuestos' }))
    await user.click(screen.getByRole('button', { name: 'Ajustes' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajustes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mes anterior' })).not.toBeInTheDocument()
    expect(currentSlots()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Presupuestos' })).toBeInTheDocument()
    expect(within(mainNav()).getByRole('button', { name: 'Presupuestos' })).toHaveAttribute('aria-current', 'page')
  })

  it('«Volver» from Ajustes goes to Inicio when there is no previous screen', async () => {
    const { user } = renderApp({ ui: { screen: 'settings' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Inicio' })).toBeInTheDocument()
  })

  it('«Volver» from Categorías goes to Ajustes and Categorías marks no tab', async () => {
    const { user } = renderApp({ ui: { screen: 'categories' } })
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías' })).toBeInTheDocument()
    expect(currentSlots()).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Ajustes' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeInTheDocument()
  })

  it('month selector: label, ‹ › shift, «Hoy» only when the month differs and edge buttons disabled', async () => {
    const { user } = renderApp()
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hoy' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('agosto 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(screen.getByText('septiembre 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }))
    expect(screen.getByText('octubre 2026')).toBeInTheDocument()
  })

  it('disables the edge buttons at MIN_MONTH and MAX_MONTH', () => {
    renderApp({ ui: { month: '2000-01' } })
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled()
  })

  it('syncs settings.theme to <html data-theme> (removed for system)', () => {
    const data = fixtureData()
    data.settings = { ...data.settings, theme: 'dark' }
    const { store } = renderApp({ data })
    expect(document.documentElement.dataset['theme']).toBe('dark')
    act(() => {
      store.dispatch({ type: 'settings/update', patch: { theme: 'light' } })
    })
    expect(document.documentElement.dataset['theme']).toBe('light')
    act(() => {
      store.dispatch({ type: 'settings/update', patch: { theme: 'system' } })
    })
    expect(document.documentElement.dataset['theme']).toBeUndefined()
  })
})

describe('Shell (desktop)', () => {
  beforeEach(() => {
    media.desktop = true
  })

  it('renders the sidebar with a visible <h1>, «+ Nuevo movimiento» and aria-current nav; no tab bar', async () => {
    const { user } = renderApp()
    const h1 = screen.getByRole('heading', { level: 1, name: 'Mis Finanzas' })
    expect(h1).not.toHaveClass('visually-hidden')
    expect(document.querySelector('.tabbar')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Añadir movimiento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
    const nav = mainNav()
    expect(nav).toHaveClass('sidebar__nav')
    expect(within(nav).getAllByRole('button')).toHaveLength(6)
    expect(within(nav).getByRole('button', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(nav).getByRole('button', { name: 'Categorías' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Categorías' })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: 'Categorías' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('button', { name: 'Inicio' })).not.toHaveAttribute('aria-current')
    await user.click(screen.getByRole('button', { name: '+ Nuevo movimiento' }))
    expect(screen.getByRole('dialog', { name: 'Nuevo movimiento' })).toBeInTheDocument()
  })
})

describe('ToastRegion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function ToastHarness() {
    const { showToast } = useUiActions()
    return (
      <>
        <button type="button" onClick={() => showToast('Gasto guardado')}>
          toast A
        </button>
        <button type="button" onClick={() => showToast('Ingreso guardado')}>
          toast B
        </button>
        <ToastRegion />
      </>
    )
  }

  it('shows one toast in an aria-live=polite region, replaces it, and hides it after 4 s', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <UiProvider today={() => '2026-09-25'}>
        <ToastHarness />
      </UiProvider>,
    )
    const region = document.querySelector('.toast-region')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()
    await user.click(screen.getByRole('button', { name: 'toast A' }))
    expect(screen.getByText('Gasto guardado')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    await user.click(screen.getByRole('button', { name: 'toast B' }))
    expect(screen.queryByText('Gasto guardado')).not.toBeInTheDocument()
    expect(screen.getByText('Ingreso guardado')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(3999)
    })
    expect(screen.getByText('Ingreso guardado')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.queryByText('Ingreso guardado')).not.toBeInTheDocument()
    expect(region).toBeEmptyDOMElement()
  })
})
