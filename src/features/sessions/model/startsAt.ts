/**
 * Converts the form's local date (YYYY-MM-DD) and time (HH:MM) to a UTC ISO string.
 * Returns null when either part is missing or not a real calendar moment.
 * This is the single owner of the local-to-UTC conversion.
 */
export function toStartsAt(date: string, time: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return null
  const [year, month, day] = [Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3])]
  const [hour, minute] = [Number(timeMatch[1]), Number(timeMatch[2])]
  const local = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== month - 1 ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute
  ) {
    return null
  }
  return local.toISOString()
}

export function isFuture(iso: string, now: Date): boolean {
  return new Date(iso).getTime() > now.getTime()
}

/** Today's local date as YYYY-MM-DD, for the date input's `min`. */
export function todayLocalDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
