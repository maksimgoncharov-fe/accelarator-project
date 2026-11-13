import { formatDuration, formatListStart } from '../model/format.ts'
import { TYPE_LABELS } from '../model/status.ts'
import { CapacityMeter } from './CapacityMeter.tsx'
import { SessionLink } from './SessionLink.tsx'
import { StatusBadge } from './StatusBadge.tsx'
import type { SessionsViewProps } from './SessionsTable.tsx'

export function SessionsMobileList({ items, selectedId, hrefFor, onOpen }: SessionsViewProps) {
  return (
    <ul className="sessions-list" aria-label="Training sessions">
      {items.map((session) => (
        <li
          key={session.id}
          className="session-item"
          aria-current={session.id === selectedId ? 'true' : undefined}
        >
          <div className="session-item__head">
            <SessionLink
              id={session.id}
              title={session.title}
              href={hrefFor(session.id)}
              onOpen={onOpen}
            />
            <StatusBadge status={session.status} />
          </div>
          <p className="muted">
            {formatListStart(session.startsAt)} · {formatDuration(session.durationMinutes)}
          </p>
          <p className="muted truncate">
            {session.coach.name} · {TYPE_LABELS[session.type]} · {session.location.name}
          </p>
          <CapacityMeter booked={session.bookedCount} capacity={session.capacity} />
        </li>
      ))}
    </ul>
  )
}
