import type { SessionStatus } from '../../../api/index.ts'
import { STATUS_INFO } from '../model/status.ts'

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, symbol } = STATUS_INFO[status]
  return (
    <span className={`badge badge--${status}`}>
      <span aria-hidden="true" className="badge__symbol">
        {symbol}
      </span>
      {label}
    </span>
  )
}
