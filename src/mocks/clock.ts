const TIMESTAMP_FIELDS = new Set(['startsAt', 'createdAt', 'updatedAt', 'cancelledAt'])

export function computeOffset(referenceNow: string, now: Date): number {
  return now.getTime() - new Date(referenceNow).getTime()
}

/** Returns a deep copy with every fixture timestamp shifted by offsetMs. */
export function rebaseTimestamps<T>(value: T, offsetMs: number): T {
  if (Array.isArray(value)) {
    return value.map((item) => rebaseTimestamps(item, offsetMs)) as T
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (TIMESTAMP_FIELDS.has(key) && typeof item === 'string') {
        out[key] = new Date(new Date(item).getTime() + offsetMs).toISOString()
      } else {
        out[key] = rebaseTimestamps(item, offsetMs)
      }
    }
    return out as T
  }
  return value
}
