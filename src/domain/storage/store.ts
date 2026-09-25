// ============================================================================
// src/domain/storage/store.ts — the external store React subscribes to with
// useSyncExternalStore (§5.6): stable snapshot, dispatch = reduce → save →
// notify, mode normal/readonly and recovery from a corrupt payload.
// ============================================================================
import type { Action, ReducerError } from '../actions'
import { reduce } from '../reducer'
import { seedData } from '../seed'
import type { AppData, LocalDate, Result, Timestamp } from '../types'
import type { LoadResult, SaveResult, StorageRepository } from './schema'

export type StoreMode = 'normal' | 'readonly'
export type PersistenceStatus = {
  error: SaveResult | null
  load: LoadResult | null
  lastSavedAt: Timestamp | null
  /** 'readonly' mientras la carga es corrupt/newer, o unavailable sin haber cambiado aún a InMemoryRepository: dispatch reduce y notifica pero NUNCA llama a repo.save. */
  mode: StoreMode
  /** true tras un recover('restore-backup') fallido: la UI oculta el botón. */
  backupUnreadable: boolean
}
export type Store = {
  getSnapshot(): AppData                 // misma referencia hasta que un dispatch cambie el estado
  getPersistence(): PersistenceStatus    // snapshot separado, cambia rara vez
  subscribe(listener: () => void): () => void
  dispatch(action: Action): Result<AppData, ReducerError>   // reduce → save(data, deps.now()) (sync, solo en mode 'normal') → notify
  /** Salida del modo readonly tras corrupt (§5.5). Nunca toca el backup (save con skipBackup). */
  recover(kind: 'restore-backup' | 'reset'): void
  reloadFromStorage(): void
}

export type StoreDeps = { now: () => Timestamp; today: () => LocalDate }

export type StoreOptions = {
  /**
   * Shown in `persistence.load` instead of this repo's own result. `App.tsx`
   * passes the original `unavailable` LoadResult when it rebuilds the store over
   * the memory repository, so the banner keeps its reason (§5.6).
   */
  loadOverride?: LoadResult
}

export function createStore(repo: StorageRepository, deps: StoreDeps, opts: StoreOptions = {}): Store {
  let state: AppData
  let persistence: PersistenceStatus
  const listeners = new Set<() => void>()

  const notify = (): void => {
    for (const listener of listeners) listener()
  }

  const setPersistence = (patch: Partial<PersistenceStatus>): void => {
    persistence = { ...persistence, ...patch }
  }

  /** Saves synchronously in mode 'normal'; keeps the in-memory state either way and tracks the error (§5.3). */
  const persist = (data: AppData, saveOpts?: { skipBackup?: boolean }): void => {
    if (persistence.mode !== 'normal') return
    const now = deps.now()
    const result = repo.save(data, now, saveOpts)
    if (result.kind === 'ok') setPersistence({ error: null, lastSavedAt: now })
    else setPersistence({ error: result })
  }

  /** §5.6 startup: load, probe, then seed/re-save as the LoadResult demands. */
  const boot = (): void => {
    // §5.6: `repo.load()` and then `repo.probeWrite()`, whatever the load says. The
    // probe never throws (the repository maps its own failures to a SaveResult) and
    // its outcome only matters when the store would otherwise start in mode 'normal'.
    const load = repo.load()
    const probe = repo.probeWrite()
    persistence = { error: null, load, lastSavedAt: null, mode: 'readonly', backupUnreadable: false }
    let needsSave = false

    switch (load.kind) {
      case 'ok':
        state = load.data
        persistence.mode = 'normal'
        needsSave = load.migratedFrom !== null
        break
      case 'empty':
        state = seedData(deps.now())
        persistence.mode = 'normal'
        needsSave = true
        break
      case 'corrupt':
      case 'newer':
      case 'unavailable':
        state = seedData(deps.now())
        break
    }

    if (persistence.mode === 'normal') {
      if (probe.kind === 'quota') {
        persistence.error = probe
      } else if (probe.kind === 'unavailable') {
        // Data was read fine, but nothing can be written: treat it as an unavailable load.
        persistence.mode = 'readonly'
        persistence.load = { kind: 'unavailable', error: probe.error }
      }
    }

    if (needsSave) persist(state)
    if (opts.loadOverride !== undefined) persistence.load = opts.loadOverride
  }

  boot()

  return {
    getSnapshot: () => state,
    getPersistence: () => persistence,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    dispatch(action) {
      const result = reduce(state, action)
      if (!result.ok) return result
      if (result.value === state) return result
      state = result.value
      persist(state)
      notify()
      return result
    },

    recover(kind) {
      if (kind === 'restore-backup') {
        const restored = repo.restoreBackup()
        if (restored.kind !== 'ok') {
          setPersistence({ backupUnreadable: true })
          notify()
          return
        }
        state = restored.data
      } else {
        state = seedData(deps.now())
      }
      setPersistence({ mode: 'normal', backupUnreadable: false, load: { kind: 'ok', data: state, migratedFrom: null } })
      persist(state, { skipBackup: true })
      notify()
    },

    reloadFromStorage() {
      boot()
      notify()
    },
  }
}
