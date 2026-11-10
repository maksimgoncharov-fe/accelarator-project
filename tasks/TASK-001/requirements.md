# TASK-001: Training Sessions Workspace (frontend assessment slice)

Source: `frontend-accelerator-assessment/FRONTEND_ASSESSMENT_SPEC.md`, with `API_CONTRACT.md` and `MOCKING_GUIDE.md` as the external contract.
Application Root: Repository Root (single frontend candidate: root `package.json`, React 19 + Vite + MSW 2.14.6).

## Goal

Deliver a frontend-only workspace where a training-business operator can find, inspect, and create scheduled training sessions. All data comes from ordinary HTTP calls to `/api/*`, served by MSW behind a replaceable client boundary. No backend.

## Users And Outcome

Primary user: a busy trainer running several basketball programs with multiple coaches and locations. They scan schedules repeatedly, resolve capacity questions, and create sessions. Outcome: one workspace replaces the calendar, spreadsheets, and chat, and it also shows cancelled and recently completed sessions. The UI favors fast scanning and predictable actions over decoration.

## Acceptance Criteria

### Sessions workspace
- [ ] A navigable sessions view lists each session's title, type, status, start time, duration, coach, location, capacity, and booked count.
- [ ] Search matches title, coach name, or location, case-insensitively. It is applied by `GET /api/sessions` (`query`), not by filtering client-side.
- [ ] A single-status filter (`scheduled`, `full`, `cancelled`, `completed`) is applied via the `status` query parameter.
- [ ] "Clear filters" resets all active filters and search.
- [ ] Each of the four statuses is distinguishable without relying on color (text label and/or icon).
- [ ] Opening a session does not lose the list context (search and status are retained on return).
- [ ] Times are shown in the user's local timezone.

### Session details
- [ ] Shows all list fields plus description, trainer notes, capacity summary, coach contact summary (name and email), and created and last-updated timestamps.
- [ ] Cancelled sessions show cancellation information when present.
- [ ] Keyboard accessible, deep-linkable when the router permits, and closing or returning restores the previous list state.
- [ ] A details request failure shows a recoverable error state, and a `404 SESSION_NOT_FOUND` is handled.

### Create session
- [ ] The form has: title, type, date, start time, duration, coach, location name, location address, capacity, visibility, optional description, optional trainer notes.
- [ ] Validation messages appear next to their controls and are programmatically associated with them:
  - title is 3–80 trimmed characters;
  - date and time resolve to a future start in the local timezone;
  - duration is an integer from 30 to 240;
  - capacity is an integer from 1 to 100;
  - coach is required;
  - location name is 2–80 trimmed characters;
  - location address is 3–120 trimmed characters;
  - trainer notes are at most 500 characters.
- [ ] Local date and time is converted to an ISO 8601 UTC `startsAt` in the request.
- [ ] Duplicate submission is prevented while pending, and the pending state is visible.
- [ ] A server `400 VALIDATION_FAILED` maps `fieldErrors` to fields and shows a form-level error where useful.
- [ ] A `500 CREATE_SESSION_FAILED` shows a form-level error and preserves all entered values.
- [ ] Success is explicit and announced. The created session is discoverable. If active filters would hide it, the user gets a clear action to open it or to reset the relevant filters.
- [ ] If the coaches request fails, the form shows an error and does not allow submission with an unverified coach selection (with a retry).
- [ ] The client does not invent idempotency guarantees.

### Required UI states (each observable and testable)
- [ ] Initial loading.
- [ ] Populated list.
- [ ] No sessions exist (empty scenario).
- [ ] Filters produce no matches, with a clear-filters action.
- [ ] List request fails.
- [ ] Details request fails.
- [ ] Coaches request fails.
- [ ] Create pending, success, validation failure, and server failure.

### Mock boundary (MSW)
- [ ] Handlers for `GET /api/sessions`, `GET /api/sessions/:id`, `GET /api/coaches`, and `POST /api/sessions`, matching `API_CONTRACT.md`.
- [ ] `meta.total` is computed after filtering. Response metadata keeps `page: 1` and `pageSize: 10`.
- [ ] Create is stateful in memory: the new session appears in later list and details reads and uses the selected coach from the coaches fixture.
- [ ] The mock validates the create request (required fields, coachId, positive duration and capacity, enums, valid ISO timestamp) and returns `400 VALIDATION_FAILED` with `fieldErrors`.
- [ ] Required scenarios are supported: `normal`, `empty`, `list-error`, `details-error`, `coaches-error`, `create-error` (from `fixtures/mock-scenarios.json`).
- [ ] Scenario selection lives only at the mock boundary. Components and the API client never branch on scenario names.
- [ ] Fixture clock: at mock startup, every `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt` is shifted by (actual now − `referenceNow`). Components see ordinary ISO strings.
- [ ] Components and the client do not import fixture JSON. The app runs without network access.

