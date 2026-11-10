# TASK-001 UI Design: Responsive Interaction Model

Inputs: `requirements.md`, `architecture.md`, `designs/DESIGN_TOKENS.md` (visual direction, used as given), `designs/sessions-dashboard-reference.svg` (hierarchy and density only), the common ui-designer rules, and the pinned web interface guidelines. No Framework or Project ui-designer rules exist.

A visual direction already exists (the fallback tokens), so no direction choice is needed. This document defines structure and behavior only. Tokens are referenced by name, not redefined.

## Design Principles

- Operational tool: dense, stable, scannable. No hero, gradients, or nested cards. Work surfaces are full-width with dividers.
- URL is the state owner (architecture D1): details and create are URL-addressable views over a list that stays mounted.
- Hover never the only affordance. Status always has text plus a symbol.

## Deviations From The Reference (deliberate)

| Reference element | Decision | Reason |
| --- | --- | --- |
| Sidebar with Coaches, Locations, Programs | Omitted. A slim top header with the product name and the page title is used. | Those destinations are non-goals, and dead navigation is misleading. |
| "All types" filter | Omitted | Optional extension. The filter bar leaves room to add it. |
| Details panel docked on the right | Kept at ≥1024px, becomes a modal sheet below that | Matches the reference where width allows. |
| Capacity as text only | Text plus a bar | Reference shows a bar in details. |

## Flow

1. Open the app and land on the Sessions workspace (`/`), showing the list in the `normal` scenario after initial loading.
2. Search or filter. The URL updates. Results refetch. A live region announces the count.
3. Activate a row's title link. Details open (`?session=ID`) with the list and filters retained.
4. Close details (button, Escape in modal mode, or browser Back) and return to the same filtered list, with focus on the row's title link that opened it.
5. Activate "Create session" to open the form (`?new=1`). Submit. On success, the form closes and a confirmation appears (see Post-create). Cancel or Escape closes it, with a confirmation prompt only if the form has unsaved input.

## Layout

### Desktop ≥1024px (verified at 1440×900)

```
[ Header: product name                                              ]
[ H1 Training sessions · subtitle                  [Create session] ]
[ Filter bar: Search | Status | Clear filters                       ]
[ Result summary + live count     ][                                 ]
[ Sessions table (flexible width) ][ Details panel (360px, sticky)   ]
```

- Page padding 24px. Table and panel are full-height work surfaces separated by a divider.
- Details panel is shown only when `session` is set. Otherwise the table takes full width. It is a non-modal `<aside aria-labelledby>` region: the list stays interactive, and selecting another row swaps the panel content.
- Table columns: Session (title link, then type · location below), Start (date and time, then duration), Coach, Capacity (booked / capacity plus bar), Status. The reference's columns are retained.
- The selected row is marked with `aria-current="true"` and a left border plus background (not color only).

### Tablet 720–1023px (not required; must not break)

- The table takes full width. Details opens as a modal sheet anchored right (max 420px).

### Mobile <720px (verified at 390×844)

- Header: product name only. Page padding 16px.
- "Create session" is a full-width primary button under the heading, 44px high.
- Filters stack: search (full width), status select (full width), "Clear filters" as a text button, with 44px targets.
- The table becomes a list of rows (`<ul>`). Each row is one link-bearing item:
  - line 1: title (link, wraps up to 2 lines then truncates), status badge on the right;
  - line 2: `Start · duration`;
  - line 3: `Coach · Location`, each truncated with ellipsis;
  - line 4: `booked / capacity` plus bar.
- Details opens as a full-screen modal sheet with a sticky header (title and "Back to sessions" button) and scrolling content. Create opens the same way, with a sticky footer holding Submit and Cancel.
- No horizontal page scroll at any width ≥320px: flex children use `min-width: 0`, long text wraps or truncates, and nothing uses fixed widths over 100%.

### Desktop create form

A modal dialog, max width 640px, centered, scrollable body, with Submit and Cancel in a footer. Fields use a two-column grid for short fields (date/time, duration/capacity, type/visibility) and one column for text fields. Below 720px the grid is one column.

