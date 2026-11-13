import { ApiClientError } from './errors.ts'

// The only place that knows the API base path.
const BASE_PATH = '/api'

interface RequestOptions {
  query?: Record<string, string | undefined>
  body?: unknown
  signal?: AbortSignal
}

function isApiErrorBody(
  value: unknown,
): value is { error: { code: string; message: string; fieldErrors?: Record<string, string> } } {
  if (typeof value !== 'object' || value === null) return false
  const error = (value as { error?: unknown }).error
  if (typeof error !== 'object' || error === null) return false
  const e = error as { code?: unknown; message?: unknown }
  return typeof e.code === 'string' && typeof e.message === 'string'
}

function readFieldErrors(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const out: Record<string, string> = {}
  for (const [key, message] of Object.entries(value)) {
    if (typeof message === 'string') out[key] = message
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Performs one request and returns the parsed JSON body, or throws ApiClientError. */
export async function request(
  method: 'GET' | 'POST',
  path: string,
  { query, body, signal }: RequestOptions = {},
): Promise<unknown> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  const qs = params.toString()
  const url = `${BASE_PATH}${path}${qs ? `?${qs}` : ''}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError({
        kind: 'aborted',
        status: null,
        code: 'ABORTED',
        message: 'Request cancelled.',
      })
    }
    throw new ApiClientError({
      kind: 'network',
      status: null,
      code: 'NETWORK_ERROR',
      message: 'Network request failed. Check your connection and try again.',
    })
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError({
        kind: 'aborted',
        status: null,
        code: 'ABORTED',
        message: 'Request cancelled.',
      })
    }
    payload = undefined
  }

  if (!response.ok) {
    if (isApiErrorBody(payload)) {
      throw new ApiClientError({
        kind: 'api',
        status: response.status,
        code: payload.error.code,
        message: payload.error.message,
        fieldErrors: readFieldErrors((payload.error as { fieldErrors?: unknown }).fieldErrors),
      })
    }
    throw new ApiClientError({
      kind: 'api',
      status: response.status,
      code: `HTTP_${response.status}`,
      message: 'The server returned an unexpected response.',
    })
  }

  if (payload === undefined) {
    throw new ApiClientError({
      kind: 'malformed',
      status: response.status,
      code: 'MALFORMED_RESPONSE',
      message: 'The server response could not be understood.',
    })
  }
  return payload
}
