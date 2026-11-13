import { ErrorBoundary } from './app/ErrorBoundary.tsx'
import { SessionsPage } from './features/sessions/components/SessionsPage.tsx'

function App() {
  return (
    <ErrorBoundary>
      <a className="skip-link" href="#results">
        Skip to sessions
      </a>
      <header className="app-header">
        <span className="app-header__brand" translate="no">
          Courtside
        </span>
        <span className="app-header__section">Operations</span>
      </header>
      <main>
        <SessionsPage />
      </main>
    </ErrorBoundary>
  )
}

export default App
