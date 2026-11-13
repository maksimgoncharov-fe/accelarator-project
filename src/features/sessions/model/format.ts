// All date and number display goes through Intl, in the user's locale and timezone.
const listStart = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const fullStart = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timestamp = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const numbers = new Intl.NumberFormat()

export const formatListStart = (date: Date): string => listStart.format(date)
export const formatFullStart = (date: Date): string => fullStart.format(date)
export const formatTimestamp = (date: Date): string => timestamp.format(date)
export const formatNumber = (value: number): string => numbers.format(value)
export const formatDuration = (minutes: number): string => `${formatNumber(minutes)} min`

export function formatCapacity(booked: number, capacity: number): string {
  return `${formatNumber(booked)} / ${formatNumber(capacity)}`
}

export function formatSessionCount(total: number): string {
  return `${formatNumber(total)} ${total === 1 ? 'session' : 'sessions'}`
}
