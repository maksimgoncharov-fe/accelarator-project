import { SESSION_STATUSES, type SessionStatus } from '../api/index.ts'

// The URL is the single owner of list filters, the open session, and the create view.
// This is the only module that touches window.history.
export interface UrlState {
  query: string
  status: SessionStatus | undefined
  session: string | undefined
  create: boolean
}

interface HistoryMarker {
  fromList?: boolean
}

const CHANGE_EVENT = 'app:urlchange'

export function parseSearch(search: string): UrlState {
  const params = new URLSearchParams(search)
  const status = SESSION_STATUSES.find((candidate) => candidate === params.get('status'))
  const session = params.get('session')?.trim()
  return {
    query: params.get('q') ?? '',
    status,
    session: session ? session : undefined,
    create: params.get('new') === '1',
  }
}

/** Builds a query string from state, preserving unrelated params (such as the mock scenario). */
export function buildSearch(state: UrlState, existing: string): string {
  const params = new URLSearchParams(existing)
  for (const key of ['q', 'status', 'session', 'new']) params.delete(key)
  if (state.query.trim()) params.set('q', state.query)
  if (state.status) params.set('status', state.status)
  if (state.session) params.set('session', state.session)
  else if (state.create) params.set('new', '1')
  const result = params.toString()
  return result ? `?${result}` : ''
}

export function readSearch(): string {
  return window.location.search
}

export function subscribe(callback: () => void): () => void {
  window.addEventListener('popstate', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('popstate', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

export function navigate(
  next: UrlState,
  options: { replace?: boolean; fromList?: boolean } = {},
): void {
  const url = `${window.location.pathname}${buildSearch(next, window.location.search)}`
  const marker: HistoryMarker = { fromList: options.fromList ?? false }
  if (options.replace) window.history.replaceState(marker, '', url)
  else window.history.pushState(marker, '', url)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Closes an overlay: back when it was opened from the list, otherwise replace with the list URL. */
export function closeOverlay(current: UrlState): void {
  const marker = window.history.state as HistoryMarker | null
  if (marker?.fromList) {
    window.history.back()
    return
  }
  navigate({ ...current, session: undefined, create: false }, { replace: true })
}

/** The href that would navigate to `state`, so links keep native new-tab behavior. */
export function hrefFor(state: UrlState): string {
  return `${window.location.pathname}${buildSearch(state, window.location.search)}`
}
