import type { ReactNode } from 'react'

interface Props {
  title: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  children?: ReactNode
}

export function ErrorState({ title, message, onRetry, retryLabel = 'Try Again', children }: Props) {
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">{title}</p>
      {message ? <p className="state__text">{message}</p> : null}
      <div className="state__actions">
        {onRetry ? (
          <button type="button" className="button" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
        {children}
      </div>
    </div>
  )
}
