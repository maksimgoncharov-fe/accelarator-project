import { worker } from './browser.ts'
import { setScenario } from './scenarios.ts'

const STORAGE_KEY = 'mock-scenario'

// Assessment infrastructure: the scenario comes from `?scenario=<name>` (persisted for the
// browser session) and never leaves this folder.
function resolveScenario(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  try {
    if (fromUrl) {
      window.sessionStorage.setItem(STORAGE_KEY, fromUrl)
      return fromUrl
    }
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return fromUrl
  }
}

export async function startMocks(): Promise<void> {
  setScenario(resolveScenario())
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}
