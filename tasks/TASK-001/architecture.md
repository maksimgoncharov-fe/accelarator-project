# TASK-001 Architecture Decisions

Scope: only the decisions needed by `requirements.md` (open questions 1, 2, 5, plus the state-ownership and boundary decisions they depend on). Visual and layout decisions (Q3, Q4 presentation) belong to `ui-designer`. Endpoint authority stays with the supplied `API_CONTRACT.md`.

## Repository Evidence

- Single frontend app at the Repository Root. `src/` is the untouched Vite scaffold (`main.tsx`, `App.tsx`, CSS, sample assets). No existing modules, routing, state, or tests, so there are no patterns to preserve.
- `package.json`: react ^19.3.1, msw 2.14.6, vite ^8, typescript ~7, oxlint. No router, data library, or test runner.
- Rulesets applied: common/architect (boundaries, state and failure flow), framework/architect (lift state, decouple state from UI, context interface). No project rules exist.
- Third-party documentation lookup (ctx7) was not needed. Decisions rely on repository evidence and the supplied contract.

## Human-selected decisions (dependency choices)

| # | Choice | Selected by |
| --- | --- | --- |
| D1 | No router library. Use an in-house URL-state module. | human |
| D2 | Vitest + Testing Library + jsdom for tests (dev dependencies). | human |

## Decisions

### D1. Navigation and list-state ownership: URL is the owner

- Decision: the browser URL is the single source of truth for list filters and the open session. Search params: `q`, `status`, `session=<id>`, and `new=1` for the create view. A small `useUrlState` module (History API, `popstate`, `URLSearchParams`) exposes parsed values and setters. No router dependency.
- Rationale: this satisfies "deep-linkable" and "return to the previous list state" with one owner and no duplicated state. Back/forward and reload work natively. Optional URL sync of filters comes for free.
- Rules: invalid or unknown `status` values are ignored (treated as empty). Opening details or create uses `pushState` and closing uses `history.back()` when the previous entry is in-app, otherwise `replaceState` to the list URL. Typing in search uses `replaceState` (debounced) to avoid history spam. Selecting a status uses `pushState`.
- Rejected: react-router (extra dependency and API for three views); component-local filter state (loses list context on reload and deep links).
- Risk: hand-rolled history handling. Mitigation is to keep it in one small file with unit-level behavior tests, and no other code touches `window.history`.

### D2. Server-state ownership: feature-scoped hooks, no data library

- Decision: no data library. Each remote resource has one owner hook inside the sessions feature, returning a discriminated state (`loading | success | error`) plus a `retry`:
  - `useSessionsList(filters)` owns the list request and refetches when URL filters change.
  - `useSessionDetails(id)` owns the details request.
  - `useCoaches()` owns the coaches request, loaded when the create view opens.
  - `useCreateSession()` owns the mutation state: `idle | pending | success | error` (with `fieldErrors`).
- Rules:
  - Stale-response protection with `AbortController` per request, so superseded filter changes cannot overwrite newer results.
  - During refetch, keep prior data visible with a non-blocking "updating" indicator. Initial load shows the loading state.
  - After successful create: do not patch the list locally. Set the details view to the created session (the 201 body is `SessionDetails`) and trigger a list refetch. This keeps the server as the list's source of truth.
  - Hidden-by-filters check: after the refetch, if the new id is not in the filtered result, the UI offers "Open session" and "Reset filters" (presentation owned by `ui-designer`). The data layer exposes a boolean derived from the refetched list.
  - The create form does not submit while coaches are not `success`.
  - Duplicate-submit guard: the mutation hook ignores calls while `pending`. The client generates no idempotency key.
- Rejected: TanStack Query or SWR (spec says not to add a data library without need, and four small hooks cover the needs); global store (no cross-feature shared state exists).

### D3. API client boundary

- Decision: a single `api/` module is the only code that calls `fetch`. It exposes typed functions (`listSessions`, `getSession`, `listCoaches`, `createSession`) against base path `/api`, with `AbortSignal` support.
- It parses responses into view-model types at this boundary: ISO strings to `Date` or a normalized representation, and `ApiError` to a typed `ApiClientError` (`status`, `code`, `message`, `fieldErrors`). Network failures map to the same error type with `code: "NETWORK_ERROR"`.
- Hooks consume only this module, and components consume only hooks. The client has no knowledge of MSW or scenarios.
- Contract types come from `API_CONTRACT.md`. Local view models may be added, but no request or response shape is changed. Contract-change proposals go into a separate task file.
- Dates: parse once in the client boundary. Display formatting uses `Intl.DateTimeFormat` in the local timezone in one `format` helper. The create form converts the local date and time to a UTC ISO `startsAt` in one function, and that function is also the single owner of the "must be in the future" check.

### D4. Mock boundary and scenario selection

- Decision: everything MSW lives in `src/mocks/`: handlers, in-memory store, fixture rebasing, and scenario resolution. Fixture JSON is imported only here (via Vite JSON imports of `frontend-accelerator-assessment/fixtures/*`, which stays unmodified).
- The browser worker starts in `main.tsx` before render, only in dev (`import.meta.env.DEV`) via dynamic import so mocks are not bundled elsewhere. `public/mockServiceWorker.js` is generated by `npx msw init public --save`.
- Scenario selection: the active scenario is read once at mock startup from a dev-only `?scenario=<name>` URL param, persisted for the session in `sessionStorage`, and defaulting to `normal`. Selection never leaves `src/mocks/`; neither the API client, hooks, nor components read it.
  - Why not env var: switching scenarios needs a rebuild or restart, which hurts browser verification.
  - Why not a header: it would put scenario knowledge in the client.
