import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  SESSION_TYPES,
  VISIBILITIES,
  type SessionDetailsView,
  type SessionType,
  type Visibility,
} from '../../../api/index.ts'
import { useCoaches } from '../hooks/useCoaches.ts'
import { useCreateSession } from '../hooks/useCreateSession.ts'
import { todayLocalDate } from '../model/startsAt.ts'
import { TYPE_LABELS, VISIBILITY_LABELS } from '../model/status.ts'
import {
  FIELD_ORDER,
  INITIAL_VALUES,
  NOTES_LIMIT,
  mapServerFieldErrors,
  toCreateRequest,
  validateCreate,
  type CreateFormValues,
  type FormErrors,
  type FormField,
} from '../model/validation.ts'
import { ErrorState } from './ErrorState.tsx'
import { describedBy } from './describedBy.ts'
import { Field } from './Field.tsx'

interface Props {
  onCreated: (session: SessionDetailsView) => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
  /** Set by the dialog while it asks the user to confirm discarding entries. */
  confirmingDiscard: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

const fieldId = (field: FormField) => `create-${field}`

export function CreateSessionForm({
  onCreated,
  onCancel,
  onDirtyChange,
  confirmingDiscard,
  onKeepEditing,
  onDiscard,
}: Props) {
  const [values, setValues] = useState<CreateFormValues>(INITIAL_VALUES)
  const [touched, setTouched] = useState<Set<FormField>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  // Refreshed from events (edit, blur, submit) so rendering stays pure.
  const [now, setNow] = useState(() => new Date())
  const [serverErrors, setServerErrors] = useState<FormErrors>({})

  const coaches = useCoaches()
  const { state, submit } = useCreateSession(onCreated)
  const pending = state.status === 'pending'
  const coachesReady = coaches.status === 'success' && (coaches.data?.length ?? 0) > 0

  const dirty = useMemo(
    () => FIELD_ORDER.some((field) => values[field] !== INITIAL_VALUES[field]),
    [values],
  )
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const clientErrors = validateCreate(values, now)

  const serverResult = useMemo(
    () =>
      state.status === 'error'
        ? mapServerFieldErrors(state.error.fieldErrors)
        : { fields: {} as FormErrors, unmapped: [] as string[] },
    [state],
  )

  // Server field errors are shown until the user edits the field again.
  useEffect(() => {
    setServerErrors(serverResult.fields)
    const first = FIELD_ORDER.find((field) => serverResult.fields[field])
    if (first) document.getElementById(fieldId(first))?.focus()
  }, [serverResult])

  const errorFor = (field: FormField): string | undefined =>
    (touched.has(field) || submitted ? clientErrors[field] : undefined) ?? serverErrors[field]

  const visibleErrors = FIELD_ORDER.filter((field) => errorFor(field))

  const update =
    (field: FormField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setNow(new Date())
      setValues((previous) => ({ ...previous, [field]: value }))
      setServerErrors((previous) => {
        if (!previous[field]) return previous
        const { [field]: _removed, ...rest } = previous
        return rest
      })
    }

  const blur = (field: FormField) => () => {
    setNow(new Date())
    setTouched((previous) => (previous.has(field) ? previous : new Set(previous).add(field)))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !coachesReady) return
    const submitTime = new Date()
    setNow(submitTime)
    setSubmitted(true)
    const errors = validateCreate(values, submitTime)
    const first = FIELD_ORDER.find((field) => errors[field])
    if (first) {
      document.getElementById(fieldId(first))?.focus()
      return
    }
    submit(toCreateRequest(values))
  }

  const props = (field: FormField, hint?: string) => ({
    ...describedBy(fieldId(field), hint, errorFor(field)),
    name: field,
    onChange: update(field),
    onBlur: blur(field),
  })

