import type { ReactNode, Ref } from 'react'

interface Props {
  ref?: Ref<HTMLDivElement>
  children: ReactNode
  actions?: ReactNode
}

/** A polite status message that can receive programmatic focus after an action completes. */
export function ResultBanner({ ref, children, actions }: Props) {
  return (
    <div className="banner" role="status" tabIndex={-1} ref={ref}>
      <p className="banner__text">{children}</p>
      {actions ? <div className="banner__actions">{actions}</div> : null}
    </div>
  )
}