## Components And Reuse Candidates

Feature-local (per architecture D5) until reuse is demonstrated: `StatusBadge`, `CapacityMeter`, `SessionsFilters`, `SessionsTable` (with mobile list variant), `SessionDetailsView` (content shared between panel and sheet), `CreateSessionForm`, `ResultBanner`, `ErrorState` (message, code optional, Retry), `Field` (label, hint, error association). `Dialog` and `Sheet` use native `<dialog>` with `showModal()` for modal modes (built-in focus trap, Escape, inert background).

## Status Indicators (non-color)

| Status | Label | Symbol (decorative, `aria-hidden`) | Token |
| --- | --- | --- | --- |
| scheduled | Scheduled | calendar | success |
| full | Full | filled circle | warning |
| cancelled | Cancelled | ✕ | danger |
| completed | Completed | ✓ | text-muted |

The badge always shows the text label. The symbol is supplementary. Colors meet 4.5:1 for text on the badge tints (to be verified in browser evidence; adjust tint, not text, if a pair fails). Capacity bar: width is booked / capacity. It is exposed as `role="meter"` with `aria-valuenow`, `aria-valuemin=0`, `aria-valuemax`, and text "14 of 18 places booked". A full session also shows the "Full" badge.

## Interaction Rules

### Search and filters

- Search is `<input type="search">` with a visible label ("Search sessions", placeholder "Title, coach, or location…"), `autocomplete="off"`, and `spellcheck=false`. Typing is debounced (300ms) before it updates the URL and triggers the request. Pressing Enter applies immediately.
- Status is a native `<select>` with "All statuses" plus the four statuses. It applies immediately.
- "Clear filters" is a button, shown only when a filter is active (enabled state is preferred over layout shift: it stays in the layout, `hidden` when inactive, and the bar has a fixed height). It resets search and status, and moves focus to the search input.
- The result summary, "N sessions" (or "1 session"), lives in a `role="status"` region (polite). It also announces "Updating…" while refetching.
- Order is as returned by the API (no client-side sort controls in v1).

### Opening details

- The session title in each row is a real link (`<a href="?…&session=ID">`) carrying current filters. Ctrl/Cmd/middle-click open it in a new tab. A plain click uses in-app navigation (no reload).
- Rows themselves are not click targets with handlers on `<div>`. The whole-row hit area may be extended with CSS on the link only.
- Details panel/sheet heading is an `<h2>` with the session title and receives focus when opened in modal mode. In panel mode, focus moves to the panel heading (`tabindex=-1`) on open.
- Close: "Back to sessions" button (labelled), Escape (modal mode), and browser Back. On close, focus returns to the originating row link when it exists, otherwise to the list heading.
- Deep link: loading `?session=ID` directly opens details over the list built from the other URL params.

### Create form

Fields in order, all with visible `<label>`, `name`, and `autocomplete="off"`:

| Field | Control | Notes |
| --- | --- | --- |
| Title | text | Hint "3–80 characters". |
| Session type | select | Training, Camp, Private. Default Training. |
| Date | `type="date"` | `min` is today (local). |
| Start time | `type="time"` | Local time. |
| Duration (minutes) | `type="number"` `inputmode="numeric"` | 30–240. Default 60. |
| Coach | select | Placeholder option "Select a coach…". |
| Location name | text | 2–80. |
| Location address | text | 3–120. |
| Capacity | `type="number"` `inputmode="numeric"` | 1–100. No default. |
| Visibility | radio group (Public, Invite-only) | Default Public. Single hit target per label. |
| Description | textarea | Optional. |
| Trainer notes | textarea | Optional. Live counter "0 / 500" (not announced per keystroke). |

Defaults for type, duration, and visibility are design defaults, and none is a contract requirement.

