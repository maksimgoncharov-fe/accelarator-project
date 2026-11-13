import { useCallback } from 'react'
import { getSession } from '../../../api/index.ts'
import { useResource } from './useResource.ts'

export function useSessionDetails(id: string) {
  const load = useCallback((signal: AbortSignal) => getSession(id, signal), [id])
  return useResource(load)
}
