import { useEffect, useRef, useState } from 'react'
import { SESSION_STATUSES, type SessionStatus } from '../../../api/index.ts'
import { STATUS_INFO } from '../model/status.ts'

interface Props {
  query: string
  status: SessionStatus | undefined
  active: boolean
  onQueryChange: (query: string) => void
  onStatusChange: (status: SessionStatus | undefined) => void
  onClear: () => void
}

const DEBOUNCE_MS = 300

export function SessionsFilters({
  query,
  status,
  active,
  onQueryChange,
  onStatusChange,
  onClear,
}: Props) {
  // The URL owns the applied query. This draft only holds what the user is typing.
  const [draft, setDraft] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const searchRef = useRef<HTMLInputElement>(null)

  // External URL changes (back, clear) replace the draft; adjusted during render.
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setDraft(query)
  }

  useEffect(() => {
    if (draft === query) return
    const timer = window.setTimeout(() => onQueryChange(draft), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, query, onQueryChange])

  return (
    <form
      className="filters"
      role="search"
      aria-label="Filter sessions"
      onSubmit={(event) => {
        event.preventDefault()
        onQueryChange(draft)
      }}
    >
      <div className="filters__field filters__field--search">
        <label htmlFor="session-search">Search sessions</label>
        <input
          id="session-search"
          ref={searchRef}
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder="Title, coach, or location…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
      <div className="filters__field">
        <label htmlFor="session-status">Status</label>
        <select
          id="session-status"
          name="status"
          value={status ?? ''}
          onChange={(event) =>
            onStatusChange(SESSION_STATUSES.find((s) => s === event.target.value))
          }
        >
          <option value="">All statuses</option>
          {SESSION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_INFO[value].label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="button button--link"
        hidden={!active}
        onClick={() => {
          onClear()
          setDraft('')
          searchRef.current?.focus()
        }}
      >
        Clear Filters
      </button>
    </form>
  )
}
