// ============================================================================
// src/test/renderApp.tsx — mounts <App store today> over a memory repository
// seeded with the §3.7 fixture (§10.2). Returns the Testing Library result
// plus a user-event instance, the store and the repository.
// ============================================================================
import { render } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import App from '../App'
import { serializeEnvelope } from '../domain/storage/jsonio'
import { createMemoryRepository } from '../domain/storage/memoryRepository'
import type { StorageRepository } from '../domain/storage/schema'
import { createStore } from '../domain/storage/store'
import type { Store } from '../domain/storage/store'
import type { AppData, LocalDate, Timestamp } from '../domain/types'
import type { UiState } from '../ui/state/uiReducer'
import { FIXTURE_TODAY, fixtureData } from './fixtures'

/** `savedAt` of the §3.7 fixture; also what `deps.now()` returns by default. */
export const FIXTURE_NOW: Timestamp = 1_783_900_800_000

export type RenderAppOptions = {
  /** Domain state to seed the memory repository with (default: §3.7 fixture). */
  data?: AppData
  /** Injected clock for `today` (default '2026-09-25'). */
  today?: LocalDate
  /** Injected `now` for the store (`savedAt`, seed timestamps). */
  now?: Timestamp
  /** A repository to use instead of the seeded memory one (e.g. corrupt raw, `createMemoryRepository()` for first use). */
  repo?: StorageRepository
  /** A fully built store (overrides `data`/`repo`/`now`). */
  store?: Store
  /** Initial UI state overrides: start on a screen, month or with a sheet open. */
  ui?: Partial<UiState>
  /** Passed to `userEvent.setup` (e.g. `{ advanceTimers: vi.advanceTimersByTime }` with fake timers). */
  userEventOptions?: Parameters<typeof userEvent.setup>[0]
}

export type RenderAppResult = RenderResult & {
  user: UserEvent
  store: Store
  repo: StorageRepository
  today: LocalDate
}

export function renderApp(options: RenderAppOptions = {}): RenderAppResult {
  const today = options.today ?? FIXTURE_TODAY
  const now = options.now ?? FIXTURE_NOW
  const repo = options.repo ?? createMemoryRepository(serializeEnvelope(options.data ?? fixtureData(), now))
  const store = options.store ?? createStore(repo, { now: () => now, today: () => today })
  const user = userEvent.setup(options.userEventOptions)
  const result = render(<App store={store} today={() => today} initialUi={options.ui} />)
  return { ...result, user, store, repo, today }
}
