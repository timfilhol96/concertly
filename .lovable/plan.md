# Interactive "Refresh all info"

Today `Refresh all info` silently runs `lookupSetlist` for each show, taking the first match and writing it back. We'll turn it into a guided flow that pauses on ambiguity and degrades gracefully when something can't be found.

## Behavior per show

For each concert, in order:

1. **Resolve the artist on Deezer** (used for image + genre).
   - 0 results → prompt: "Artist not found — pick the closest match" with the top 8 Deezer search results (or `Skip` / `Keep as-is`).
   - 2+ distinct artists with the same/similar name → prompt: "Multiple artists named X — which one?" showing name + thumbnail + genre + fan count for each.
   - Exactly 1 → use it.

2. **Look up the show on setlist.fm** (artist + date).
   - Found:
     - Run the existing co-performer search at that venue/date.
     - If 1+ co-performers exist → prompt: "Other artists played here. Which to log, and who headlined?" (multi-select + headliner radio). User can also skip.
     - Save the headliner update + create new concerts for each selected co-performer (mirrors the existing add-page co-performer flow).
   - Not found → fall back: keep date/venue/etc., but still update `artist_image_url` and `genre` from the Deezer artist picked in step 1. Tour stays blank.

3. **Cancel / Skip controls** in every modal:
   - `Skip this show` (move on, leave concert unchanged for this field).
   - `Cancel refresh` (stop the whole batch, keep what's already saved).

A persistent progress bar `Refreshing 7 / 42` stays visible above the modal.

## Technical changes

### `src/lib/setlistfm.functions.ts`
- Already exports `searchArtists` (Deezer) returning `{ name, image }`. Extend `ArtistSuggestion` with `genre: string | null` and `nbFan: number | null` so the disambiguation modal is useful.
- Add `lookupDeezerArtistById(id)` → `{ image, genre }` so once the user picks a specific Deezer artist we can pull image + genre for *that* artist (not the top text-search hit).
- Add `refreshConcertProbe` server fn that, given `{ artist, date, venue, excludeArtists }`, returns a discriminated result the client drives the UI from:
  ```
  | { kind: 'ok', setlist: SetlistLookupResult, coPerformers: CoPerformer[] }
  | { kind: 'not_found_show', deezer: { image, genre } | null }
  ```
  Artist disambiguation is handled separately on the client via `searchArtists` so we don't tangle two concerns in one server call.

### `src/routes/_authenticated/shows.tsx`
- Replace the current `handleRefreshAll` loop with a small state machine:
  ```
  idle → for each concert:
    pickArtist → probeShow → (pickCoPerformers?) → write → next
  ```
- Add a `<RefreshWizard>` overlay component (modal-style) with four panes keyed by the current question:
  - `ArtistDisambiguationPane` (also used for "artist not found, pick closest")
  - `CoPerformerPane` (reuses the same UX as the add page — checkboxes + headliner crown)
  - `NotFoundConfirmPane` (one-line confirmation: "Show not found — apply image + genre only?")
- All decisions resolve a `Promise` so the loop awaits each modal.
- Writes go through the existing `useUpdateConcert` and `useAddConcert` mutations; nothing changes server-side for writes.

### Edge cases
- Multiple shows by the same artist in the batch: cache the artist's Deezer pick by lowercase name so we only ask once per artist per session.
- Co-performer already in the user's archive on the same date → exclude from the "log additional artists" list (we don't want duplicates).
- Network/timeout on any probe → modal offers `Retry` / `Skip`.

## Out of scope
- No changes to the per-show add page.
- No changes to single-show refresh (the page-level `Auto-fill` button); that stays as-is.
- No persistence of the wizard's progress — closing the tab cancels what's left.
