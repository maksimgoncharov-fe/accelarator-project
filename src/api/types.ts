// Wire types: verbatim from frontend-accelerator-assessment/API_CONTRACT.md.
export type SessionType = 'training' | 'camp' | 'private'
export type SessionStatus = 'scheduled' | 'full' | 'cancelled' | 'completed'
export type Visibility = 'public' | 'invite-only'

export const SESSION_TYPES: readonly SessionType[] = ['training', 'camp', 'private']
export const SESSION_STATUSES: readonly SessionStatus[] = [
  'scheduled',
  'full',
  'cancelled',
  'completed',
]
export const VISIBILITIES: readonly Visibility[] = ['public', 'invite-only']

export interface CoachSummary {
  id: string
  name: string
  email: string
}

export interface LocationSummary {
  name: string
  address: string
}

export interface SessionSummary {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  startsAt: string
  durationMinutes: number
  capacity: number
  bookedCount: number
  visibility: Visibility
  coach: CoachSummary
  location: LocationSummary
  updatedAt: string
}

export interface SessionDetails extends SessionSummary {
  description: string | null
  trainerNotes: string | null
  createdAt: string
  cancellation: null | {
    reason: string | null
    cancelledAt: string
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    fieldErrors?: Record<string, string>
  }
}

export interface SessionsResponse {
  data: SessionSummary[]
  meta: { page: number; pageSize: number; total: number }
}

export interface CoachesResponse {
  data: CoachSummary[]
}

export interface CreateSessionRequest {
  title: string
  type: SessionType
  startsAt: string
  durationMinutes: number
  coachId: string
  locationName: string
  locationAddress: string
  capacity: number
  visibility: Visibility
  description?: string | null
  trainerNotes?: string | null
}

// View models: contract shapes with parsed dates. Components consume only these.
export interface SessionSummaryView
  extends Omit<SessionSummary, 'startsAt' | 'updatedAt'> {
  startsAt: Date
  updatedAt: Date
}

export interface SessionDetailsView
  extends Omit<SessionDetails, 'startsAt' | 'updatedAt' | 'createdAt' | 'cancellation'> {
  startsAt: Date
  updatedAt: Date
  createdAt: Date
  cancellation: null | { reason: string | null; cancelledAt: Date }
}

export interface SessionsPage {
  items: SessionSummaryView[]
  page: number
  pageSize: number
  total: number
}

export interface SessionFilters {
  query?: string
  status?: SessionStatus
}
