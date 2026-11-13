# TASK-001 Code Review

Review role: `code-reviewer`. Review output below is preserved verbatim from the first invocation (`2026-11-10 13:07 +0100`, prompt: `/code-reviewer Review the completed TASK-001 diff against the approved requirements.`). It was re-invoked at `2026-11-10 13:15 +0100` only to persist it here with a disposition per finding. No code, tests, documentation or rulesets were edited by the reviewer.

## Disposition Summary

Allowed dispositions: `resolved` (with the change identified), `accepted limitation` (with rationale and impact), `disputed` (with evidence), `unresolved`.

State at the time of writing (2026-11-10 13:15 +0100): no production code or test changed after the review, and the developer has recorded no decision on any finding. Every finding is therefore `unresolved`. The reviewer did not assign `accepted limitation` or `disputed`, since those are developer decisions that need a rationale or evidence. Update this table when a finding is resolved, accepted or disputed, and record any later `coder` or `debugger` invocation and whether another review or verification followed.

| # | Severity | Finding | Disposition | Rationale / evidence |
| --- | --- | --- | --- | --- |
| 1 | Should fix | No documented way to run the app or select a scenario | unresolved | No change since review. `README.md` still lacks the run command and `?scenario=` names. |
| 2 | Should fix | Success banner takes focus again on a later create dialog | unresolved | No change since review. `SessionsPage.tsx:50-52` unchanged. |
| 3 | Consider | "Back to Sessions" can undo a search typed while details are open | unresolved | No change since review. |
| 4 | Consider | "Clear Filters" in the no-matches state loses focus | unresolved | No change since review. |
| 5 | Consider | Orphan `Coach` label when coaches fail | unresolved | No change since review. |
| 6 | Consider | Table column widths at about 1024px with docked panel unverified | unresolved | Needs `browser-verify` at about 1024 and 800 px. Not yet observed. |
| 7 | Consider | Stale-filter flash in the list region | unresolved | No change since review. |
| N1 | Note | `url-state.ts` is not the only module touching `window.history` (`useUrlState.ts:32,45` reads `history.state`) | unresolved | Informational. No change since review. |
| N2 | Note | Details page title is "Session details · …", not the session title | unresolved | Informational. No change since review. |
| N3 | Note | `sessionsFixture` export unused; list derived from details fixtures | unresolved | Informational. Fixtures compared at review time: no field differs. |

Verdict (from the review): **NEEDS-CHANGES**.

## Review Output (verbatim)

# Review: TASK-001 working-tree diff

**Base:** `HEAD` (`db9e413`, the planning checkpoint) against the working tree, including untracked files under `src/` and `public/`. I excluded `tasks/` and did not read `package-lock.json`. I read the requirements, architecture, ui-design, api-integration and implementation-plan documents, and the code. I did not re-run any commands, so the coder's results (6 tests, build and lint passing) are not independently confirmed.

**Independence caveat:** this review ran inline in the same session that wrote the code, as the log notes for earlier roles. It is not an isolated read.

## Verdict: NEEDS-CHANGES

There are no blocking defects, and the required behavior is present in the code. Two should-fix items stand between this and a PASS: the run and scenario instructions are undocumented, and the post-create banner takes focus when it shouldn't.

## Findings

### Should fix

**1. No documented way to run the app or select a scenario** (`README.md` has no `npm run dev` or `scenario` mention)
- **Why it matters:** Definition of Done items 3 and 8 and Evidence §7 require a documented start command and reproducible scenario selection.
- **What happens now:** `?scenario=<name>` is described only in `tasks/TASK-001/*.md`. An evaluator following the repo instructions starts `npm run preview`, gets no API, and every request fails. The dev-only choice is recorded as a limitation but not stated where an evaluator would look.
- **Follow-up:** `docs-generator` (it can edit `README.md`). It should state `npm run dev`, the six `?scenario=` names, how `?scenario=normal` resets the choice, and that `preview` has no mocks.

