import { useEffect, useRef } from 'react'
import { useSessionDetails } from '../hooks/useSessionDetails.ts'
import { ErrorState } from './ErrorState.tsx'
import { ModalDialog } from './ModalDialog.tsx'
import { SessionDetailsView } from './SessionDetailsView.tsx'

interface Props {
  id: string
  /** Wide screens dock the details beside the list; narrow screens use a modal sheet. */
  docked: boolean
  onClose: () => void
}

const HEADING_ID = 'details-heading'

export function SessionDetailsContainer({ id, docked, onClose }: Props) {
  const details = useSessionDetails(id)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const idRef = useRef(id)
  useEffect(() => {
    idRef.current = id
  }, [id])

  // Docked mode has no focus trap: move focus to the heading when the session changes.
  useEffect(() => {
    if (docked) headingRef.current?.focus()
  }, [docked, id])

  // When the view closes, return focus to the row that opened it.
  useEffect(
    () => () => {
      const link = document.querySelector<HTMLElement>(
        `a[data-session-id="${CSS.escape(idRef.current)}"]`,
      )
      ;(link ?? document.getElementById('sessions-heading'))?.focus()
    },
    [],
  )

  const title = details.data?.title ?? 'Session details'

  const content = (
    <>
      <div className="panel__header">
        <h2 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="wrap">
          {title}
        </h2>
        <button type="button" className="button button--secondary" onClick={onClose}>
          Back to Sessions
        </button>
      </div>
      <div className="panel__body">
        {details.status === 'loading' ? (
          <p role="status" className="muted">
            Loading session…
          </p>
        ) : null}
        {details.status === 'success' && details.data ? (
          <SessionDetailsView session={details.data} />
        ) : null}
        {details.status === 'error' && details.error?.code === 'SESSION_NOT_FOUND' ? (
          <ErrorState title="This session no longer exists." message={details.error.message} />
        ) : null}
        {details.status === 'error' && details.error?.code !== 'SESSION_NOT_FOUND' ? (
          <ErrorState
            title="Session details can't be loaded right now."
            message={details.error?.message}
            onRetry={details.retry}
          />
        ) : null}
      </div>
    </>
  )

  if (docked) {
    return (
      <aside className="panel panel--docked" aria-labelledby={HEADING_ID}>
        {content}
      </aside>
    )
  }
  return (
    <ModalDialog labelledBy={HEADING_ID} className="panel panel--sheet" onRequestClose={onClose}>
      {content}
    </ModalDialog>
  )
}
