# TASK-001 API Integration: Frontend Client Boundary

Inputs: `API_CONTRACT.md` (fixed for the assessment; treated as the confirmed contract), `MOCKING_GUIDE.md`, `fixtures/*`, `requirements.md`, `architecture.md` (D2 to D4, D7), `ui-design.md`. Common api-integration rules applied. There are no Framework or Project rules and no existing client code (`src/` is the Vite scaffold).

Authority note: the "backend" here is the supplied contract plus MSW. Where the contract is silent, the item is labelled **assumed** (frontend convention, safe if wrong) or **proposed** (mock behavior needing evaluator confirmation). Nothing below changes paths, fields, or error codes. Any contract change would be recorded in a separate proposal file, and none is proposed.

## 1. Contract Classification

| Element | Class | Notes |
| --- | --- | --- |
| `GET /api/sessions` with `query`, `status` | confirmed | Handler applies both before `meta.total`. Client never filters locally. |
| `GET /api/sessions/:sessionId` | confirmed | 200 `SessionDetails`, errors 404 `SESSION_NOT_FOUND`, 500 `SESSION_DETAILS_UNAVAILABLE`. |
| `GET /api/coaches` | confirmed | 200 `{ data: CoachSummary[] }`, 500 `COACHES_UNAVAILABLE`. |
| `POST /api/sessions` request and 201 `SessionDetails` | confirmed | 400 `VALIDATION_FAILED` (with `fieldErrors` "where available"), 500 `CREATE_SESSION_FAILED`. |
| `ApiError` envelope `{ error: { code, message, fieldErrors? } }` | confirmed | Used for every documented error status. |
| All timestamps ISO 8601 UTC strings | confirmed | Displayed in local timezone. |
| `meta: { page: 1, pageSize: 10, total }` | confirmed | Required response retains page 1 and pageSize 10. |
| `400 INVALID_FILTER` | confirmed code, **assumed** trigger | Contract says "malformed query parameter". Assumed trigger: `status` not one of the four values. The client never sends one (see §3), so this is only reachable via a hand-edited URL, which the URL-state layer sanitizes first. |
| Search "location" scope | **assumed** | Contract says it searches "title, coach name, and location". Assumed: location name and address, case-insensitive substring. Mock-side only. |
| `fieldErrors` keys | **assumed** | Contract gives `Record<string,string>` without key names. Assumed to be `CreateSessionRequest` property names (`title`, `startsAt`, `durationMinutes`, `coachId`, `locationName`, `locationAddress`, `capacity`, `trainerNotes`, and so on). Unknown keys are shown in the form-level message, not dropped. |
| Order of list results | **assumed** | Contract silent. The client renders API order and never sorts. Mock: fixture order, created sessions appended. |
| Created session defaults | **proposed (mock)** | Contract says "generated identifiers and timestamps" only. Mock sets `status: "scheduled"`, `bookedCount: 0`, `cancellation: null`, `createdAt = updatedAt = now`, `id` = `ses_` + generated suffix, coach copied from `coaches.json`. Blank optional text is stored as `null`. |
| List when total > pageSize | **blocked / proposed** | Pagination is optional, but after 6+ creates the in-memory list exceeds 10. Contract does not say whether `data` is truncated. Proposed mock behavior: return the first 10 in API order, `meta.total` is the full filtered count. The client shows "Showing 10 of N sessions" when `meta.total > data.length`. Needs evaluator confirmation (§8, Q1). |
| Request timeout, retry, caching, idempotency | not in contract | Client does not invent any (see §4). |
| Optional: cancel endpoint, `409 COACH_SCHEDULE_CONFLICT`, permissions | optional, out of scope | The client maps unknown 4xx/5xx generically, so a future 409 renders as a form-level error without structural change. |

## 2. Client Boundary (matches architecture D3)

Single module `src/api/`, the only code that calls `fetch`. Files and responsibilities:

