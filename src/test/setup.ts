import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Testing Library's asyncWrapper (used by user-event) drains a setTimeout(0) and only
// advances fake timers when it finds a global `jest`. This shim makes
// `vi.useFakeTimers()` + `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`
// work under Vitest (it is a no-op while real timers are active).
Object.defineProperty(globalThis, 'jest', {
  configurable: true,
  writable: true,
  value: { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) },
})

// ---------------------------------------------------------------------------
// jsdom polyfills and stubs (docs/SPEC.md §9 «UI y entorno», §6 test/setup.ts)
// ---------------------------------------------------------------------------

// <dialog>: jsdom implements the element but not showModal()/close()/show().
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.show !== 'function') {
    proto.show = function show(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      if (returnValue !== undefined) this.returnValue = returnValue
      this.dispatchEvent(new Event('close', { bubbles: false }))
    }
  }
}

// ResizeObserver (Recharts' ResponsiveContainer).
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', { value: ResizeObserverStub, writable: true, configurable: true })
}

// matchMedia: mobile by default (matches: false); Shell tests mock useMediaQuery instead.
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// Downloads (Blob + <a download>): always stubbed — jsdom has no anchor navigation and
// the object-URL shim vitest injects does not accept jsdom Blobs. Tests spy on these.
Object.defineProperty(URL, 'createObjectURL', { writable: true, configurable: true, value: () => 'blob:mis-finanzas' })
Object.defineProperty(URL, 'revokeObjectURL', { writable: true, configurable: true, value: () => {} })
HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  delete document.documentElement.dataset['theme']
})
