import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { resetMockStore } from '../mocks/handlers.ts'
import { referenceNow } from '../mocks/fixtures.ts'
import { server } from '../mocks/node.ts'
import { setLatencyOverride, setScenario } from '../mocks/scenarios.ts'

// jsdom has no layout: report a 1440px-wide desktop viewport for min-width media queries.
window.matchMedia = (query: string): MediaQueryList => {
  const match = /min-width:\s*(\d+)px/.exec(query)
  const matches = match ? 1440 >= Number(match[1]) : false
  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }
}

// Older jsdom lacks modal <dialog> behavior; mimic the open state.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(() => {
  // Freeze only Date at the fixture reference instant, so the mock boundary's rebasing is the
  // identity transform and timers (debounce, MSW delay) keep working normally.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(referenceNow) })
  resetMockStore()
  setScenario('normal')
  setLatencyOverride(0)
  window.history.replaceState(null, '', '/')
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.useRealTimers()
})

afterAll(() => server.close())
