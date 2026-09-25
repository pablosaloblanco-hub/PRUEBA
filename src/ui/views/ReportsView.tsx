// ============================================================================
// src/ui/views/ReportsView.tsx — Informes (F7, §7.5). The Shell imports this
// statically; the Recharts-dependent body (ReportsContent) is loaded with
// React.lazy inside an ErrorBoundary + Suspense, so a failed chunk shows
// «No se ha podido cargar el informe» with «Reintentar» (which creates a fresh
// lazy component: React caches a rejected import otherwise).
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
  const [Content, setContent] = useState<LazyContent>(loadContent)

  return (
    <ErrorBoundary
      fallback={(retry) => (
        <div className="screen screen--reports" data-screen={copy.nav.reports}>
          <EmptyState
            title={copy.reports.loadError}
            actionLabel={copy.common.retry}
            onAction={() => {
              setContent(loadContent())
              retry()
            }}
          />
        </div>
      )}
    >
      <Suspense fallback={<LoadingFallback />}>
        <Content />
      </Suspense>
    </ErrorBoundary>
  )
}
