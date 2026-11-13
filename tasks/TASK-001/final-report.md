# TASK-001 Final Report

Assembled by `docs-generator` on 2026-11-10 14:52 +0100 from evidence that already exists. It contains only facts produced by the `code-reviewer`, `browser-verify` and `verify` runs (and the artifacts of earlier roles) and invents no command, screenshot, observation or result. Detailed artifacts are linked rather than copied.

Task: Training Sessions Workspace (frontend assessment slice). Reported task identifier: `TASK-001`. Pre-implementation checkpoint commit: `db9e413`. HEAD at the time of the last verification: `db9e413`; the implementation is uncommitted in the working tree.

## Sources

| Evidence | Source | Notes |
| --- | --- | --- |
| Code review | [`review.md`](review.md) | Verdict `NEEDS-CHANGES`, run 2026-11-10 13:07 +0100, persisted 13:15 +0100. |
| Browser verification | `browser-verify` response in the session, 2026-11-10 13:34 +0100; screenshots in [`evidence/`](evidence/) | `browser-verification.md` does not exist. The role could not write it, so the report text exists only in the session transcript. |
| Automated verification | `verify` response in the session, 2026-11-10 14:48 +0100 | `verification.md` does not exist. The commands and results are copied below from that response. |
| Process | [`workflow-log.md`](workflow-log.md) | Role order, prompts, STOP observations. |

## Implemented Scope

Everything below was observed working in the real browser (see Browser Verification) unless marked otherwise. Plan and decisions: [`requirements.md`](requirements.md), [`architecture.md`](architecture.md), [`ui-design.md`](ui-design.md), [`api-integration.md`](api-integration.md), [`implementation-plan.md`](implementation-plan.md).

- Sessions workspace: list with title, type, status, start, duration, coach, location, capacity and booked count; server-side search and single-status filter; clear filters; status text plus symbol; opening a session keeps the list context.
- Session details: docked panel at 1440 px, full-screen modal sheet at 390 px; all list fields plus description, trainer notes, capacity summary, coach contact, created and last-updated; deep link `?session=<id>`; close returns focus to the originating link.
- Create session: all required fields, client validation, pending state with duplicate-submit guard, server error handling that keeps entered values, success banner with "Open Session" and, when filters hide the new session, "Reset Filters".
- States observed: initial load, populated, no sessions, no matches, list error (with retry), details error, details 404, coaches error, create validation failure, create pending, create success, create server failure.
- Mock boundary: MSW handlers for the four required endpoints, the six required scenarios, in-memory create, fixture clock rebasing. All inside `src/mocks/`.
- Tests: 6 behavior tests in two files (see Commands And Verdicts).

## Missing Required Behavior

No review, browser or verify run reported a required behavior as missing. The following required items were **not verified**:

- Badge and text contrast was not measured (browser-verify).
- `prefers-reduced-motion` was not exercised (browser-verify).
- Create submit on the 390×844 mobile layout was not run; only validation and layout were (browser-verify).
- Recovery after a list error is fixed (scenario switched without reload) could not be demonstrated; the retry button re-sent the request, which failed again under the same scenario (browser-verify).

## Commands And Verdicts

From the `verify` run, 2026-11-10 14:48 +0100, working directory `C:\projects\working\accelarator-project` (repository root). No install, repair or config change. Verdict **PASS**.

| Command | Exit code | Decisive output |
| --- | --- | --- |
| `npm run lint` | 0 | `oxlint`: 0 errors, 2 warnings: `react(set-state-in-effect)` at `src/features/sessions/hooks/useResource.ts:47` and `src/features/sessions/components/CreateSessionForm.tsx:80` |
| `npm run build` | 0 | `tsc -b && vite build`; 55 modules transformed; built in 1.35 s |
| `npm test` | 0 | 2 test files passed, 6 of 6 tests passed |

Not applicable: no formatter, e2e or separate typecheck script exists in `package.json` (`tsc -b` inside `build` typechecks `src`, including tests).

Final status observed by `verify`: tracked changes to `index.html`, `package-lock.json`, `package.json`, `src/App.tsx`, `src/index.css`, `src/main.tsx`, `vite.config.ts`, `tasks/TASK-001/workflow-log.md`; `src/App.css` deleted; untracked `src/api/`, `src/app/`, `src/features/`, `src/mocks/`, `src/test/`, `public/mockServiceWorker.js`, `tasks/TASK-001/evidence/`, `tasks/TASK-001/review.md`. `frontend-accelerator-assessment/` shows no changes.

Tests (behavior level, real MSW handlers, frozen `Date`):

1. loading then populated list with status text;
2. search and status filtering on the server, and clear filters;
3. "no sessions exist" versus "filters match nothing";
4. list error with retry;
5. create validation, duplicate-submit guard, and success discoverable in the list;
6. create server failure keeps every entered value.