- Validation uses the pure model functions (architecture D5). Errors show on blur once a field is touched, and for all fields on submit. Each error is text beneath the control, linked with `aria-describedby`, with `aria-invalid="true"` on the control. Errors say how to fix: "Enter a title of 3–80 characters."
- On submit with errors, no request is sent. Focus moves to the first invalid control, and an error summary at the top of the form (`role="alert"`) lists the errors as links to the fields.
- Date and time: errors "Choose a start time in the future." attach to the Date field (or Time if the time is missing).
- The Submit button stays enabled until the request starts. While pending it shows "Creating…", keeps its width, and is `aria-disabled` and ignores activation. The form remains visible, and the other controls are not disabled (so entered values never visually vanish), but edits are allowed and ignored by that submission.
- Server `400`: `fieldErrors` keys map to fields (title, startsAt → Date/Time, durationMinutes, coachId, locationName, locationAddress, capacity, trainerNotes). Unmapped errors, and non-400 failures, go in a form-level `role="alert"` message above the actions: "The session could not be created. Your entries are kept. Try again." with the server message shown. Entered values are preserved in all failure cases.
- Coaches state: while loading, the coach select shows "Loading coaches…" and is disabled, and Submit is aria-disabled. On error, an inline `ErrorState` with Retry replaces the select, and Submit is aria-disabled with the reason in text ("Coaches must load before you can create a session.").
- Closing with unsaved input asks for confirmation ("Discard this session? Your entries will be lost." Buttons: "Keep Editing", "Discard"). A `beforeunload` guard applies while the form is dirty. Closing a pristine form needs no confirmation.

### Post-create (resolves requirement question 4)

On `201`:

1. The dialog closes. Focus moves to the confirmation banner.
2. A banner (`role="status"`) appears at the top of the list region: "Session “{title}” was created." with the actions **Open session** (link to `?session=ID`) and, only when the refetched list does not include the new id, **Reset filters** plus the line "It's hidden by your current filters."
3. The list refetches (architecture D2). The banner persists until dismissed ("Dismiss" button), a new create, or opening that session.
4. Refinement of architecture D2: the session is not auto-opened. The data layer exposes the created session id and the hidden-by-filters boolean, and the UI chooses the banner. This keeps the filter context stable and satisfies "provide a clear action to open the new session or reset the filters".

### Details content

Order: heading (title), status badge, then a definition list: Type, Start (full local date and time), Duration, Visibility, Location (name and address), Coach (name, `mailto:` email link), Capacity (text "14 booked of 18 places", meter, remaining places), Description, Trainer notes, Created, Last updated. Missing description or notes shows "None added". Cancelled sessions add a "Cancellation" group with reason (or "No reason given") and the time cancelled. Long text wraps (`overflow-wrap: anywhere`); notes preserve line breaks.

## State Matrix

| Surface | State | Behavior |
| --- | --- | --- |
| List | Initial loading | Header, filters, and heading render at once. The list region shows 5 skeleton rows (stable height) and a visually hidden "Loading sessions…" in a status region. Skeletons have no motion under reduced-motion. |
| List | Populated | Table or mobile list. Summary "N sessions". |
| List | Refetching | Existing rows stay. The summary shows "Updating…". The list region has `aria-busy="true"`. No layout jump. |
| List | No sessions exist (no filters active, total 0) | Empty state: "No sessions yet." with the hint "Create your first training session." and a **Create session** button. |
| List | Filters, no matches | "No sessions match your filters." with the active filter summary and a **Clear filters** button. |
| List | Request failed | In-region `ErrorState`: "Sessions can't be loaded right now." plus the server message, **Try again** button. Header, filters, and Create stay usable. If stale rows exist, they stay with an inline error banner above them. |
| Details | Loading | Skeleton of the details layout and a "Loading session…" status. The panel or sheet and the close control are already usable. |
| Details | Loaded | As above. |
| Details | Failed (500) | `ErrorState` in the panel or sheet: "Session details can't be loaded right now." **Try again**, **Back to sessions**. |
| Details | Not found (404) | "This session no longer exists." with **Back to sessions** (no retry). |
| Create | Idle | Form with defaults. |
| Create | Coaches loading / failed | As described in the Create form section. |
| Create | Client validation failure | Field errors, error summary, focus on the first invalid control. |
| Create | Pending | "Creating…" on the button, stable size, no duplicate submit. A polite status "Creating session…". |
| Create | Server validation failure (400) | Field errors mapped, summary shown. |
| Create | Server failure (500 or network) | Form-level alert. Values preserved. The user can resubmit. |
| Create | Success | Post-create banner (see above). |
| Permission | Not applicable | Read-only and cancel are optional extensions. There is no disabled mutation state in v1. |
| Destructive | Only "Discard unsaved form" | Explicit labels with confirmation. |

