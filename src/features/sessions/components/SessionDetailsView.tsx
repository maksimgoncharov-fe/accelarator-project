import type { ReactNode } from 'react'
import type { SessionDetailsView as Details } from '../../../api/index.ts'
import {
  formatDuration,
  formatFullStart,
  formatNumber,
  formatTimestamp,
} from '../model/format.ts'
import { TYPE_LABELS, VISIBILITY_LABELS } from '../model/status.ts'
import { CapacityMeter } from './CapacityMeter.tsx'
import { StatusBadge } from './StatusBadge.tsx'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function SessionDetailsView({ session }: { session: Details }) {
  const remaining = Math.max(0, session.capacity - session.bookedCount)
  return (
    <div className="details">
      <p>
        <StatusBadge status={session.status} />
      </p>
      <dl className="detail-list">
        <Row label="Type">{TYPE_LABELS[session.type]}</Row>
        <Row label="Start">{formatFullStart(session.startsAt)}</Row>
        <Row label="Duration">{formatDuration(session.durationMinutes)}</Row>
        <Row label="Visibility">{VISIBILITY_LABELS[session.visibility]}</Row>
        <Row label="Location">
          <span className="wrap">{session.location.name}</span>
          <br />
          <span className="muted wrap">{session.location.address}</span>
        </Row>
        <Row label="Coach">
          <span className="wrap">{session.coach.name}</span>
          <br />
          <a href={`mailto:${session.coach.email}`} className="wrap">
            {session.coach.email}
          </a>
        </Row>
        <Row label="Capacity">
          {formatNumber(session.bookedCount)} booked of {formatNumber(session.capacity)} places
          <br />
          <CapacityMeter booked={session.bookedCount} capacity={session.capacity} hideText />
          <span className="muted">{formatNumber(remaining)} places remaining</span>
        </Row>
        {session.cancellation ? (
          <Row label="Cancellation">
            <span className="wrap">{session.cancellation.reason ?? 'No reason given'}</span>
            <br />
            <span className="muted">Cancelled {formatTimestamp(session.cancellation.cancelledAt)}</span>
          </Row>
        ) : null}
        <Row label="Description">
          <span className="wrap prewrap">{session.description ?? 'None added'}</span>
        </Row>
        <Row label="Trainer notes">
          <span className="wrap prewrap">{session.trainerNotes ?? 'None added'}</span>
        </Row>
        <Row label="Created">{formatTimestamp(session.createdAt)}</Row>
        <Row label="Last updated">{formatTimestamp(session.updatedAt)}</Row>
      </dl>
    </div>
  )
}