| File | Responsibility |
| --- | --- |
| `types.ts` | Contract types verbatim from `API_CONTRACT.md` (wire types), plus view-model types (below). |
| `errors.ts` | `ApiClientError` and `toApiClientError`. |
| `http.ts` | One private `request<T>(method, path, { query, body, signal })` helper: builds URL, sets `Accept` and `Content-Type: application/json` (when a body exists), calls `fetch`, parses JSON, throws `ApiClientError` on non-2xx or malformed data. |
| `parse.ts` | Pure response normalizers (wire to view model) with structural checks. |
| `sessions.ts` | The four public functions. |
| `index.ts` | Re-exports the public functions and `ApiClientError`. |

Public surface (the only thing hooks import):

```ts
listSessions(params: { query?: string; status?: SessionStatus }, signal?: AbortSignal): Promise<SessionsPage>
getSession(id: string, signal?: AbortSignal): Promise<SessionDetailsView>
listCoaches(signal?: AbortSignal): Promise<CoachSummary[]>
createSession(input: CreateSessionInput, signal?: AbortSignal): Promise<SessionDetailsView>
```

- **Base path**: the constant `/api` lives in `http.ts` only. Replacing MSW with a real backend means changing this constant (or proxying in Vite), and nothing else.
- **No scenario knowledge**: no header, query param, or import references scenarios or fixtures. The client sends nothing a real backend would not accept (no custom headers, no credentials handling, since authentication is out of scope).
- **Dependency rule**: `components -> hooks -> api`. Hooks never call `fetch` or construct URLs. Components never import `api/` directly. `api/` imports nothing from `features/`, `mocks/`, or React.

### Request building

| Call | Rule |
| --- | --- |
| `listSessions` | `query` is trimmed and sent only when non-empty. `status` is sent only when it is one of the four known values. Built with `URLSearchParams` (encoded). Default (no filters) sends no query string. |
| `getSession` | `encodeURIComponent(id)` in the path. |
| `createSession` | Body is JSON of `CreateSessionRequest`: strings trimmed, `durationMinutes` and `capacity` as integers, `startsAt` as UTC ISO string from the single local-to-UTC function (architecture D3), `description` and `trainerNotes` omitted when blank after trim. Single attempt, never automatically retried. |

`CreateSessionInput` (form-facing) is the contract's `CreateSessionRequest` shape. Conversion from form fields (date + time strings) to `startsAt` is done by the pure `model/` function before the call, so `api/` only serializes.

### Response normalization (wire to view model)

- Wire types: contract types as-is. View-model types add parsed dates:
  - `SessionSummaryView`: contract fields, with `startsAt`, `updatedAt` as `Date`.
  - `SessionDetailsView`: summary plus `description`, `trainerNotes`, `createdAt: Date`, `cancellation: null | { reason; cancelledAt: Date }`.
  - `SessionsPage`: `{ items: SessionSummaryView[]; page; pageSize; total }`.
- Each normalizer checks required fields' types (string, number, known enum values) and that dates parse (`Number.isNaN(date.getTime())` fails). A failure throws `ApiClientError` with `code: "MALFORMED_RESPONSE"`. No schema library is added (no new dependency).
- The client does not recompute `status` (for example "full" from bookedCount). It trusts the API value (requirements A4).
- Unknown extra fields are ignored. Unknown enum values are treated as malformed (the UI cannot render a badge for them safely).

### Error mapping

`ApiClientError { status: number | null; code: string; message: string; fieldErrors?: Record<string,string>; kind }`

| Source | `kind` | `code` | `message` |
| --- | --- | --- | --- |
| Non-2xx with valid `ApiError` body | `api` | server `code` | server `message` |
| Non-2xx, body not valid JSON or not an `ApiError` | `api` | `HTTP_<status>` | generic, "The server returned an unexpected response." |
| 2xx but malformed body | `malformed` | `MALFORMED_RESPONSE` | "The server response could not be understood." |
| `fetch` rejects (offline, service worker not ready) | `network` | `NETWORK_ERROR` | "Network request failed. Check your connection and try again." |
| `AbortError` | `aborted` | `ABORTED` | none. Hooks ignore it, and it is never shown. |

Server `message` is displayed as returned (it is user-facing by contract). Stack traces, URLs, and raw bodies are never surfaced. `fieldErrors` is kept only on `VALIDATION_FAILED` and any 4xx that carries it.

## 3. Frontend Integration Plan

