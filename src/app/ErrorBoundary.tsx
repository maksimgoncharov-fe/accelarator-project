import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

/** Last resort for render errors. Expected API failures are handled where they occur. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unexpected render error', error.message, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="app-crash">
          <h1>Something went wrong</h1>
          <p>The workspace hit an unexpected problem. Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