  const error = state.status === 'error' ? state.error : undefined
  let formMessage: string | null = null
  if (error) {
    if (error.kind === 'network' || error.kind === 'malformed') {
      formMessage =
        "We couldn't confirm the session was created. Check the list before trying again."
    } else if (serverResult.unmapped.length > 0 || Object.keys(serverResult.fields).length === 0) {
      formMessage = `The session could not be created. Your entries are kept. Try again. ${error.message}`
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="create-form">
      {visibleErrors.length > 0 && (submitted || Object.keys(serverErrors).length > 0) ? (
        <div className="error-summary" role="alert">
          <p className="state__title">Fix these fields before creating the session:</p>
          <ul>
            {visibleErrors.map((field) => (
              <li key={field}>
                <a
                  href={`#${fieldId(field)}`}
                  onClick={(event) => {
                    event.preventDefault()
                    document.getElementById(fieldId(field))?.focus()
                  }}
                >
                  {errorFor(field)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {formMessage ? (
        <p className="form-error" role="alert">
          {formMessage}
        </p>
      ) : null}

      <div className="form-grid">
        <div className="form-grid__wide">
          <Field id={fieldId('title')} label="Title" hint="3–80 characters." error={errorFor('title')}>
            <input
              type="text"
              autoComplete="off"
              value={values.title}
              {...props('title', '3–80 characters.')}
            />
          </Field>
        </div>

        <Field id={fieldId('type')} label="Session type" error={errorFor('type')}>
          <select value={values.type} {...props('type')}>
            {SESSION_TYPES.map((type: SessionType) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>

        <Field id={fieldId('coachId')} label="Coach" error={errorFor('coachId')}>
          {coaches.status === 'loading' ? (
            <select disabled value="" id={fieldId('coachId')} aria-busy="true">
              <option value="">Loading coaches…</option>
            </select>
          ) : coaches.status === 'error' ? (
            <ErrorState
              title="Coaches can't be loaded right now."
              message={coaches.error?.message}
              onRetry={coaches.retry}
            />
          ) : (
            <select value={values.coachId} {...props('coachId')}>
              <option value="">Select a coach…</option>
              {coaches.data?.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field id={fieldId('date')} label="Date" error={errorFor('date')}>
          <input
            type="date"
            autoComplete="off"
            min={todayLocalDate(now)}
            value={values.date}
            {...props('date')}
          />
        </Field>

        <Field id={fieldId('time')} label="Start time" error={errorFor('time')}>
          <input type="time" autoComplete="off" value={values.time} {...props('time')} />
        </Field>

        <Field
          id={fieldId('durationMinutes')}
          label="Duration (minutes)"
          hint="30–240."
          error={errorFor('durationMinutes')}
        >
          <input
            type="number"
            inputMode="numeric"
            autoComplete="off"
            value={values.durationMinutes}
            {...props('durationMinutes', '30–240.')}
          />
        </Field>

        <Field
          id={fieldId('capacity')}
          label="Capacity"
          hint="1–100 places."
          error={errorFor('capacity')}
        >
          <input
            type="number"
            inputMode="numeric"
            autoComplete="off"
            value={values.capacity}
            {...props('capacity', '1–100 places.')}
          />
        </Field>

        <div className="form-grid__wide">
          <Field
            id={fieldId('locationName')}
            label="Location name"
            error={errorFor('locationName')}
          >
            <input
              type="text"
              autoComplete="off"
              value={values.locationName}
              {...props('locationName')}
            />
          </Field>
        </div>

        <div className="form-grid__wide">
          <Field
            id={fieldId('locationAddress')}
            label="Location address"
            error={errorFor('locationAddress')}
          >
            <input
              type="text"
              autoComplete="off"
              value={values.locationAddress}
              {...props('locationAddress')}
            />
          </Field>
        </div>

        <fieldset className="form-grid__wide radio-group">
          <legend>Visibility</legend>
          {VISIBILITIES.map((visibility: Visibility) => (
            <label key={visibility} className="radio">
              <input
                type="radio"
                name="visibility"
                value={visibility}
                checked={values.visibility === visibility}
                onChange={update('visibility')}
              />
              {VISIBILITY_LABELS[visibility]}
            </label>
          ))}
        </fieldset>

        <div className="form-grid__wide">
          <Field id={fieldId('description')} label="Description (optional)">
            <textarea rows={3} value={values.description} {...props('description')} />
          </Field>
        </div>

        <div className="form-grid__wide">
          <Field
            id={fieldId('trainerNotes')}
            label="Trainer notes (optional)"
            hint={`${values.trainerNotes.length} / ${NOTES_LIMIT}`}
            error={errorFor('trainerNotes')}
          >
            <textarea
              rows={3}
              value={values.trainerNotes}
              {...props('trainerNotes', `${values.trainerNotes.length} / ${NOTES_LIMIT}`)}
            />
          </Field>
        </div>
      </div>

      {!coachesReady && coaches.status !== 'loading' ? (
        <p className="muted" id="create-blocked">
          Coaches must load before you can create a session.
        </p>
      ) : null}

      {confirmingDiscard ? (
        <div className="form-actions form-actions--confirm" role="alert">
          <p>Discard this session? Your entries will be lost.</p>
          <button type="button" className="button" onClick={onKeepEditing}>
            Keep Editing
          </button>
          <button type="button" className="button button--danger" onClick={onDiscard}>
            Discard
          </button>
        </div>
      ) : (
        <div className="form-actions">
          <button
            type="submit"
            className="button button--primary"
            aria-disabled={pending || !coachesReady}
            aria-describedby={!coachesReady && coaches.status !== 'loading' ? 'create-blocked' : undefined}
          >
            {pending ? 'Creating…' : 'Create Session'}
          </button>
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
      <p className="visually-hidden" role="status">
        {pending ? 'Creating session…' : ''}
      </p>
    </form>
  )
}
