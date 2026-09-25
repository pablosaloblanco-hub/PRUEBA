// ============================================================================
// src/ui/components/Banner.tsx — persistent warning/error notice with an
// optional action (§5.5 banners). No screen knowledge.
// ============================================================================
import type { ReactNode } from 'react'

export type BannerProps = {
  tone: 'warning' | 'error'
  children: ReactNode
  /** Optional action button rendered at the end of the banner. */
  action?: { label: string; onClick: () => void }
}

export function Banner({ tone, children, action }: BannerProps) {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <p className="banner__text">{children}</p>
      {action !== undefined ? (
        <div className="banner__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={action.onClick}>
            {action.label}
          </button>
        </div>
      ) : null}
    </div>
  )
}
