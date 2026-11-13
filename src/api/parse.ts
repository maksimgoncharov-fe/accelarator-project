import { ApiClientError } from './errors.ts'
import {
  SESSION_STATUSES,
  SESSION_TYPES,
  VISIBILITIES,
  type CoachSummary,
  type SessionDetailsView,
  type SessionStatus,
  type SessionSummaryView,
  type SessionsPage,
  type SessionType,
  type Visibility,
} from './types.ts'

function malformed(what: string): never {
  throw new ApiClientError({
    kind: 'malformed',
    status: null,
    code: 'MALFORMED_RESPONSE',
    message: `The server response could not be understood (${what}).`,
  })
}

type Rec = Record<string, unknown>

function rec(value: unknown, what: string): Rec {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) malformed(what)
  return value as Rec
}

function str(value: unknown, what: string): string {
  if (typeof value !== 'string') malformed(what)
  return value
}

function num(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) malformed(what)
  return value
}

function nullableStr(value: unknown, what: string): string | null {
  if (value === null || value === undefined) return null
  return str(value, what)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) malformed(what)
  return value as T
}

function date(value: unknown, what: string): Date {
  const parsed = new Date(str(value, what))
  if (Number.isNaN(parsed.getTime())) malformed(what)
  return parsed
}

export function parseCoach(value: unknown): CoachSummary {
  const r = rec(value, 'coach')
  return {
    id: str(r.id, 'coach.id'),
    name: str(r.name, 'coach.name'),
    email: str(r.email, 'coach.email'),
  }
}

export function parseSummary(value: unknown): SessionSummaryView {
  const r = rec(value, 'session')
  const location = rec(r.location, 'session.location')
  return {
    id: str(r.id, 'session.id'),
    title: str(r.title, 'session.title'),
    type: oneOf<SessionType>(r.type, SESSION_TYPES, 'session.type'),
    status: oneOf<SessionStatus>(r.status, SESSION_STATUSES, 'session.status'),
    startsAt: date(r.startsAt, 'session.startsAt'),
    durationMinutes: num(r.durationMinutes, 'session.durationMinutes'),
    capacity: num(r.capacity, 'session.capacity'),
    bookedCount: num(r.bookedCount, 'session.bookedCount'),
    visibility: oneOf<Visibility>(r.visibility, VISIBILITIES, 'session.visibility'),
    coach: parseCoach(r.coach),
    location: {
      name: str(location.name, 'session.location.name'),
      address: str(location.address, 'session.location.address'),
    },
    updatedAt: date(r.updatedAt, 'session.updatedAt'),
  }
}

export function parseDetails(value: unknown): SessionDetailsView {
  const r = rec(value, 'session details')
  const summary = parseSummary(r)
  let cancellation: SessionDetailsView['cancellation'] = null
  if (r.cancellation !== null && r.cancellation !== undefined) {
    const c = rec(r.cancellation, 'session.cancellation')
    cancellation = {
      reason: nullableStr(c.reason, 'session.cancellation.reason'),
      cancelledAt: date(c.cancelledAt, 'session.cancellation.cancelledAt'),
    }
  }
  return {
    ...summary,
    description: nullableStr(r.description, 'session.description'),
    trainerNotes: nullableStr(r.trainerNotes, 'session.trainerNotes'),
    createdAt: date(r.createdAt, 'session.createdAt'),
    cancellation,
  }
}

export function parseSessionsPage(value: unknown): SessionsPage {
  const r = rec(value, 'sessions response')
  if (!Array.isArray(r.data)) malformed('sessions.data')
  const meta = rec(r.meta, 'sessions.meta')
  return {
    items: r.data.map(parseSummary),
    page: num(meta.page, 'meta.page'),
    pageSize: num(meta.pageSize, 'meta.pageSize'),
    total: num(meta.total, 'meta.total'),
  }
}

export function parseCoaches(value: unknown): CoachSummary[] {
  const r = rec(value, 'coaches response')
  if (!Array.isArray(r.data)) malformed('coaches.data')
  return r.data.map(parseCoach)
}
