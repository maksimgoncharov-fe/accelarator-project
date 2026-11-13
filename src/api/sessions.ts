import { request } from './http.ts'
import { parseCoaches, parseDetails, parseSessionsPage } from './parse.ts'
import {
  SESSION_STATUSES,
  type CoachSummary,
  type CreateSessionRequest,
  type SessionDetailsView,
  type SessionFilters,
  type SessionsPage,
} from './types.ts'

export function listSessions(
  filters: SessionFilters,
  signal?: AbortSignal,
): Promise<SessionsPage> {
  const query = filters.query?.trim()
  const status =
    filters.status && SESSION_STATUSES.includes(filters.status) ? filters.status : undefined
  return request('GET', '/sessions', { query: { query, status }, signal }).then(
    parseSessionsPage,
  )
}

export function getSession(id: string, signal?: AbortSignal): Promise<SessionDetailsView> {
  return request('GET', `/sessions/${encodeURIComponent(id)}`, { signal }).then(parseDetails)
}

export function listCoaches(signal?: AbortSignal): Promise<CoachSummary[]> {
  return request('GET', '/coaches', { signal }).then(parseCoaches)
}

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function createSession(
  input: CreateSessionRequest,
  signal?: AbortSignal,
): Promise<SessionDetailsView> {
  const body: CreateSessionRequest = {
    title: input.title.trim(),
    type: input.type,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    coachId: input.coachId,
    locationName: input.locationName.trim(),
    locationAddress: input.locationAddress.trim(),
    capacity: input.capacity,
    visibility: input.visibility,
  }
  const description = optionalText(input.description)
  const trainerNotes = optionalText(input.trainerNotes)
  if (description !== undefined) body.description = description
  if (trainerNotes !== undefined) body.trainerNotes = trainerNotes
  return request('POST', '/sessions', { body, signal }).then(parseDetails)
}
