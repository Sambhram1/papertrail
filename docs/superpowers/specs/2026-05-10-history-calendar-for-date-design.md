# PaperTrail History Calendar (For Date)

## Summary

Add a history side panel with a date picker and mini intake so users can save uploads and links for a specific date. Keep the existing "Saved by day" timeline, but add a mode toggle that switches grouping between the real save date (`createdAt`) and the selected intent date (`forDate`). The calendar selection jumps the timeline to that day without filtering.

## Goals

- Let users attach items to a chosen date (past or future).
- Preserve the true saved timestamp while also storing the user-selected date.
- Provide a side panel on the History page for quick add and date selection.
- Allow history to switch between "Saved by day" and "For date" grouping.

## Non-goals

- Range selection (single-date only in this phase).
- Background reminders or notifications.
- Per-item editing of saved dates after creation.
- Replacing the main intake on the Capture page.

## User Experience

### History page layout

- Keep the existing timeline in the main column.
- Add a right-side panel containing:
  - A date picker labeled "For date" (used for new saves and for jumping in `saved` mode).
  - Helper text under the picker: "Used for new saves. It also jumps to that date in the current view."
  - A compact intake flow (image/PDF upload + link/text paste) for quick saves.
  - A button to open the full Capture intake (routes to `/?forDate=YYYY-MM-DD#capture`).

### Responsive behavior

- Desktop: timeline in the main column with the side panel on the right.
- Small screens: side panel collapses into a stacked section below the header with an "Add for date" toggle button to expand/collapse.
- Default state on small screens: expanded on first load, then stays collapsed/expanded only for the current session (no persistence).

### Timeline modes

- Add a toggle above the timeline:
  - "Saved by day" (group by `createdAt`).
  - "For date" (group by `forDate`; items without `forDate` appear in a "No date" group).
- Selected date in the side panel scrolls/jumps to the matching group in the current mode.
- If no group exists for the selected date, show a subtle inline note in the side panel: "No items for this date in your latest 50 saves." Add helper text: "Showing the latest 50 items by save date." The note appears only after an explicit date change or mode toggle (never on initial load), only after history has finished loading, and clears on date/mode changes or after a successful save/data refresh for that date.

### Card labeling

- If an item has `forDate`, show a small pill such as "For May 10" on the card.
- Keep the rest of the card structure unchanged.

## Data Model

### Client type

- Extend `AnalysisResult` with an optional `forDate?: string | null`.
- Format is ISO date string `YYYY-MM-DD` (local date) to avoid time zone ambiguity.

### Database

- Add a nullable `for_date` column on `papertrail_analyses` as a `date` type.
- Mapping:
  - `forDate` (string) -> `for_date` (date)
  - `for_date` -> `forDate` in API responses (string)

## API and Storage

- `/api/analyze` accepts a `forDate` field on the `FormData` payload and stores it.
- Validation: if `forDate` is missing or invalid, store `null` and continue.
- Supabase row mapping in `toAnalysisRow` and `fromAnalysisRow` includes `for_date`.
- `GET /api/analyses` and `GET /api/analyses/:id` return `forDate` with each item.

## UI Components

### History page

- New `HistorySidePanel` component (or an extension of `HistoryList`) for:
  - Date picker state.
  - Compact intake (reuse `IntakePanel` in compact mode or create `MiniIntakePanel`).
  - Navigation button to full capture.
  - Passes `forDate` to the intake flow as a string in `YYYY-MM-DD` format.

### ActivityFeed

- Extend grouping function to accept a `mode`:
  - `saved`: group by `createdAt`
  - `forDate`: group by `forDate` and isolate untagged items into a "No date" group
- Provide a stable `dateKey` (ISO `YYYY-MM-DD`) to create anchors for jump/scroll.
- Normalize keys via a single helper: `toDateKey(value)` which returns `YYYY-MM-DD` for timestamps (local date) and passes through valid `forDate` strings.
- Anchor id schema: `day-YYYY-MM-DD` on each group container. The "No date" group uses `day-none` and is not a jump target.
- Add `scroll-margin-top` to group containers to account for the sticky header.

## Behavior Details

- Default timeline mode: "Saved by day".
- Default selected date: today (`new Date()` normalized to `YYYY-MM-DD`).
- Saves from the History side panel always attach the current selected `forDate`.
- The "No date" group covers items saved without `forDate` (legacy items or saves from Capture without a `forDate` param).
- Switching timeline modes jumps to the selected date if a matching group exists; otherwise, it leaves scroll position unchanged and shows the "No items" note.
- Jump behavior: on explicit date changes or mode toggles, but never on initial page load.
- Jump behavior uses `scrollIntoView({ behavior: 'smooth' })` on the group anchor and falls back to instant scroll when `prefers-reduced-motion` is set.
- Capture page deep-link: when `forDate` is present on `/?forDate=YYYY-MM-DD#capture`, parse + validate it and prefill the intake date; the value is sent to `/api/analyze` as `forDate`. If invalid or missing, ignore it and proceed without `forDate`.
- After a successful side-panel save, optimistically insert the returned analysis into the history list and re-run grouping (no full reload). This also clears the "No items" note when applicable.
- History loading remains the most recent 50 items by `createdAt` in this phase; date jumps only operate within the loaded range.

## Error Handling

- If `forDate` is malformed, treat it as `null` (so it appears in the "No date" group in `forDate` mode).
- If the timeline anchor is not found, do not auto-scroll; show the "No items for this date in your latest 50 saves" note.

## Testing

- Unit tests for grouping logic in both modes.
- Round-trip tests for `forDate` mapping to and from Supabase rows.
- Deep-link parsing tests for `/?forDate=YYYY-MM-DD#capture` (valid + invalid).
- Scroll behavior tests (date change vs. mode toggle vs. initial load).
- "No items" note lifecycle tests (clears after save/refresh).
- UI check for the "For date" pill rendering when `forDate` is present.

## Date and Timezone Rules

- `forDate` is treated as a local calendar date, stored as `YYYY-MM-DD`.
- `createdAt` is grouped by the user's local date (not UTC).
- Anchor keys are generated as local `YYYY-MM-DD` strings for both modes.

## Ordering Rules

- "Saved by day": groups sorted by `createdAt` descending; items sorted by `createdAt` descending.
- "For date": groups sorted by `forDate` descending; the "No date" group appears last; items sorted by `createdAt` descending.

## Validation Rules

- `forDate` must match `YYYY-MM-DD` and represent a valid calendar date.
- Server validation uses a strict date check (year, month, day) without timezone conversion.
- Persist `forDate` as the raw `YYYY-MM-DD` string; do not serialize via `Date` to avoid off-by-one shifts.

## Data Contract

- Intake components pass `forDate` as a `string | undefined` prop to the analyze handler.
- `/api/analyze` expects the `FormData` key `forDate` (string `YYYY-MM-DD`).

## Rollout Notes

- Add SQL migration in `supabase/schema.sql` to include `for_date`.
- Backfill is not required; existing rows will return `null` for `forDate`.
