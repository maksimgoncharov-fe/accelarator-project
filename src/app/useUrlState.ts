import { useMemo, useSyncExternalStore } from 'react'
import {
  closeOverlay,
  navigate,
  parseSearch,
  readSearch,
  subscribe,
  type UrlState,
} from './url-state.ts'
import type { SessionStatus } from '../api/index.ts'

export interface UrlActions {
  /** Search text: replaces the history entry (no history spam while typing). */
  setQuery(query: string): void
  setStatus(status: SessionStatus | undefined): void
  clearFilters(): void
  openSession(id: string): void
  openCreate(): void
  closeOverlay(): void
}

export function useUrlState(): [UrlState, UrlActions] {
  const search = useSyncExternalStore(subscribe, readSearch, () => '')
  const state = useMemo(() => parseSearch(search), [search])

  const actions = useMemo<UrlActions>(() => {
    const current = (): UrlState => parseSearch(readSearch())
    return {
      setQuery: (query) => {
        const now = current()
        if (now.query === query) return
        navigate({ ...now, query }, { replace: true, fromList: window.history.state?.fromList })
      },
      setStatus: (status) => {
        const now = current()
        if (now.status === status) return
        navigate({ ...now, status })
      },
      clearFilters: () => navigate({ ...current(), query: '', status: undefined }),
      openSession: (id) => {
        const now = current()
        const overlayOpen = Boolean(now.session) || now.create
        navigate(
          { ...now, session: id, create: false },
          { replace: overlayOpen, fromList: overlayOpen ? window.history.state?.fromList : true },
        )
      },
      openCreate: () => navigate({ ...current(), session: undefined, create: true }, { fromList: true }),
      closeOverlay: () => closeOverlay(current()),
    }
  }, [])

  return [state, actions]
}