**2. The success banner takes focus again on a later create dialog** (`src/features/sessions/components/SessionsPage.tsx:50-52`)
- **Scenario:** create a session, so `created` is set. Open "Create Session" again and press Cancel or Escape. `url.create` flips to false and the effect refocuses the banner. Keyboard users lose their place instead of returning to the opener.
- **Cause:** `ui-design.md` says the banner clears on a new create, but nothing clears `created` on `openCreate`. The effect also has no "just created" condition.
- **Follow-up:** `coder`, a one-line scope.

### Consider (low or medium-low)

**3. "Back to Sessions" can undo a search typed while details are open** (`src/app/useUrlState.ts:32`, `src/app/url-state.ts:68-73`)
- **Scenario:** open a session (a history entry is pushed), type "maya" in the docked layout (replaces that entry), press "Back to Sessions". `history.back()` restores the pre-open query and the search is lost.
- **Inconsistency:** a status change pushes its own entry and survives the close. This weakens the "return to the previous list state" requirement only in the docked layout.

**4. "Clear Filters" in the no-matches state loses focus** (`SessionsPage.tsx:60`, `SessionsListRegion.tsx:59`)
- Only the filter bar's button moves focus to the search box. The list-region button unmounts and focus falls to `body`. `ui-design.md` says Clear Filters moves focus to the search.

**5. A closed coaches-error state leaves an orphan label** (`CreateSessionForm.tsx:192-197`)
- When coaches fail, the `Coach` label points at an id with no control.
- A coach validation error then has no focus target.
- Submit is blocked, so the effect is minor.

**6. Table column widths at about 1024px with the docked panel are unverified** (`sessions.css:194, 222, 297`)
- **Cause:** `table-layout: fixed` gives about 100 px to each non-title column. The `nowrap` "✓ Completed" badge (about 85 px) plus 32 px of cell padding can overflow.
- **Scope:** 1440 and 390 are the required widths and look fine on paper. A narrow desktop and the 720–1023 tablet range may overflow the table or cause horizontal scroll.
- **Follow-up:** `browser-verify` at about 1024 and 800 px.

**7. A stale-filter flash in the list region** (`SessionsListRegion.tsx:59`)
- While refreshing, `filtered` follows the new URL but the rows are from the previous request.
- Example: from the empty scenario, typing a search shows "No sessions match your filters" during "Updating…".
- Cosmetic only.

### Notes (not defects)

- **Architecture claim:** `url-state.ts` is described as the only module touching `window.history`. `useUrlState.ts:32,45` also reads `window.history.state`. It is read-only, but it breaks the stated rule.
- **Page title:** the title for details is "Session details · …", but `ui-design.md` says it should reflect the session title.
- **Unused fixture:** `src/mocks/fixtures.ts:19` exports `sessionsFixture`, which nothing uses. The list is derived from the details fixtures, so `MOCKING_GUIDE.md`'s "use `sessions.json` as the default" is not followed literally. I compared `sessions.json` against the details fixtures: no field differs today, so behavior is correct.

## Checked and found sound
- **Boundaries:** `fetch` appears only in `src/api/http.ts`, and nothing outside `src/mocks/` imports fixtures or scenario names. The scenario boundary and fixture rebasing match the contract.
- **Create flow:**
  - Validation covers every rule, and the 400 `fieldErrors` mapping is correct.
  - A pending create is guarded, a failure keeps the form values, and an uncertain-outcome message is shown for network failures.
  - Coaches loading and error are handled.
  - There is a discard confirmation.
- **Accessibility and safety:** error and hint wiring is in place, there are no `div` click handlers, and links keep native behavior. The `mailto:` link is built from a fixed prefix.
- **Production build:** mocks are tree-shaken out.

## Residual gaps (even where findings are low)
- **Not covered by tests:** the mobile list, details deep link and focus return, the coaches error, the hidden-by-filters banner, and back/forward.
- **Not verified in a browser:** the service worker startup, native `<dialog>` focus trap and restore, layouts at 1440 and 390, overflow, and badge contrast. The jsdom dialog and `matchMedia` are stubs.
- **Unresolved assumptions:** the api-integration assumptions are implemented as recorded, but they are not backend-confirmed.

I'd suggest `coder` for finding 2 and `docs-generator` for finding 1, with 3 and 4 optional. `browser-verify` can run alongside or after them. I edited nothing and have stopped here without invoking any of them.
