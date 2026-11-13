import { useCallback, useRef, useState } from 'react'
import {
  ApiClientError,
  createSession,
  type CreateSessionRequest,
  type SessionDetailsView,
} from '../../../api/index.ts'

export type CreateState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; session: SessionDetailsView }
  | { status: 'error'; error: ApiClientError }

/**
 * Owns the create mutation. Calls made while a request is pending are ignored. No automatic
 * retry and no idempotency key: the contract provides neither.
 */
export function useCreateSession(onCreated?: (session: SessionDetailsView) => void) {
  const [state, setState] = useState<CreateState>({ status: 'idle' })
  const pending = useRef(false)

  const submit = useCallback(
    (request: CreateSessionRequest) => {
      if (pending.current) return
      pending.current = true
      setState({ status: 'pending' })
      createSession(request).then(
        (session) => {
          pending.current = false
          setState({ status: 'success', session })
          onCreated?.(session)
        },
        (error: unknown) => {
          pending.current = false
          setState({
            status: 'error',
            error:
              error instanceof ApiClientError
                ? error
                : new ApiClientError({
                    kind: 'network',
                    status: null,
                    code: 'UNEXPECTED_ERROR',
                    message: 'Something unexpected went wrong.',
                  }),
          })
        },
      )
    },
    [onCreated],
  )

  const reset = useCallback(() => setState({ status: 'idle' }), [])
  return { state, submit, reset }
}
