import { useCallback } from 'react'
import { listSessions, type SessionStatus } from '../../../api/index.ts'
import { useResource } from './useResource.ts'

export function useSessionsList(query: string, status: SessionStatus | undefined) {
  const load = useCallback(
    (signal: AbortSignal) => listSessions({ query, status }, signal),
    [query, status],
  )
  return useResource(load, { keepPrevious: true })
}
