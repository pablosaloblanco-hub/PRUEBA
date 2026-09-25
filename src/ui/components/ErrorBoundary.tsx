import { Component } from 'react'
import type { ReactNode } from 'react'

export type ErrorBoundaryProps = {
  /** Rendered instead of the children after an error; `retry` clears the error and re-renders them. */
  fallback: (retry: () => void) => ReactNode
  children: ReactNode
}

/** A flag rather than the thrown value: a component may throw `null`/`undefined` and must still get the fallback. */
type ErrorBoundaryState = { hasError: boolean }

/**
 * Class error boundary (React has no hook equivalent). No parameter
 * properties and no decorators, as required by `erasableSyntaxOnly`.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  retry = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (this.state.hasError) return this.props.fallback(this.retry)
    return this.props.children
  }
}
