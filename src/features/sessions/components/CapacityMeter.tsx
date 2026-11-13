import { formatCapacity, formatNumber } from '../model/format.ts'

interface Props {
  booked: number
  capacity: number
  /** Show only the bar and an accessible name, when the text is rendered elsewhere. */
  hideText?: boolean
}

export function CapacityMeter({ booked, capacity, hideText = false }: Props) {
  const ratio = capacity > 0 ? Math.min(1, booked / capacity) : 0
  return (
    <span className="capacity">
      {hideText ? null : <span className="capacity__text">{formatCapacity(booked, capacity)}</span>}
      <span
        className="meter"
        role="meter"
        aria-label={`${formatNumber(booked)} of ${formatNumber(capacity)} places booked`}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(booked, capacity)}
      >
        <span className="meter__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </span>
    </span>
  )
}