- The `?scenario` param is read by the mocks module directly from `window.location` at startup, separately from the app's `useUrlState`, which must preserve unknown params when it rewrites the URL (it keeps `scenario` untouched). This lets scenarios survive filter changes and reloads.
- Behavior: handlers implement the contract. Search and status filtering run in the handler before `meta.total`. Create is stateful in memory and validates the request. Per-scenario overrides replace the matching response using bodies from `mock-scenarios.json`. `normal` applies `defaultLatencyMs` (250ms), which makes loading states observable. `details-error` targets `ses_101` only, as the fixture specifies.
- Fixture clock: computed once at handler-module load (`now - referenceNow`) and applied to `startsAt`, `createdAt`, `updatedAt`, and `cancelledAt`. In tests, the clock is frozen before the mock module is initialised and the same transformation runs.
- Optional scenarios (`create-conflict`, `cancel-*`, `read-only`, `slow-refresh`, `unknown-session`) are out of scope, but the scenario table is data-driven so they can be added without structural change.

### D5. Module layout and dependency direction

```
src/
  main.tsx                 wiring: start mocks (dev), render App
  App.tsx                  shell: heading, layout, selects view from URL state
  app/url-state.ts         D1 (only code touching window.history)
  api/                     D3 (only code calling fetch): client.ts, types.ts, errors.ts, dates.ts
  features/sessions/
    hooks/                 D2 owner hooks
    components/            list, filters, details, create form, status badge
    model/                 view models, validation (pure), formatting
  mocks/                   D4 (MSW handlers, store, scenarios, fixture clock, browser/node setup)
```

- Direction: `components -> hooks -> api -> (HTTP)`. `model/` is pure and importable by all feature layers. `mocks/` is imported only by `main.tsx` (dev) and test setup. Nothing in `features/` or `api/` imports `mocks/` or fixtures.
- Validation lives in `model/` as pure functions, so the form and the tests share one implementation. The server's `fieldErrors` are merged for display per field. Local validation does not replace server validation.
- Feature code stays under `features/sessions/` until reuse is demonstrated. No shared UI library or global abstraction is introduced.

### D6. Failure containment and availability

- Each resource fails independently: list error, details error, and coaches error render within their own region with a retry, leaving the shell and other regions usable. `404 SESSION_NOT_FOUND` on details renders a distinct "not found" state with a link back to the list.
- A top-level React error boundary wraps the app shell as a last resort for render errors. It is not used for expected API failures.
- Mutation failure keeps the form mounted with its values (the form owns its draft state locally, since it is transient UI state). Server `400` maps `fieldErrors` to fields. Other failures show a form-level error.
- Announcements: one polite live region for list result count and success/pending feedback, and role="alert" for errors. Presentation details belong to `ui-designer`.

### D7. Test architecture

- Selected stack (D2 choice): Vitest, jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- Tests run against the real handlers via MSW `setupServer` in node, so they exercise the same contract as the browser. The test setup freezes the clock (fake timers set to `referenceNow`) and selects scenarios through a test-only function exported from `src/mocks/`, never through components.
- Tests assert behavior (queries by role and label), not hook internals. Target coverage matches the requirements: search and status filtering; create validation and success; create server failure preserving input; initial loading; empty and no-match; one list or details error.
- `npm test` is added as a script (`vitest run`). Vitest config lives in `vite.config.ts` (test block), with no other config changes.

## Dependencies Introduced (recorded reason and trade-off)

| Package | Type | Reason | Trade-off |
| --- | --- | --- | --- |
| vitest | dev | Vite-native runner, reuses existing config | New toolchain dependency |
| jsdom | dev | DOM environment for component tests | Not a real browser, so browser evidence is still required |
| @testing-library/react, user-event, jest-dom | dev | Behavior-level assertions by role and label | Adds three small packages |

`msw@2.14.6` is already installed. No runtime dependencies are added.

## Risks

1. Hand-rolled URL state could misbehave around back/forward. Mitigation: a single module with tests, and no other `history` use.
2. The Service Worker must be active before the first request, or the first fetch bypasses the mock. Mitigation: await `worker.start()` before rendering.
3. Reading fixtures from `frontend-accelerator-assessment/` via Vite requires the path to be importable. This is read-only, and the directory must remain unchanged. If Vite's `server.fs` restrictions block it, a decision to copy fixtures into `src/mocks/fixtures/` is needed (it would not modify the input directory). Verify during implementation.
4. Vitest with TypeScript ~7 and Vite 8 compatibility is not verified here. Confirm vitest's supported Vite range at install time. If incompatible, stop and report.
5. Debounced search can race with scenarios. Mitigation: the `AbortController` rule in D2.

## Implementation Implications

- `writing-plans` should sequence: dependencies and scripts, mock boundary, API client, URL state, hooks, components, tests.
- `ui-designer` receives these constraints: details and create are URL-addressable views over the list (`session=`, `new=1`); the list stays mounted behind a drawer or dialog; the post-create "hidden by filters" state is a boolean from the data layer.
- `api-integration` can verify the client boundary (D3) and the error mapping.
- `specs/architecture.md` and `specs/MANIFEST.md` are not updated yet, because nothing is implemented. Update them after verified implementation.

## Open Items

None blocking. Q3 and Q4 (presentation) remain with `ui-designer`. Q6 (Doctor evidence) remains a human item.
