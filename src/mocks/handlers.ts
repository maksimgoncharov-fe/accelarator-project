import { delay, http, HttpResponse } from 'msw'
import type { ApiError, SessionStatus } from '../api/types.ts'
import { SESSION_STATUSES } from '../api/types.ts'
import { getLatencyMs, getOverride, type RequestKey } from './scenarios.ts'
import { createStore, PAGE_SIZE, type MockStore } from './store.ts'

let store: MockStore = createStore()

/** Replaces the in-memory backend state (fresh fixtures, optionally with an injected clock). */
export function resetMockStore(now?: () => Date): void {
  store = createStore(now)
}

function apiError(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  const body: ApiError = { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }
  return HttpResponse.json(body, { status })
}

async function withScenario(
  key: RequestKey,
  sessionId: string | undefined,
  respond: () => Response | Promise<Response>,
): Promise<Response> {
  await delay(getLatencyMs())
  const override = getOverride(key, sessionId)
  if (override) return HttpResponse.json(override.body as Record<string, unknown>, { status: override.status })
  return respond()
}

export const handlers = [
  http.get('/api/sessions', ({ request }) =>
    withScenario('list', undefined, () => {
      const params = new URL(request.url).searchParams
      const status = params.get('status') ?? undefined
      if (status && !SESSION_STATUSES.includes(status as SessionStatus)) {
        return apiError(400, 'INVALID_FILTER', 'The status filter is not supported.')
      }
      const { items, total } = store.list({
        query: params.get('query') ?? undefined,
        status: status as SessionStatus | undefined,
      })
      return HttpResponse.json({ data: items, meta: { page: 1, pageSize: PAGE_SIZE, total } })
    }),
  ),

  http.get('/api/sessions/:sessionId', ({ params }) => {
    const id = String(params.sessionId)
    return withScenario('details', id, () => {
      const session = store.get(id)
      if (!session) {
        return apiError(404, 'SESSION_NOT_FOUND', 'The requested session no longer exists.')
      }
      return HttpResponse.json(session)
    })
  }),

  http.get('/api/coaches', () =>
    withScenario('coaches', undefined, () => HttpResponse.json({ data: store.coaches() })),
  ),

  http.post('/api/sessions', async ({ request }) => {
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      payload = undefined
    }
    return withScenario('create', undefined, () => {
      const result = store.create(payload)
      if (!result.ok) {
        return apiError(400, 'VALIDATION_FAILED', 'Check the highlighted fields.', result.fieldErrors)
      }
      return HttpResponse.json(result.session, { status: 201 })
    })
  }),
]
