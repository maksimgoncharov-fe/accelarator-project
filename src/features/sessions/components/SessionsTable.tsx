import type { SessionSummaryView } from '../../../api/index.ts'
import { formatDuration, formatListStart } from '../model/format.ts'
import { TYPE_LABELS } from '../model/status.ts'
import { CapacityMeter } from './CapacityMeter.tsx'
import { SessionLink } from './SessionLink.tsx'
import { StatusBadge } from './StatusBadge.tsx'

export interface SessionsViewProps {
  items: SessionSummaryView[]
  selectedId: string | undefined
  hrefFor: (id: string) => string
  onOpen: (id: string) => void
}

export function SessionsTable({ items, selectedId, hrefFor, onOpen }: SessionsViewProps) {
  return (
    <table className="sessions-table">
      <caption className="visually-hidden">Training sessions</caption>
      <thead>
        <tr>
          <th scope="col">Session</th>
          <th scope="col">Start</th>
          <th scope="col">Coach</th>
          <th scope="col">Capacity</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {items.map((session) => (
          <tr key={session.id} aria-current={session.id === selectedId ? 'true' : undefined}>
            <th scope="row" className="cell-title">
              <SessionLink
                id={session.id}
                title={session.title}
                href={hrefFor(session.id)}
                onOpen={onOpen}
              />
              <span className="muted truncate">
                {TYPE_LABELS[session.type]} · {session.location.name}
              </span>
            </th>
            <td>
              {formatListStart(session.startsAt)}
              <span className="muted block">{formatDuration(session.durationMinutes)}</span>
            </td>
            <td className="truncate">{session.coach.name}</td>
            <td>
              <CapacityMeter booked={session.bookedCount} capacity={session.capacity} />
            </td>
            <td>
              <StatusBadge status={session.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