### Responsive and accessibility
- [ ] Usable at 1440×900 and 390×844 with no horizontal page scroll, overlap, or unreachable content or actions. The mobile list may use a different representation.
- [ ] Complete keyboard operation, visible focus, semantic controls and labels, useful page and section headings.
- [ ] Status changes and mutation feedback are announced (live regions).
- [ ] Non-color status indicators and sufficient contrast.
- [ ] Reduced-motion preference is respected if motion is used.

### Engineering and evidence
- [ ] Transport calls are centralized behind an API client. Request and server state has a single deliberate owner. Dates are parsed and normalized at a clear boundary.
- [ ] No data library is added merely because the rules mention React patterns. Any added dependency has a recorded reason and trade-off.
- [ ] Automated tests (4–6 focused, behavior-level) cover: search and status filtering; create validation and success; create server failure preserving input; initial loading; empty and no-match states; one list or details error state.
- [ ] Browser evidence for desktop and mobile populated screenshots; create, empty, and representative error flows; console, page-error, and failed-network observations (see `EVIDENCE_PROTOCOL.md`).
- [ ] No uncaught console errors in the primary flows. A documented project command starts the app.
- [ ] `frontend-accelerator-assessment/` remains unchanged.

## Constraints

- React 19, TypeScript ≥5.9, Vite ≥7, npm; `msw@2.14.6`.
- Do not rewrite unrelated source or configuration.
- Do not change the contract (paths, fields, error codes) silently. Proposed contract changes are recorded separately and need evaluator approval.
- No secrets, real personal data, analytics, or credentials.
- Visual direction: `designs/DESIGN_TOKENS.md` and `sessions-dashboard-reference.svg` (hierarchy and density only, not pixel-perfect). Operational tool: no hero content, decorative gradients, or deep card nesting.
- i18n is out of scope. Centralizing copy is optional.
- Requirements and a file-level plan must exist before production implementation.

## Non-Goals

Backend; authentication or registration; payments; real notifications; drag-and-drop calendar; recurring sessions; attendee management; organization administration; deployment; replacing the brief; implementing every optional idea.

Optional extensions (do not count toward required behavior): session-type filter, URL sync of filters, pagination, cancellation (403/409), read-only permissions, background refresh, tablet verification, `create-conflict` and other optional scenarios, optimistic updates, extra tests, calendar or saved-filter views.

## Facts

- The repository root is the only frontend application. `package.json` already lists react ^19.3.1, msw 2.14.6, vite ^8.3.6, and typescript ~7.0.2.
- `tasks/` and `specs/` had no prior content, so this is TASK-001.
- The contract fixes: 5 fixture sessions, 5 matching details fixtures, `GET /api/sessions` params `query` and `status`, and a `SessionStatus` of scheduled, full, cancelled, or completed.
- The create response is `SessionDetails`. Both location name and address are required.

## Assumptions

- A1: Router choice is deferred to the architect. Deep-linkable details are only required "when the router permits", so a router is not assumed.
- A2: The "future start" check compares against the browser's current time at submit, in local timezone.
- A3: Search is applied on the server and sent as a query parameter. Debouncing is a design detail and not required.
- A4: Whether a "full" session is derived (bookedCount ≥ capacity) or taken from the API `status` follows the API value. The UI does not recompute it.
- A5: Mock scenario selection mechanism is unspecified (e.g. a dev-only query flag or env). The architect decides it, and it must stay at the mock boundary.
- A6: The details experience form (route, drawer, or modal) is left to the ui-designer and architect.

## Open Questions

1. (architect) How is the active scenario selected, and how are tests and browser verification expected to switch it?
2. (architect) Routing approach and whether list state (filters) lives in URL, given URL sync is optional but the "return to previous list state" requirement is mandatory.
3. (ui-designer) Details presentation (route, drawer, or modal), the mobile list representation, and non-color status markers.
4. (ui-designer, api-integration) How the post-create "open it or reset filters" action behaves when the new session is hidden by filters.
5. (api-integration) The test stack is not in `package.json` (no test runner). Which one should be added, with a recorded reason? This needs human approval for the dependency trade-off.
6. (human) Which runtime or hook status and setup evidence must be recorded for Doctor, per `EVIDENCE_PROTOCOL.md`? Out of scope for requirements, noted for the evidence trail.

None of these block planning beyond architecture and UI decisions.

## Readiness

Requirements are complete and testable. Product behavior is not ambiguous, so `brainstorm` is not needed. Architecture decisions (Q1, Q2, Q5) and UI decisions (Q3, Q4) remain open.

Recommended next steps: `architect` (state ownership, router, scenario selection, test stack), `ui-designer` (details presentation, responsive layout, status indicators), and optionally `api-integration` (client boundary and date normalization). Then `writing-plans`.
