// ============================================================================
// src/App.test.tsx — the <h1> «Mis Finanzas» always exists (§7.0), and App
// without props boots over localStorage (seeding it) or falls back to memory
// with the «unavailable» banner when localStorage throws (§5.6).
// ============================================================================
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './domain/storage/schema'
import { renderApp } from './test/renderApp'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the title', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: /mis finanzas/i })).toBeInTheDocument()
  })

  it('without props boots over localStorage and seeds it on first use', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /mis finanzas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Inicio' })).toBeInTheDocument()
    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ app: 'mis-finanzas', schemaVersion: 1 })
    expect(screen.queryByText(/No se puede guardar en este navegador/)).not.toBeInTheDocument()
  })

  it('falls back to a memory store with the «unavailable» banner when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    render(<App />)
    expect(screen.getByRole('heading', { name: /mis finanzas/i })).toBeInTheDocument()
    expect(
      screen.getByText('No se puede guardar en este navegador. Los datos se perderán al cerrar esta pestaña.'),
    ).toBeInTheDocument()
  })
})