| Concern | Decision |
| --- | --- |
| Cancellation | Each hook creates an `AbortController` per request. A new request (filter change, retry, unmount, id change) aborts the previous one. `aborted` errors never reach state. This is the stale-response protection from architecture D2. |
| Retry | Manual only: "Try again" buttons re-run the same request. No automatic retries and no backoff, because the contract defines none and mutations must not be replayed. |
| Timeout | None invented. Failure is surfaced by the server or network. (Open Q3 if the evaluator wants one.) |
| Caching | None. Every list or details view issues a fresh GET. Re-opening the same session refetches, and the details hook shows loading, then data. No cross-hook cache means no stale-data synchronization to reason about. |
| Dedupe | In-flight GETs are not shared between hooks. Each resource has exactly one owner hook (architecture D2). Mutation dedupe: `useCreateSession` ignores calls while `pending`. No idempotency key is sent. |
| Invalidation | After a successful `createSession`, the list owner refetches with the current filters. Details of the created session is not prefetched, and it is fetched on open (the 201 body is also retained for the post-create banner title). |
| Stale-while-refetch | The list keeps previous items during refetch (`status: "success", refreshing: true`). Initial load and a retry after an error show the loading state. |
| Search input | The URL-state layer debounces (300ms), sanitizes `status`, and the hook receives only valid filters. |
| Coaches | Fetched when the create view opens and re-fetched on each open (no cache). Retry button re-fetches. |
| Hidden-by-filters | Computed after the post-create list refetch resolves: `!items.some(i => i.id === createdId)`. If the refetch fails, the banner shows "Open session" only, and the list error state covers recovery. |
| Mock-only concerns | Fixture rebasing, scenario selection, latency, and in-memory store live in `src/mocks/` only (architecture D4). |

### Mock handler contract (classified expectations for `src/mocks/`)

| Handler | Behavior | Class |
| --- | --- | --- |
| `GET /api/sessions` | Filter by `query` (title, coach name, location name or address, case-insensitive substring) and exact `status`. Compute `meta.total` after filtering. Invalid `status` gives `400 INVALID_FILTER`. First 10 items. | confirmed + assumed + proposed |
| `GET /api/sessions/:id` | Details from the store (fixture details plus created sessions). Unknown id gives `404 SESSION_NOT_FOUND`. | confirmed |
| `GET /api/coaches` | `coaches.json`. | confirmed |
| `POST /api/sessions` | Validate: required fields, trimmed lengths per the product spec, `coachId` exists, integer `durationMinutes` (30–240) and `capacity` (1–100), enum values, valid ISO `startsAt`, trainer notes ≤500. Return `400 VALIDATION_FAILED` with `fieldErrors`. Whether a past `startsAt` is rejected is **proposed: yes**, with a `fieldErrors.startsAt` error, which matches the product rule. On success return 201 as in §1. | confirmed + proposed |
| Scenario overrides | `empty`, `list-error`, `details-error` (only `ses_101`), `coaches-error`, `create-error` replace the corresponding response with the body from `mock-scenarios.json`. `normal` adds 250ms latency. | confirmed |
| Fixture clock | Rebase `startsAt`, `createdAt`, `updatedAt`, `cancelledAt` once at module load. Created sessions use the real (or frozen test) clock. | confirmed |

The mock handler is not the client. The client's validation of response shape is the same whether the response comes from MSW or a real server.

## 4. State And Error Matrix

Legend: **UI** references `ui-design.md` states. "Preserves" means previously shown data stays visible.

### GET /api/sessions (list owner hook)

