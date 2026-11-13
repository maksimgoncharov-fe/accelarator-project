/** Returns the aria wiring a control needs to be associated with its hint and error. */
export function describedBy(id: string, hint: string | undefined, error: string | undefined) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)
  return {
    id,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': ids.length > 0 ? ids.join(' ') : undefined,
  }
}

