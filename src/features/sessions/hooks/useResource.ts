import { useCallback, useEffect, useState } from 'react'
import { ApiClientError, isAbortError } from '../../../api/index.ts'

export interface ResourceState<T> {
  status: 'loading' | 'success' | 'error'
  data: T | undefined
  error: ApiClientError | undefined
  /** True while a refetch runs and the previous data is still shown. */
  refreshing: boolean
  /** Counts successful loads; lets callers tell fresh data from data fetched before an event. */
  version: number
}

const LOADING: ResourceState<never> = {
  status: 'loading',
  data: undefined,
  error: undefined,
  refreshing: false,
  version: 0,
}

function toClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error
  return new ApiClientError({
    kind: 'network',
    status: null,
    code: 'UNEXPECTED_ERROR',
    message: 'Something unexpected went wrong. Try again.',
  })
}

/**
 * Owns one GET request: abort on change/unmount, loading/success/error, manual retry.
 * `load` must be memoized by the caller; a new identity starts a new request.
 */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  options: { enabled?: boolean; keepPrevious?: boolean } = {},
): ResourceState<T> & { retry: () => void } {
  const { enabled = true, keepPrevious = false } = options
  const [state, setState] = useState<ResourceState<T>>(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setState((previous) =>
      keepPrevious && previous.data !== undefined
        ? { ...previous, status: 'success', error: undefined, refreshing: true }
        : LOADING,
    )
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            status: 'success',
            data,
            error: undefined,
            refreshing: false,
            version: previous.version + 1,
          }))
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setState((previous) => ({
          status: 'error',
          data: keepPrevious ? previous.data : undefined,
          error: toClientError(error),
          refreshing: false,
          version: previous.version,
        }))
      },
    )
    return () => controller.abort()
  }, [load, enabled, keepPrevious, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { ...state, retry }
}