| Situation | Trigger | Hook state | `ApiClientError` | UI behavior |
| --- | --- | --- | --- | --- |
| Initial load | First request, no data | `loading` | none | Skeleton rows, "Loading sessions…" status. |
| Success, items | 200, `data.length > 0` | `success` | none | Table or mobile list, "N sessions" from `meta.total`. |
| Success, truncated | 200, `meta.total > data.length` | `success` | none | "Showing 10 of N sessions" (see Q1). |
| Success, empty, no filters | 200, `total 0`, no query and no status | `success` (empty) | none | "No sessions yet" with a Create action. |
| Success, empty, filtered | 200, `total 0`, any filter active | `success` (empty) | none | "No sessions match your filters" with Clear filters. |
| Filter change | URL param change | `success` + `refreshing` (prior data kept) | none | "Updating…" with `aria-busy`. Superseded request aborted. |
| Server error | 500 `SESSIONS_UNAVAILABLE` | `error` | `api / SESSIONS_UNAVAILABLE` | In-region error with the server message, Try again. If prior data exists, it is preserved with an inline error banner. |
| Invalid filter | 400 `INVALID_FILTER` | `error` | `api / INVALID_FILTER` | Same as server error. Normally unreachable (inputs are sanitized). |
| Network failure | fetch rejects | `error` | `network / NETWORK_ERROR` | Same region, network message, Try again. |
| Malformed body | 200 with wrong shape | `error` | `malformed / MALFORMED_RESPONSE` | Same region, generic message, Try again. |
| Superseded or unmounted | AbortController | unchanged | `aborted` (swallowed) | Nothing shown. |
| Retry | Try again click | `loading` (no prior data) or `refreshing` | none | Re-issues with current filters. |

### GET /api/sessions/:id (details owner hook)

| Situation | Trigger | Hook state | Error | UI behavior |
| --- | --- | --- | --- | --- |
| Loading | `session` param set or changed | `loading` | none | Details skeleton, "Loading session…". |
| Success | 200 | `success` | none | Full details. Missing description or notes shown as "None added". |
| Not found | 404 `SESSION_NOT_FOUND` | `error` | `api / SESSION_NOT_FOUND` | "This session no longer exists." Back to sessions. No retry. |
| Server error | 500 `SESSION_DETAILS_UNAVAILABLE` | `error` | `api / SESSION_DETAILS_UNAVAILABLE` | Error with Try again and Back. The list stays usable. |
| Network or malformed | as list | `error` | `network` / `malformed` | Same as server error. |
| Id changes mid-flight | click another row | `loading` | `aborted` (swallowed) | Prior request discarded, new loading state. |

### GET /api/coaches (coaches owner hook)

| Situation | Hook state | Error | UI behavior |
| --- | --- | --- | --- |
| Create view opened | `loading` | none | Coach select disabled, "Loading coaches…". Submit aria-disabled. |
| Success | `success` | none | Select populated. An empty `data` array shows "No coaches available." and keeps Submit blocked (a coach is required). |
| 500 `COACHES_UNAVAILABLE` | `error` | `api / COACHES_UNAVAILABLE` | Inline error with Retry replaces the select. Submit aria-disabled with explanation. The rest of the form stays editable. |
| Network or malformed | `error` | `network` / `malformed` | As above. |
| Create view closed mid-flight | unchanged | `aborted` (swallowed) | Nothing shown. |

### POST /api/sessions (mutation owner hook)

| Situation | Trigger | Hook state | Error | UI behavior |
| --- | --- | --- | --- | --- |
| Client validation fails | Submit with invalid values | `idle` (no request) | none | Field errors, summary, focus on the first error. |
| Pending | Valid submit | `pending` | none | "Creating…", repeated submits ignored by the hook. |
| Success | 201 | `success` (holds created `SessionDetailsView`) | none | Dialog closes, list refetch, post-create banner. |
| Server validation | 400 `VALIDATION_FAILED` + `fieldErrors` | `error` | `api` with `fieldErrors` | Map known keys to fields, summary, focus first. Unknown keys go in the form-level message. Values preserved. |
| Server validation, no `fieldErrors` | 400 `VALIDATION_FAILED` | `error` | `api`, no `fieldErrors` | Form-level alert with the server message. Values preserved. |
| Server failure | 500 `CREATE_SESSION_FAILED` | `error` | `api / CREATE_SESSION_FAILED` | Form-level alert, "Your entries are kept. Try again." Values preserved, resubmit allowed. |
| Optional conflict | 409 `COACH_SCHEDULE_CONFLICT` | `error` | `api / COACH_SCHEDULE_CONFLICT` | Handled by the generic form-level alert with the server message (no dedicated UI). Out of scope. |
| Network failure | fetch rejects | `error` | `network / NETWORK_ERROR` | Form-level alert. Because the outcome is unknown, the copy says "We couldn't confirm the session was created. Check the list before trying again." No automatic retry (no idempotency in the contract). |
| Malformed 201 | 2xx, bad shape | `error` | `malformed / MALFORMED_RESPONSE` | Same copy as a network failure (outcome uncertain). |
| Form closed while pending | user cancels | request not aborted | n/a | The create request is allowed to finish (aborting does not guarantee the server did not process it). The result is shown through the banner if success, or ignored if failure. Open Q2. |
| Retry after error | resubmit | `pending` | none | State resets to `pending`. Prior form-level error cleared. |

