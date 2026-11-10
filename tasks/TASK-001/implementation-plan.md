# TASK-001: Implementation Plan

Inputs: `requirements.md`, `architecture.md` (D1–D7), `ui-design.md`, `api-integration.md`, the repository as it stands, and `frontend-accelerator-assessment/` (read-only input). No writing-plans rules exist in `rulesets/`.

## Current Behavior

- Single frontend app at the Repository Root. `src/` is the unmodified Vite + React scaffold: `main.tsx` renders `App.tsx`, which is the "Get started" demo with `App.css`, `index.css`, and sample assets (`hero.png`, `react.svg`, `vite.svg`). `index.html` title is `accelarator-project`.
- `package.json`: runtime `react`, `react-dom`, `msw@2.14.6`. Dev: vite ^8, `@vitejs/plugin-react`, typescript ~7, oxlint, types. Scripts: `dev`, `build` (`tsc -b && vite build`), `lint` (`oxlint`), `preview`. No test runner and no `test` script.
- `tsconfig.app.json` constraints the code must respect: `include: ["src"]`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no `enum`, namespaces, or constructor parameter properties), `noUnusedLocals/Parameters`, `types: ["vite/client"]`, bundler resolution, `allowImportingTsExtensions`.
- `vite.config.ts` has only the React plugin. `public/` has `favicon.svg` and `icons.svg`, with no `mockServiceWorker.js` yet.
- `tasks/TASK-001/` contains requirements, architecture, ui-design, and api-integration, plus a `workflow-log.md` that is not produced by this plan. The root `workflow-log.draft.md` is untracked. Neither is touched by this plan.

## Intended Behavior

The Training Sessions Workspace from `requirements.md`:

- A sessions list with server-side search and a single-status filter, a clear-filters action, and non-color status indicators.
- Details (docked panel at ≥1024px, modal sheet below) and a create form dialog, both URL-addressable (`?session=`, `?new=1`) over a list that stays mounted.
- Create with the full validation set, a pending guard, preserved input on failure, and a post-create banner with Open session and, when hidden by filters, Reset filters.
- All six required states and scenarios, observable through ordinary HTTP to `/api/*` served by MSW.
- Responsive at 1440×900 and 390×844, accessible per `ui-design.md`, with 4–6 behavior tests.

## Preconditions And Confirmed Decisions

Confirmed and recorded (no further decision needed):

| Decision | Source |
| --- | --- |
| No router library. URL is the owner of filters, open session, and create view. | architecture D1 (human) |
| Vitest + jsdom + Testing Library as dev dependencies. | architecture D2 (human) |
| Feature hooks own server state. No data library. | architecture D2 |
| `src/api/` is the only `fetch` caller. Dates are parsed there. | architecture D3, api-integration §2 |
| `src/mocks/` owns handlers, store, fixture clock, scenario selection (`?scenario=` and `sessionStorage`, dev only). | architecture D4 |
| Dependency direction `components -> hooks -> api`. `mocks/` imported only by `main.tsx` (dev) and test setup. | architecture D5 |
| Layout, states, and interactions. The post-create banner replaces auto-open. | ui-design.md |
| Request, response, and error mapping, plus the state/error matrix. | api-integration §2–§4 |

Items to verify during implementation. They do not require a new decision unless the check fails:

1. **Vitest compatibility** with the installed Vite 8 and TypeScript ~7. Check the peer range at install time. If incompatible, STOP and report to the architect (architecture risk 4).
2. **Fixture import path.** Vite should allow JSON imports from `frontend-accelerator-assessment/fixtures/` because it is inside the project root, and `tsconfig.app.json` `include` covers only `src` (imported JSON files outside `include` are still resolved). If either blocks, STOP and report to the architect, who must decide on copying fixtures into `src/mocks/fixtures/` (architecture risk 3).
3. **JSON modules** under TypeScript: confirm `resolveJsonModule` is effective in bundler mode. If not, add it to `tsconfig.app.json` (a minimal config change, recorded in the final report).