Per the plan, details-error, coaches-error, the hidden-by-filters banner, deep-link focus return, the mobile list and back/forward are not covered by automated tests (they were checked in the browser, except the mobile list's automated coverage).

## Browser Verification

Verdict from the `browser-verify` run: **PASS with findings**. Doctor (`node toolchain/bin/doctor.mjs --json`): `DEGRADED` (only `hooks:codex` is `PENDING_ACTIVATION`; `capability:browser` PASS, `hooks:claude` `ACTIVE`), not blocked.

- URL: `http://localhost:5173/`, emitted by `npm run dev`, which the role started after approval (process `node …\vite\bin\vite.js`, PID 25460). The role stopped only that process; port 5173 had no listener afterwards.
- Adapter session: `bv-task001`, closed at the end. Viewports: 1440×900 and 390×844, plus a width sweep at 1024, 800 and 320.
- Scenario selection: `?scenario=<name>` (kept in `sessionStorage` for the browser session), reset to `normal` afterwards. Scenarios used: `normal`, `empty`, `list-error`, `details-error`, `coaches-error`, `create-error`. Optional scenarios were not used.
- Interruptions: the first `open` hung 120 s inside the sandbox and was retried once outside it with approval. Mid-run the adapter connection failed (os error 10060); the role closed its own session and reopened it, then re-ran the empty and error scenarios. Network logs cover only the part after the restart.

| State or flow | Viewport | Result |
| --- | --- | --- |
| Populated workspace | 1440×900 | PASS: 5 sessions, status text and symbols, no overflow (scrollWidth 1440 = clientWidth 1440). Accessibility snapshot taken. |
| Populated workspace | 390×844 | PASS: stacked list, no overflow, Tab order sensible, 2 px solid focus outline. |
| Details | 1440 / 390 | PASS: docked panel with all fields / modal sheet; Escape closes; focus returns to the row link; deep link with filters restores state. |
| Search and status | 1440 | PASS: `?q=ortiz` gives 1 session; `?status=full` gives 1; Clear Filters resets and focuses search; back/forward restore the filter. |
| Create validation | 1440 and 390 | PASS: seven field errors beside controls plus a summary, focus on Title; past date rejected ("Choose a start time in the future."); controls at least 44 px; submit bar stays visible on mobile. |
| Create pending and success | 1440 | PASS: double-click shows "Creating…" and sent exactly one `POST /api/sessions` (201); banner, list refetched to 6 sessions; "Open Session" shows the new session with local time as entered. |
| Hidden by filter | 1440 | PASS: banner says it is hidden by the current filters and offers Reset Filters; Reset shows the new session. |
| Create server failure | 1440 | PASS: dialog stays open, form-level alert, all entered values kept. |
| Empty and no matches | 1440 | PASS: distinct messages with Create Session / Clear Filters actions. |
| List error | 1440 | PASS: error with Try Again; Create stays enabled; retry re-sent the request (second 500 under the same scenario). |
| Details error and 404 | 1440 | PASS: panel error with retry while the list stays usable; 404 shows "This session no longer exists." with no retry. |
| Coaches error | 1440 | PASS: error with retry; submit `aria-disabled`; "Coaches must load before you can create a session." |

Console, page errors, network (post-restart session): `errors` empty; `console` only Vite and React DevTools info; non-2xx responses were all scenario-driven (`/api/coaches` 500, `/api/sessions` 500 ×2, `/api/sessions/ses_101` 500, `/api/sessions/ses_nope` 404); no unexpected navigation. The earlier `create-error` 500 is outside the post-restart network log.

Evidence files in [`evidence/`](evidence/): `populated-desktop.png`, `populated-mobile.png`, `details-desktop.png`, `details-mobile.png`, `details-error-desktop.png`, `create-validation-desktop.png`, `create-validation-mobile.png`, `create-success-desktop.png`, `create-hidden-by-filter-desktop.png`, `create-error-desktop.png`, `create-mobile.png`, `empty-desktop.png`, `no-matches-desktop.png`, `list-error-desktop.png`, `coaches-error-desktop.png`, `narrow-1024-details.png`.

### Defects seen in the browser (not yet in `review.md`)

- **BV-1** (low-medium, at a required viewport): the Coach table cell has the `truncate` class (`display: block`), so it stops being a table cell; row dividers beside it are misaligned and the selected-row highlight is cut off in that column (`populated-desktop.png`, `narrow-1024-details.png`).
- **BV-2** (low-medium): session title links are 20 px tall on mobile, the only way to open a session; `DESIGN_TOKENS.md` asks for 44 px touch targets.
- **BV-3** (confirms review finding 6): at 1024 px with the docked panel the table is 608 px wide in a 598 px box, 4 status badges extend past their cells and coach names are cut short. There was no page-level horizontal scroll at 1024, 800 or 320 px.

Also observed: the create-error alert repeats its message ("…Try again. The session could not be created.").

## Known Limitations

- Mocks run only under `npm run dev` (`import.meta.env.DEV`). `npm run build` plus `npm run preview` has no API, so every request fails there (developer decision recorded in `workflow-log.md`).
- No client request timeout (developer-accepted, recorded in `workflow-log.md`).
- The mock scenario is read once at startup, so it cannot be switched without a reload.
- jsdom tests use stubs for `<dialog>` and `matchMedia`; real dialog behavior was only checked in the browser.
- The review ran in the same session that wrote the code and is not an isolated read (stated in `review.md`).

## Assumptions

Recorded in [`requirements.md`](requirements.md) (A1–A6) and [`api-integration.md`](api-integration.md) §1 and §8. The developer accepted these as proposed (`workflow-log.md`, "Developer Decisions Before Coding"):

- the list is truncated to `pageSize` 10 and shows "Showing 10 of N" when `meta.total` is larger;
- a pending create is not aborted when the form closes;
- `fieldErrors` keys match request property names, and the mock rejects a past `startsAt` while the client validates the future start itself.

Search "location" matching name and address, new-session defaults (`scheduled`, 0 booked) and list order (fixture order, creations appended) are assumed mock behavior, not backend-confirmed.

## Decisions

Developer decisions, as recorded in `workflow-log.md`: no router library (in-house URL state); Vitest + Testing Library + jsdom for tests; dev-only mocks; install of the test dev dependencies approved; dev server start approved for browser verification. Architecture, API and UI decisions with reasons: [`architecture.md`](architecture.md), [`api-integration.md`](api-integration.md), [`ui-design.md`](ui-design.md). Deviations reported by roles: ui-designer replaced auto-open after create with a banner; coder added `@testing-library/dom`, moved the test timezone to `vite.config.ts`, and folded the planned `useCreatedSessionNotice.ts` into `SessionsPage.tsx`.

## New Dependencies And Trade-offs

All dev dependencies; no runtime dependency was added (`msw@2.14.6` was already present):

| Package | Version range in `package.json` | Reason and trade-off |
| --- | --- | --- |
| `vitest` | `^5.1.0` | Vite-native runner; new toolchain dependency. |
| `jsdom` | `^31.0.0` | DOM environment; not a real browser, so browser evidence is still required. |
| `@testing-library/react` | `^16.3.3` | Behavior-level assertions by role and label. |
| `@testing-library/dom` | `^10.4.2` | Required peer of `@testing-library/react` (not in the original plan). |
| `@testing-library/user-event` | `^14.6.9` | Realistic user interaction in tests. |
| `@testing-library/jest-dom` | `^7.0.1` | DOM matchers. |

`public/mockServiceWorker.js` was generated with `npx msw init public --save`, which also added `msw.workerDirectory` to `package.json`.

## Unresolved Review Findings

From [`review.md`](review.md); every item is `unresolved` (no code changed after the review and no developer disposition has been recorded). Verdict `NEEDS-CHANGES`.

| # | Severity | Finding | Disposition | Browser evidence |
| --- | --- | --- | --- | --- |
| 1 | Should fix | No documented way to run the app or select a scenario (`README.md`) | unresolved | not a browser matter |
| 2 | Should fix | Success banner takes focus again on a later create dialog | unresolved | reproduced: after Escape on a second create dialog, focus was on the banner |
| 3 | Consider | "Back to Sessions" can undo a search typed while details are open | unresolved | not tested |
| 4 | Consider | "Clear Filters" in the no-matches state loses focus | unresolved | reproduced: focus was on `<body>` |
| 5 | Consider | Orphan `Coach` label when coaches fail | unresolved | not tested |
| 6 | Consider | Table widths at about 1024 px with docked panel | unresolved | confirmed as BV-3 |
| 7 | Consider | Stale-filter flash in the list region | unresolved | not tested |
| N1–N3 | Note | `history` reads outside `url-state.ts`; details page title; unused `sessionsFixture` export | unresolved | not tested |

New from browser verification: BV-1, BV-2, BV-3 (above), also unresolved.

## Developer-Reported Time

Developer-recorded start: `2026-11-10 11:21 +0100` (`workflow-log.md`). Finish, substantial breaks, active time and calendar time have **not** been provided and are still placeholders in `workflow-log.md`. They are not inferred here.

## Evaluator Reproduction Steps

Derived only from commands that were actually run:

1. Open the repository root `C:\projects\working\accelarator-project` (single frontend application). Dependencies are those in `package.json` and `package-lock.json`; the verification runs used an already-installed `node_modules`.
2. `npm run lint`, `npm run build`, `npm test`: expected exits 0, with 2 lint warnings and 6 passing tests.
3. `npm run dev`, then open the URL that Vite prints (it was `http://localhost:5173/` in the verification run). Do not use `npm run preview`: mocks are dev-only.
4. Select scenarios by appending `?scenario=<name>`: `normal`, `empty`, `list-error`, `details-error` (affects `ses_101`), `coaches-error`, `create-error`. The choice persists for the browser session; `?scenario=normal` resets it. This is not yet documented in `README.md` (review finding 1).
5. Useful URLs: `/?q=ortiz`, `/?status=full`, `/?session=ses_102`, `/?new=1`.
6. Compare with `evidence/` screenshots and with [`workflow-log.md`](workflow-log.md) (role order and checkpoint commit `db9e413`).
