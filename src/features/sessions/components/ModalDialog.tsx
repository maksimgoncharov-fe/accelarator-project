import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  labelledBy: string
  className?: string
  /** Called for Escape. The parent decides whether closing is allowed. */
  onRequestClose: () => void
  children: ReactNode
}

/** Native <dialog> shown modally: focus trap, inert background, Escape handling. */
export function ModalDialog({ labelledBy, className, onRequestClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onRequestClose()
      }}
    >
      {children}
    </dialog>
  )
}