**Open item needing confirmation (architect or human), because it affects how an evaluator starts the app:** architecture D4 starts MSW only when `import.meta.env.DEV`. Under that rule, `npm run build` plus `npm run preview` serve a bundle without mocks and every request would fail. This plan implements D4 as written (documented command: `npm run dev`) and does not silently add a production mock switch. If an evaluator should be able to run `preview`, an explicit `VITE_USE_MOCKS=true` opt-in is a one-line extension of the start condition. Confirm before coding if desired.

Evidence ordering (EVIDENCE_PROTOCOL §2): requirements, specialist decisions, and this plan now exist. The developer should create the local Git checkpoint after this plan and before `coder` runs, and record the hash in `workflow-log.md`. This is a developer action, and the plan does not perform it.

## Ordered File Changes

Steps 1–5 are independent of each other after step 0 and can proceed in parallel. Step 6 depends on 2 and 4 (and the pure parts of 3). Steps 7–8 depend on 6. Tests are written beside the behavior they protect (see Essential Tests), inside steps 9–10.

### Step 0. Tooling and scaffolding (sequential, first)

| File | Change | Why |
| --- | --- | --- |
| `package.json` | Add dev deps `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (versions compatible with Vite 8 and React 19, pinned by the lockfile). Add script `"test": "vitest run"`. `msw init` also adds `msw.workerDirectory`. | Decision D2. `package-lock.json` changes accordingly. |
| `public/mockServiceWorker.js` | Create with `npx msw init public --save` (copies from `node_modules`, no network). | MSW browser worker, required by D4. |
| `vite.config.ts` | Add a `test` block: `environment: "jsdom"`, `setupFiles`, `globalSetup` for the timezone (below), `css: false`. Import `defineConfig` from `vitest/config` (or add the vitest type reference). Plugin list unchanged. | Single config, no extra file. |
| `index.html` | Title to "Training sessions"; add `<meta name="theme-color" content="#F5F7F8">`. Keep the favicon and script lines. | Page title and theme per ui-design. |
| `src/App.css` | Delete (scaffold styles only). | Replaced by new styles. The sample assets stay untouched (unused) to limit unrelated churn. |

Timezone for tests: set `process.env.TZ` in the vitest `globalSetup` module (a UTC or fixed zone) so local-time formatting and date conversion assertions are deterministic. Verify that it takes effect for workers. If not, set it on the `test` script command instead and record it.

### Step 1. `src/api/` — client boundary (parallel)

| File | Content (per api-integration §2) |
| --- | --- |
| `src/api/types.ts` | Wire types verbatim from `API_CONTRACT.md` (`SessionSummary`, `SessionDetails`, `CoachSummary`, `ApiError`, `CreateSessionRequest`, enums as string-literal unions), plus view-model types with parsed `Date`s (`SessionSummaryView`, `SessionDetailsView`, `SessionsPage`). Use `type` unions, not `enum`. |
| `src/api/errors.ts` | `ApiClientError` (plain class, fields assigned in the body, not parameter properties), `kind: api \| network \| malformed \| aborted`. |
| `src/api/http.ts` | Private `request<T>()`. Owns the `/api` base constant, query building, JSON headers, non-2xx to `ApiClientError` mapping, `AbortError` mapping. |
| `src/api/parse.ts` | Pure normalizers with structural checks. Failures throw `MALFORMED_RESPONSE`. |
| `src/api/sessions.ts` | `listSessions`, `getSession`, `listCoaches`, `createSession`, applying the request-building rules (trim, omit empty `query` and invalid `status`, omit blank optional strings). |
| `src/api/index.ts` | Public re-exports. |

Contract between steps: hooks import only `src/api/index.ts`. No other file calls `fetch`.

### Step 2. `src/mocks/` — MSW boundary (parallel; depends only on `api/types.ts`)

| File | Content |
| --- | --- |
| `src/mocks/fixtures.ts` | The only importer of fixture JSON (`sessions.json`, `session-details/*.json`, `coaches.json`, `fixture-clock.json`, `mock-scenarios.json`). Use a Vite `import.meta.glob` for the five details files. |
| `src/mocks/clock.ts` | `rebaseTimestamps(value, offsetMs)` for `startsAt`, `createdAt`, `updatedAt`, `cancelledAt` (including nested `cancellation`), and `computeOffset(referenceNow, now)`. |
| `src/mocks/store.ts` | `createStore({ now })` factory returning the in-memory sessions and details (rebased once at creation) with `list(filters)`, `get(id)`, `create(request)`, `coaches()`. A factory (not a module singleton) so each test gets a fresh store with an injected clock. |
| `src/mocks/scenarios.ts` | Scenario table derived from `mock-scenarios.json`. `getScenario()`, `setScenario(name)` and the resolver deciding, per request, whether to override the response. Required: `normal`, `empty`, `list-error`, `details-error` (`ses_101` only), `coaches-error`, `create-error`. Unknown names fall back to `normal`. `normal` adds the 250ms fixture latency. |
| `src/mocks/handlers.ts` | The four MSW handlers per api-integration §3: server-side `query` (title, coach name, location name or address, case-insensitive) and `status`, `meta.total` after filtering, first 10 items, `INVALID_FILTER` on an unknown status, details 404, create validation with `fieldErrors` (including past `startsAt`), 201 `SessionDetails` with the selected coach. |
| `src/mocks/browser.ts` | `setupWorker(...handlers)`. |
| `src/mocks/node.ts` | `setupServer(...handlers)` for tests. |
| `src/mocks/start.ts` | `startMocks()`: reads `?scenario=` from `window.location`, persists it in `sessionStorage` (read-first fallback, try/catch around storage), calls `setScenario`, awaits `worker.start({ onUnhandledRequest: "bypass" })`. Does not touch the URL. |

Rule: nothing outside `src/mocks/` imports from it, except `main.tsx` (dynamic import under `import.meta.env.DEV`) and the test setup.

### Step 3. `src/features/sessions/model/` — pure logic (parallel)

| File | Content |
| --- | --- |
| `status.ts` | Status to `{ label, symbol }` map and ordered list for the select. `SessionType` and `Visibility` labels. |
| `format.ts` | `Intl.DateTimeFormat` / `Intl.NumberFormat` helpers: list start, details full date and time, duration ("90 min"), timestamps, capacity text. |
| `startsAt.ts` | `toStartsAt(date, time): string \| null` (local date and time to UTC ISO) and `isFuture(iso, now)`. The one owner of the conversion and the future check. |
| `validation.ts` | `validateCreate(values, now): Record<fieldName, message>` implementing every rule in `requirements.md`, plus `mapServerFieldErrors(fieldErrors)` that returns `{ fields, unmapped }`. Copy follows `ui-design.md` ("Enter a title of 3–80 characters."). |
| `filters.ts` | `Filters` type and `sanitizeFilters` (unknown status to empty, trim query), `isFiltered`. |

### Step 4. `src/app/` — URL state and shared hooks (parallel)

| File | Content |
| --- | --- |
| `src/app/url-state.ts` | Pure `parseLocation(search)` and `buildSearch(state, existingSearch)`. Keys `q`, `status`, `session`, `new`. Unknown params (notably `scenario`) are preserved. The only module that touches `window.history`: `navigate(next, { replace })`, `subscribe(callback)` on `popstate`. |
| `src/app/useUrlState.ts` | `useSyncExternalStore` over `url-state.ts`. Exposes `state`, `setFilters` (search: replace, debounced by the caller; status: push), `openSession(id)`, `openCreate()`, `closeOverlay()` (back if the previous entry is in-app, else replace to the list URL). |
| `src/app/useMediaQuery.ts` | `matchMedia` subscription for the 720px and 1024px breakpoints (the one place JS picks a layout mode). |
| `src/app/ErrorBoundary.tsx` | Last-resort boundary for render errors (architecture D6). |

### Step 5. Styles (parallel)

| File | Content |
| --- | --- |
| `src/index.css` | Replace scaffold: design tokens from `DESIGN_TOKENS.md` as CSS custom properties, reset, base typography (local UI sans-serif), focus-visible outline (2px, offset), visually-hidden utility, skip link, reduced-motion rules, `color-scheme`. No `transition: all`. |
| `src/features/sessions/sessions.css` | Layout (grid for list plus panel at ≥1024, sheet below), table, mobile list, badges, meter, dialog and sheet, form grid, skeletons, banners. Breakpoints 720 and 1024. `min-width: 0` on flex children. No horizontal overflow at 320–1440. |

### Step 6. `src/features/sessions/hooks/` (depends on 1, 3, 4)

| File | Content |
| --- | --- |
| `useResource.ts` | Small shared hook (three callers justify it): runs an async function with an `AbortController`, returns `loading \| success \| error` plus `refreshing` and `retry`, keeps prior data during refetch, swallows `aborted`. |
| `useSessionsList.ts` | Uses `useResource` with `listSessions(filters)`. Exposes `items`, `total`, and truncation info. |
| `useSessionDetails.ts` | `getSession(id)`. |
| `useCoaches.ts` | `listCoaches()`, enabled only while the create view is open. |
| `useCreateSession.ts` | Mutation state `idle \| pending \| success \| error` (holds created `SessionDetailsView` or `ApiClientError`). Ignores calls while pending. No automatic retry. |
| `useCreatedSessionNotice.ts` | After success, after the list refetch settles, derives `hiddenByFilters`. Holds the banner state (dismissal rules from `ui-design.md`). It could live inside `SessionsPage` if it stays small. |

### Step 7. `src/features/sessions/components/` (depends on 3 and 6; the leaf components can start earlier)

Leaf components (parallel): `StatusBadge.tsx`, `CapacityMeter.tsx` (`role="meter"`), `ErrorState.tsx`, `Field.tsx` (label, hint, error with `aria-describedby`), `ModalDialog.tsx` (native `<dialog>` + `showModal`, focus restore, `overscroll-behavior: contain`), `ResultBanner.tsx`.

Composite components:

| File | Content |
| --- | --- |
| `SessionsFilters.tsx` | Search (300ms debounce, Enter applies), status select, Clear filters (focus to search). |
| `SessionsTable.tsx` and `SessionsMobileList.tsx` | Desktop table and mobile list. The title is a real `<a href>` carrying current params. A plain click uses in-app navigation. Selected row marked with `aria-current`. |
| `SessionsListRegion.tsx` | Renders all list states: skeleton, populated, refreshing, empty, no-match, error (with stale rows kept), truncation note. The "N sessions" `role="status"` summary. |
| `SessionDetailsView.tsx` | Content per `ui-design.md`, including the cancellation group, `mailto:` link, and "None added". |
| `SessionDetailsContainer.tsx` | Chooses panel (`<aside>`, ≥1024) or modal sheet using `useMediaQuery`. Loading, 404, error states. Focus handling. |
| `CreateSessionForm.tsx` and `CreateSessionDialog.tsx` | All fields, validation timing, error summary with focus, pending, server error mapping, coaches states, discard confirmation, `beforeunload` guard while dirty. |
| `SessionsPage.tsx` | Composes everything from `useUrlState` and the hooks. Sets `document.title`. Owns the post-create flow. |

### Step 8. Wiring (depends on 7)

| File | Change |
| --- | --- |
| `src/App.tsx` | Replace scaffold with header, skip link, `<main>`, `<SessionsPage />` inside `ErrorBoundary`. |
| `src/main.tsx` | If `import.meta.env.DEV`, `await import("./mocks/start")` and `startMocks()` before `createRoot(...).render(...)`. Keep `StrictMode` and `index.css`. Resolve the open item above before changing the condition. |

### Step 9. Test infrastructure (depends on 2; can run alongside 6–8)

| File | Content |
| --- | --- |
| `src/test/global-setup.ts` | Timezone (see Step 0). |
| `src/test/setup.ts` | Import `@testing-library/jest-dom/vitest`. Start `src/mocks/node.ts` server before all, reset handlers and scenario after each, close after all. Stub `matchMedia` (desktop by default, overridable) and `HTMLDialogElement.showModal/close` if jsdom lacks them. Reset `window.history` and `sessionStorage`. `vi.useFakeTimers({ toFake: ["Date"] })` with the system time at the fixture `referenceNow`, so only `Date` is frozen and debounce and async behave normally. |
| `src/test/render.tsx` | `renderApp({ url, scenario })` helper that sets the URL and scenario through the mocks module's exported functions, then renders `App`. |

### Step 10. Tests (see below)

Place with the behavior: `src/features/sessions/sessions-workspace.test.tsx` (list and states), `src/features/sessions/create-session.test.tsx`, plus small unit files only where listed under additional tests.

## Contracts And Dependencies

- **Dependency direction:** `components -> hooks -> api`. `model/` pure and importable by all feature layers. `mocks/` imports `api/types` only. Nothing in `src/features` or `src/api` imports `src/mocks` or fixtures. (Add a quick check with `Grep` during review.)
- **Wire versus view model:** components receive view-model types only. Wire types stay in `api/` and `mocks/`.
- **Scenario isolation:** no component, hook, or `api/` file references a scenario name, `scenario`, or `sessionStorage` for it.
- **URL contract:** `q`, `status`, `session`, `new`, plus preserved unknown params (`scenario`). The URL rewrite must not drop `scenario`.
- **Created-session contract:** `useCreateSession` returns the 201 `SessionDetailsView`. `SessionsPage` uses its id for the banner and the hidden-by-filters check against the refetched list.
- **New dependencies (recorded in architecture §Dependencies):** vitest, jsdom, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, all dev only. No runtime dependency is added.
- **TypeScript constraints:** `import type` for types, no `enum`, no parameter properties, no unused locals or parameters. Fixture JSON imports require the checks listed under Preconditions.
- **Unchanged:** `frontend-accelerator-assessment/`, `rulesets/`, `.claude/`, `.agents/`, `toolchain/`, `workflow-log.draft.md`, `tasks/TASK-001/workflow-log.md`.

## Essential Tests

Six focused behavior tests (the spec asks for four to six). Each uses the real handlers through MSW, queries by role and accessible name, and asserts visible outcomes.

| # | Test | Protects | Scenario |
| --- | --- | --- | --- |
| 1 | Initial loading then populated list: a loading status is visible, then the five sessions render with title, status text, coach, and capacity. | Initial loading, populated | `normal` |
| 2 | Search and status filtering: typing a coach name narrows the list and the count. Selecting status "Full" shows only the full session. "Clear filters" restores all five. | Server-side filtering through the UI, clear filters | `normal` |
| 3 | Empty and no-match are distinct: `empty` shows "No sessions yet" with a Create action. In `normal`, a search with no result shows "No sessions match your filters" with Clear filters. | No sessions, filters with no matches | `empty`, `normal` |
| 4 | List error with recovery: `list-error` shows an alert with the server message and a "Try again" button. After switching the scenario to `normal`, Try again shows the rows. | List request failure and retry | `list-error` then `normal` |
| 5 | Create validation and success: submitting empty shows field errors and sends no request. Filling valid values (future date) submits, shows the success banner, and the new title is findable in the list. | Validation, pending guard (button disabled to repeat), success, discoverability | `normal` |
| 6 | Create server failure preserves input: with `create-error`, a valid submit shows a form-level alert and every typed value is still in its field. | Server failure, preserved values | `create-error` |

Notes for the `coder`:

- Date and time inputs need values after the frozen clock (`2026-07-27T12:00Z` plus days). Assert the UTC conversion indirectly (the created session appears with the expected local time).
- The pending guard assertion can fire two clicks and verify one new session appears (list total goes from 5 to 6, not 7).
- Debounce: use real timers for everything except `Date` (see `setup.ts`) and `findBy*` queries. Do not fake `setTimeout`.
- Do not assert on implementation details (hook calls, state shapes) or snapshots.

## Additional Risk-Based Tests

Optional. The `test-generator` or `coder` may add them if risk justifies it. They are outside the essential budget.

- `url-state` unit tests: parse and build round trip, `scenario` preserved, invalid `status` ignored, back and forward restores filters.
- Details deep link: loading `?session=ses_102` opens details with full content over the list. Closing returns to the previous filters and moves focus to the originating link.
- Details error for `ses_101` (`details-error`) and a 404 for an unknown id, each with the right recovery.
- Coaches error blocks submit with an explanation, and Retry recovers (`coaches-error`).
- Hidden-by-filters banner: create while a non-matching filter is active shows "Reset filters" and "Open session".
- API unit tests: request building (omit empty `query`, encode specials), `MALFORMED_RESPONSE`, non-JSON 500 to `HTTP_500`, abort swallowed.
- Local-to-UTC conversion across a DST boundary (pure function test).
- Mobile list rendering with the `matchMedia` stub switched to a narrow viewport.

## Verification Commands

Existing commands, discovered from `package.json` at the Repository Root (working directory = Repository Root):

| Command | Purpose | Notes |
| --- | --- | --- |
| `npm run lint` | `oxlint` | Existing. |
| `npm run build` | `tsc -b && vite build` | Existing. Typechecks `src` including tests. |
| `npm run dev` | Start Vite dev server with mocks | Existing. Documented project command. Port is whatever Vite reports. Do not assume one. |
| `npm run preview` | Serve the build | Existing. Mocks are off under D4 (see the open item). |
| `npm test` | `vitest run` | **Added by Step 0.** It does not exist until the coder adds it. |

Not run by this plan, and not invented: browser verification uses the project's `toolchain/bin/agent-browser.mjs` through the `browser-verify` role, and `toolchain/bin/doctor.mjs` exists for the Doctor evidence item. Neither is given flags here.

Scenarios in the browser: `npm run dev`, then open the printed URL with `?scenario=<name>` (for example `?scenario=list-error`). The choice persists for the session, and `?scenario=normal` resets it. `browser-verify` records how each scenario was selected (EVIDENCE_PROTOCOL §7).

## Risks And Rollback

| Risk | Mitigation |
| --- | --- |
| Vitest or Testing Library incompatible with Vite 8, TypeScript ~7, or React 19 | Check peer ranges at install time. STOP and report if there is a conflict. Do not pin an older Vite. |
| Fixture import blocked by Vite or TypeScript | See Precondition 2. STOP for an architect decision on copying fixtures. |
| Mock worker not active before the first request | `await worker.start()` before render. A failure appears as a `network` error, and the Doctor-style check is a console and network review in browser verification. |
| `<dialog>` support gaps in jsdom | Stub `showModal` and `close` in test setup. Real behavior (focus trap, Escape, restore) is verified in the browser. |
| Hand-written history handling | Keep it in `url-state.ts` only, with the unit tests listed above if time allows. |
| Responsive regressions, contrast of badge tints, overflow at 390px | Cannot be proven by jsdom. They are `browser-verify` items. |
| Truncation behavior (api-integration Q1), abort-on-close (Q2), timeout (Q3), `fieldErrors` keys (Q4) | Implemented as proposed and labelled as assumptions in the final report. |
| Production preview without mocks | Open item above. Resolve before coding if evaluators will use `preview`. |

Rollback: all changes are additive to a scaffold and live in new directories (`src/api`, `src/mocks`, `src/app`, `src/features`, `src/test`). Reverting means restoring `package.json`, `package-lock.json`, `vite.config.ts`, `index.html`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, and `src/App.css` from the Git checkpoint and deleting the new directories and `public/mockServiceWorker.js`. No feature flag is warranted.
