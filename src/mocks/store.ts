import type {
  CoachSummary,
  CreateSessionRequest,
  SessionDetails,
  SessionFilters,
  SessionSummary,
} from '../api/types.ts'
import { SESSION_STATUSES, SESSION_TYPES, VISIBILITIES } from '../api/types.ts'
import { computeOffset, rebaseTimestamps } from './clock.ts'
import { coachFixtures, detailFixtures, referenceNow } from './fixtures.ts'

export const PAGE_SIZE = 10

export interface MockStore {
  coaches(): CoachSummary[]
  list(filters: SessionFilters & { status?: string }): {
    items: SessionSummary[]
    total: number
  }
  get(id: string): SessionDetails | undefined
  create(request: unknown): { ok: true; session: SessionDetails } | { ok: false; fieldErrors: Record<string, string> }
}

function toSummary(details: SessionDetails): SessionSummary {
  return {
    id: details.id,
    title: details.title,
    type: details.type,
    status: details.status,
    startsAt: details.startsAt,
    durationMinutes: details.durationMinutes,
    capacity: details.capacity,
    bookedCount: details.bookedCount,
    visibility: details.visibility,
    coach: details.coach,
    location: details.location,
    updatedAt: details.updatedAt,
  }
}

function lengthBetween(value: unknown, min: number, max: number): value is string {
  if (typeof value !== 'string') return false
  const length = value.trim().length
  return length >= min && length <= max
}

function integerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/**
 * In-memory backend state. A factory (not a singleton) so tests get a fresh store and an
 * injected clock; fixtures are rebased once, at creation.
 */
export function createStore(now: () => Date = () => new Date()): MockStore {
  const offset = computeOffset(referenceNow, now())
  const sessions: SessionDetails[] = rebaseTimestamps(detailFixtures, offset)
  const coaches = coachFixtures.map((coach) => ({ ...coach }))
  let sequence = 200

  return {
    coaches: () => coaches.map((coach) => ({ ...coach })),

    list({ query, status }) {
      const needle = query?.trim().toLowerCase() ?? ''
      const filtered = sessions.filter((session) => {
        if (status && session.status !== status) return false
        if (!needle) return true
        return [
          session.title,
          session.coach.name,
          session.location.name,
          session.location.address,
        ].some((text) => text.toLowerCase().includes(needle))
      })
      return {
        items: filtered.slice(0, PAGE_SIZE).map(toSummary),
        total: filtered.length,
      }
    },

    get: (id) => sessions.find((session) => session.id === id),

    create(input) {
      const fieldErrors: Record<string, string> = {}
      const body = (typeof input === 'object' && input !== null ? input : {}) as Partial<
        Record<keyof CreateSessionRequest, unknown>
      >

      if (!lengthBetween(body.title, 3, 80)) fieldErrors.title = 'Title must be 3 to 80 characters.'
      if (!SESSION_TYPES.includes(body.type as never)) fieldErrors.type = 'Choose a supported session type.'
      if (!VISIBILITIES.includes(body.visibility as never)) {
        fieldErrors.visibility = 'Choose a supported visibility.'
      }
      const startsAtMs =
        typeof body.startsAt === 'string' ? new Date(body.startsAt).getTime() : Number.NaN
      if (Number.isNaN(startsAtMs)) fieldErrors.startsAt = 'Start must be a valid date and time.'
      else if (startsAtMs <= now().getTime()) fieldErrors.startsAt = 'Start must be in the future.'
      if (!integerBetween(body.durationMinutes, 30, 240)) {
        fieldErrors.durationMinutes = 'Duration must be a whole number from 30 to 240.'
      }
      if (!integerBetween(body.capacity, 1, 100)) {
        fieldErrors.capacity = 'Capacity must be a whole number from 1 to 100.'
      }
      const coach = coaches.find((candidate) => candidate.id === body.coachId)
      if (!coach) fieldErrors.coachId = 'Choose a coach from the list.'
      if (!lengthBetween(body.locationName, 2, 80)) {
        fieldErrors.locationName = 'Location name must be 2 to 80 characters.'
      }
      if (!lengthBetween(body.locationAddress, 3, 120)) {
        fieldErrors.locationAddress = 'Location address must be 3 to 120 characters.'
      }
      if (typeof body.trainerNotes === 'string' && body.trainerNotes.length > 500) {
        fieldErrors.trainerNotes = 'Trainer notes must be at most 500 characters.'
      }

      if (Object.keys(fieldErrors).length > 0 || !coach) return { ok: false, fieldErrors }

      const timestamp = now().toISOString()
      sequence += 1
      const text = (value: unknown): string | null =>
        typeof value === 'string' && value.trim() ? value.trim() : null
      const session: SessionDetails = {
        id: `ses_${sequence}`,
        title: (body.title as string).trim(),
        type: body.type as SessionDetails['type'],
        status: SESSION_STATUSES[0],
        startsAt: new Date(startsAtMs).toISOString(),
        durationMinutes: body.durationMinutes as number,
        capacity: body.capacity as number,
        bookedCount: 0,
        visibility: body.visibility as SessionDetails['visibility'],
        coach: { ...coach },
        location: {
          name: (body.locationName as string).trim(),
          address: (body.locationAddress as string).trim(),
        },
        updatedAt: timestamp,
        description: text(body.description),
        trainerNotes: text(body.trainerNotes),
        createdAt: timestamp,
        cancellation: null,
      }
      sessions.push(session)
      return { ok: true, session }
    },
  }
}
