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
  - A date picker labeled "For date".
  - A compact intake flow (image/PDF upload + link/text paste) for quick saves.
  - A button to open the full Capture intake (routes to `/?forDate=YYYY-MM-DD#capture`).

### Responsive behavior

- Desktop: timeline in the main column with the side panel on the right.
- Small screens: side panel collapses into a stacked section below the header with a "For date" toggle button to expand/collapse.

### Timeline modes

- Add a toggle above the timeline:
  - "Saved by day" (group by `createdAt`).
  - "For date" (group by `forDate`, fallback to `createdAt` if missing).
- Selected date in the side panel scrolls/jumps to the matching group in the current mode.
- If no group exists for the selected date, show a subtle inline note in the side panel: "No items for this date yet." The note clears on date/mode changes or after a successful save/data refresh for that date.

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

### ActivityFeed

- Extend grouping function to accept a `mode`:
  - `saved`: group by `createdAt`
  - `forDate`: group by `forDate ?? createdAt`
- Provide a stable `dateKey` (ISO `YYYY-MM-DD`) to create anchors for jump/scroll.

## Behavior Details

- Default timeline mode: "Saved by day".
- Default selected date: today (`new Date()` normalized to `YYYY-MM-DD`).
- Saves from the History side panel always attach the current selected `forDate`.
- Switching timeline modes jumps to the selected date if a matching group exists; otherwise, it leaves scroll position unchanged and shows the "No items" note.
- Jump behavior: on explicit date changes or mode toggles, but never on initial page load.
- Jump behavior uses `scrollIntoView({ behavior: 'smooth' })` on the group anchor.
- Capture page deep-link: when `forDate` is present on `/?forDate=YYYY-MM-DD#capture`, parse + validate it and prefill the intake date; the value is sent to `/api/analyze` as `forDate`. If invalid or missing, ignore it and proceed without `forDate`.

## Error Handling

- If `forDate` is malformed, ignore it and fallback to `createdAt` for grouping.
- If the timeline anchor is not found, do not auto-scroll; show the "No items for this date yet" note.

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
- "For date": groups sorted by `forDate` descending (fallback to `createdAt` date when `forDate` is null); items sorted by `createdAt` descending.

## Validation Rules

- `forDate` must match `YYYY-MM-DD` and represent a valid calendar date.
- Server validation uses a strict date check (year, month, day) without timezone conversion.
- Persist `forDate` as the raw `YYYY-MM-DD` string; do not serialize via `Date` to avoid off-by-one shifts.

## Rollout Notes

- Add SQL migration in `supabase/schema.sql` to include `for_date`.
- Backfill is not required; existing rows will return `null` for `forDate`.
