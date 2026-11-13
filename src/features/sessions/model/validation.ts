import type {
  CreateSessionRequest,
  SessionType,
  Visibility,
} from '../../../api/index.ts'
import { isFuture, toStartsAt } from './startsAt.ts'

export interface CreateFormValues {
  title: string
  type: SessionType
  date: string
  time: string
  durationMinutes: string
  coachId: string
  locationName: string
  locationAddress: string
  capacity: string
  visibility: Visibility
  description: string
  trainerNotes: string
}

export type FormField = keyof CreateFormValues
export type FormErrors = Partial<Record<FormField, string>>

export const INITIAL_VALUES: CreateFormValues = {
  title: '',
  type: 'training',
  date: '',
  time: '',
  durationMinutes: '60',
  coachId: '',
  locationName: '',
  locationAddress: '',
  capacity: '',
  visibility: 'public',
  description: '',
  trainerNotes: '',
}

export const FIELD_ORDER: FormField[] = [
  'title',
  'type',
  'date',
  'time',
  'durationMinutes',
  'coachId',
  'locationName',
  'locationAddress',
  'capacity',
  'visibility',
  'description',
  'trainerNotes',
]

export const NOTES_LIMIT = 500

function parseInteger(value: string): number | null {
  const trimmed = value.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

function checkLength(value: string, min: number, max: number): boolean {
  const length = value.trim().length
  return length >= min && length <= max
}

export function validateField(
  field: FormField,
  values: CreateFormValues,
  now: Date,
): string | undefined {
  switch (field) {
    case 'title':
      return checkLength(values.title, 3, 80)
        ? undefined
        : 'Enter a title of 3–80 characters.'
    case 'date': {
      if (!values.date) return 'Choose a date.'
      if (!values.time) return undefined // reported on the time field
      const startsAt = toStartsAt(values.date, values.time)
      if (!startsAt) return 'Choose a valid date.'
      return isFuture(startsAt, now) ? undefined : 'Choose a start time in the future.'
    }
    case 'time':
      if (!values.time) return 'Choose a start time.'
      return undefined
    case 'durationMinutes': {
      const n = parseInteger(values.durationMinutes)
      return n !== null && n >= 30 && n <= 240
        ? undefined
        : 'Enter a whole number of minutes from 30 to 240.'
    }
    case 'coachId':
      return values.coachId ? undefined : 'Select a coach.'
    case 'locationName':
      return checkLength(values.locationName, 2, 80)
        ? undefined
        : 'Enter a location name of 2–80 characters.'
    case 'locationAddress':
      return checkLength(values.locationAddress, 3, 120)
        ? undefined
        : 'Enter a location address of 3–120 characters.'
    case 'capacity': {
      const n = parseInteger(values.capacity)
      return n !== null && n >= 1 && n <= 100
        ? undefined
        : 'Enter a whole number of places from 1 to 100.'
    }
    case 'trainerNotes':
      return values.trainerNotes.length <= NOTES_LIMIT
        ? undefined
        : `Keep trainer notes to ${NOTES_LIMIT} characters or fewer.`
    default:
      return undefined
  }
}

export function validateCreate(values: CreateFormValues, now: Date): FormErrors {
  const errors: FormErrors = {}
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values, now)
    if (message) errors[field] = message
  }
  return errors
}

/** Builds the API request. Call only after validateCreate returned no errors. */
export function toCreateRequest(values: CreateFormValues): CreateSessionRequest {
  const startsAt = toStartsAt(values.date, values.time)
  return {
    title: values.title.trim(),
    type: values.type,
    startsAt: startsAt ?? '',
    durationMinutes: Number(values.durationMinutes.trim()),
    coachId: values.coachId,
    locationName: values.locationName.trim(),
    locationAddress: values.locationAddress.trim(),
    capacity: Number(values.capacity.trim()),
    visibility: values.visibility,
    description: values.description,
    trainerNotes: values.trainerNotes,
  }
}

const SERVER_FIELD_MAP: Record<string, FormField> = {
  title: 'title',
  type: 'type',
  startsAt: 'date',
  durationMinutes: 'durationMinutes',
  coachId: 'coachId',
  locationName: 'locationName',
  locationAddress: 'locationAddress',
  capacity: 'capacity',
  visibility: 'visibility',
  description: 'description',
  trainerNotes: 'trainerNotes',
}

/** Maps server fieldErrors onto form fields; keys it does not know come back as `unmapped`. */
export function mapServerFieldErrors(fieldErrors: Record<string, string> | undefined): {
  fields: FormErrors
  unmapped: string[]
} {
  const fields: FormErrors = {}
  const unmapped: string[] = []
  for (const [key, message] of Object.entries(fieldErrors ?? {})) {
    const field = SERVER_FIELD_MAP[key]
    if (field) fields[field] = message
    else unmapped.push(message)
  }
  return { fields, unmapped }
}
