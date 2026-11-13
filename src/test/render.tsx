import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.tsx'
import { setScenario } from '../mocks/scenarios.ts'

/** Renders the app at `path` with the given mock scenario selected at the mock boundary. */
export function renderApp({ path = '/', scenario = 'normal' }: { path?: string; scenario?: string } = {}) {
  window.history.replaceState(null, '', path)
  setScenario(scenario)
  const user = userEvent.setup()
  return { user, ...render(<App />) }
}
