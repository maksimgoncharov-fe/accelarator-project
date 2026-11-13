import { useCallback, useEffect, useState } from 'react'
import type { SessionDetailsView } from '../../../api/index.ts'
import { CreateSessionForm } from './CreateSessionForm.tsx'
import { ModalDialog } from './ModalDialog.tsx'

interface Props {
  onCreated: (session: SessionDetailsView) => void
  onClose: () => void
}

const HEADING_ID = 'create-heading'

export function CreateSessionDialog({ onCreated, onClose }: Props) {
  const [dirty, setDirty] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const requestClose = useCallback(() => {
    if (dirty) setConfirming(true)
    else onClose()
  }, [dirty, onClose])

  // Warn before the page unloads while entries would be lost.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  return (
    <ModalDialog labelledBy={HEADING_ID} className="panel panel--sheet panel--form" onRequestClose={requestClose}>
      <div className="panel__header">
        <h2 id={HEADING_ID}>Create session</h2>
      </div>
      <div className="panel__body">
        <CreateSessionForm
          onCreated={onCreated}
          onCancel={requestClose}
          onDirtyChange={setDirty}
          confirmingDiscard={confirming}
          onKeepEditing={() => setConfirming(false)}
          onDiscard={onClose}
        />
      </div>
    </ModalDialog>
  )
}
