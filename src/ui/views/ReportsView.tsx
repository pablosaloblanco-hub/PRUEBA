// ============================================================================
// src/ui/views/ReportsView.tsx — Informes (F7, §7.5). The Shell imports this
// statically; the Recharts-dependent body (ReportsContent) is loaded with
// React.lazy inside an ErrorBoundary + Suspense, so a failed chunk shows
// «No se ha podido cargar el informe» with «Reintentar» (which creates a fresh
// lazy component: React caches a rejected import otherwise). The lazy component
// lives at module scope so revisiting Informes reuses the resolved chunk instead
// of showing «Cargando informe…» again on every mount.
// ============================================================================
import { Suspense, lazy, useState } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { EmptyState } from '../components/EmptyState'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { copy } from '../copy'

type LazyContent = LazyExoticComponent<ComponentType>

function loadContent(): LazyContent {
  return lazy(() => import('./ReportsContent'))
}

/** Shared by every mount; replaced only when a failed load is retried. */
let Content: LazyContent = loadContent()

function LoadingFallback() {
  return (
    <div className="screen screen--reports" data-screen={copy.nav.reports}>
      <p className="text-muted" role="status">
        {copy.reports.loading}
      </p>
    </div>
  )
}

export function ReportsView() {
  // Bumped on retry so React remounts the (new) lazy component.
  const [generation, setGeneration] = useState(0)

  return (
    <ErrorBoundary
      fallback={(retry) => (
        <div className="screen screen--reports" data-screen={copy.nav.reports}>
          <EmptyState
            title={copy.reports.loadError}
            actionLabel={copy.common.retry}
            onAction={() => {
              Content = loadContent()
              setGeneration((g) => g + 1)
              retry()
            }}
          />
        </div>
      )}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Content key={generation} />
      </Suspense>
    </ErrorBoundary>
  )
}
