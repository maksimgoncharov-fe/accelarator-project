import type { MouseEvent } from 'react'

interface Props {
  id: string
  title: string
  href: string
  onOpen: (id: string) => void
}

/** A real link: modified clicks keep native behavior, plain clicks navigate in-app. */
export function SessionLink({ id, title, href, onOpen }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpen(id)
  }
  return (
    <a href={href} data-session-id={id} className="session-link" onClick={handleClick}>
      {title}
    </a>
  )
}
