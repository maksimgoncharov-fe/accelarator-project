import type { SessionStatus, SessionType, Visibility } from '../../../api/index.ts'

export const STATUS_INFO: Record<SessionStatus, { label: string; symbol: string }> = {
  scheduled: { label: 'Scheduled', symbol: '◷' },
  full: { label: 'Full', symbol: '●' },
  cancelled: { label: 'Cancelled', symbol: '✕' },
  completed: { label: 'Completed', symbol: '✓' },
}

export const TYPE_LABELS: Record<SessionType, string> = {
  training: 'Training',
  camp: 'Camp',
  private: 'Private',
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: 'Public',
  'invite-only': 'Invite-only',
}