### Cross-cutting

| Situation | Behavior |
| --- | --- |
| Service worker not ready | Startup awaits `worker.start()` before render (architecture D4). If requests still fail, they surface as `network`. |
| Unexpected non-API status (e.g. 502 HTML page) | `api / HTTP_502`, generic message, same recovery UI as 500. |
| Sensitive data | Errors never include request bodies. Console logging of errors is limited to `code` and `status`. No credentials, analytics, or personal data are sent. |
| Permissions (401/403) | Not part of the required contract. Treated by the generic mapping if ever returned. |

## 5. Test Strategy

Uses the stack selected in architecture D2/D7: Vitest, jsdom, Testing Library, MSW `setupServer` with the same handlers and scenario table as the browser. The clock is frozen at the fixture `referenceNow` before the mock module loads so rebasing is the identity transform in tests, and tests can assert exact dates.

| Layer | Focus | Examples |
| --- | --- | --- |
| `api/` unit (pure, fast) | Request building, error mapping, normalization | `listSessions` omits empty query, drops unknown status, and encodes special characters. `createSession` trims and omits blank optional fields. Malformed 200 gives `MALFORMED_RESPONSE`. Non-JSON 500 gives `HTTP_500`. Aborted request gives `aborted`. |
| Behavior (component with MSW) | The six required scenarios through the real UI | Required tests from the requirements: search and status filtering (server-side filtering visible through `meta`-driven count), create validation and success, create 500 preserving input, initial loading, empty and no-match, one list or details error. |
| Contract guard | Handlers match the contract | A small test that `GET /api/sessions?status=full` returns only `full` items with `total` reflecting the filter, and `POST` then `GET` shows the created session (stateful create). |
| Not tested by automation | Real backend, timeout behavior, optional scenarios | Recorded as unverified in the final verdict. |

The four to six focused tests budget from the spec applies. The api unit and contract guard tests are small additions only if the budget and risk justify them (the `coder` decides).

## 6. Handoff Guidance

- `writing-plans`: sequence `api/` and `mocks/` before hooks. They are independently testable.
- `coder`: keep wire types and view-model types in separate declarations so a backend swap cannot leak wire shapes into components.
- `ui-designer` (already handed over): `ui-design.md` needs no change except the optional "Showing 10 of N" copy if Q1 is confirmed.

## 7. Contract Change Proposals

None. No endpoint, field, status, or error code is added or altered. The assumed and proposed behaviors in §1 are mock-side or client-side conventions.

## 8. Unresolved Questions And Required Confirmation

| # | Question | Owner | Blocking? |
| --- | --- | --- | --- |
| Q1 | When the in-memory filtered list exceeds `pageSize` 10 (after six or more creates), should `data` be truncated to 10 with the full `total`, or return everything? Proposed: truncate plus "Showing 10 of N". | Evaluator (contract owner) | No. Behavior is only reachable after repeated creates, and the client handles both. |
| Q2 | Should closing the create dialog while a request is pending abort it? Proposed: no, let it finish (see matrix). | Human (product) | No. |
| Q3 | Is a client-side timeout desired? The contract defines none, so none is implemented. | Evaluator | No. |
| Q4 | Confirm the assumed `fieldErrors` key names and that the mock rejects a past `startsAt` with `fieldErrors.startsAt`. | Evaluator | No. Unknown keys fall back to the form-level message. |

No blocking backend clarification is required.

## 9. Specs

`specs/api-integration.md` is not created or updated. Nothing here is implemented or verified yet, and the assumed and proposed items must not be promoted to confirmed integration truth.