## Accessibility

- Landmarks: `<header>`, `<main>` (one `h1`: "Training sessions"), a filter `<search>`/`role="search"` region, the details `<aside>`, and dialogs. A "Skip to sessions" link is the first focusable element.
- Heading order: h1 page, h2 sections (results, Session details, Create session), h3 inside details groups only if needed.
- Table: native `<table>` with `<caption class="visually-hidden">`, `<th scope="col">`, and numeric columns using `tabular-nums`. The mobile list is a `<ul>` with equivalent text for every field, so no information is lost.
- Focus: `:focus-visible` 2px outline using the `focus` token with a 2px offset on every interactive element. There is no `outline: none` without replacement. Focus order follows visual order. Modal mode traps focus through `<dialog>`, and background content is inert.
- Announcements: `role="status"` for result count and loading, create pending, and the success banner. `role="alert"` for form-level and request errors. Field errors are associated with `aria-describedby`. Live regions exist in the DOM before their content changes.
- Contrast: text 4.5:1, controls and focus 3:1. `text-muted` on `canvas` and the badge tints must be checked in browser verification.
- Targets: controls 40px minimum, and 44px minimum on mobile.
- Pages: document title reflects the view ("Training sessions", "Create session · Training sessions", or the session title). Never user-scalable disabled.
- Motion: only short opacity transitions on the sheet and dialog (≤150ms). They are removed under `prefers-reduced-motion: reduce`. Skeleton shimmer is disabled under reduced motion. No `transition: all`.
- Locale: dates use `Intl.DateTimeFormat` in the user's locale and timezone. Formats: list "Mon, Aug 3, 18:00" style (locale-driven), details with full weekday and date. Duration is "90 min". Numbers use `Intl.NumberFormat`.

## Long Content And Density

- Title in list: up to 2 lines (desktop one line) with ellipsis, full text in details. Coach and location truncate with ellipsis and are fully shown in details.
- Title, notes, and address inputs have `maxlength` guards only for notes (500). Other limits are enforced by validation messages, not by blocking typing, so that pasted over-limit text is visible and correctable. Paste is never blocked.
- Five fixture rows is the expected size. Lists are not virtualized, and the page size remains 10 per contract.

## Testability Hooks (for the coder)

Behavior-level queries should work by role and accessible name: heading "Training sessions", textbox "Search sessions", combobox "Status", button "Clear filters", button "Create session", link per session title, dialog "Create session", textbox "Title", button "Create session" (submit, distinguished within the dialog), `status` and `alert` regions. Stable `data-testid` is not required.

## Unresolved Decisions

None blocking.

- Exact copy strings may be adjusted during implementation, provided the state meanings stay the same.
- Contrast of the badge tints is unverified until rendered. It is recorded as a browser-verify item.

## Implementation Implications

- Layout switches rely on CSS (grid and container or media queries at 720px and 1024px). No JS measurement.
- `SessionDetailsView` renders in either a panel or a `<dialog>`. The container decides from a media query via CSS where possible. Where JS must pick the mode (`dialog.showModal()` versus an inline aside), use `matchMedia` in one place.
- Native `<dialog>` support and focus restoration are reliable in current browsers but are verified in browser evidence.
- `specs/ui-design.md` is not updated, because nothing is implemented or verified yet.
