import { Component } from 'react'
import type { ReactNode } from 'react'

export type ErrorBoundaryProps = {
  /** Rendered instead of the children after an error; `retry` clears the error and re-renders them. */
  fallback: (retry: () => void) => ReactNode
  children: ReactNode
}

type ErrorBoundaryState = { error: unknown | null }

/**
 * Class error boundary (React has no hook equivalent). No parameter
 * properties and no decorators, as required by `erasableSyntaxOnly`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  retry = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error !== null) return this.props.fallback(this.retry)
    return this.props.children
  }
}
