export type ApiErrorKind = 'api' | 'network' | 'malformed' | 'aborted'

export class ApiClientError extends Error {
  kind: ApiErrorKind
  status: number | null
  code: string
  fieldErrors?: Record<string, string>

  constructor(init: {
    kind: ApiErrorKind
    status: number | null
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }) {
    super(init.message)
    this.name = 'ApiClientError'
    this.kind = init.kind
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof ApiClientError && error.kind === 'aborted') ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}
