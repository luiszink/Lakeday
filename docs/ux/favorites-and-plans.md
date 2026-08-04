# Favorites and plans UX

Status: **recommendation** (UX), **architectural decision** (local-first storage, share model — [ADR-004](../adr/ADR-004-anonymous-favorites.md)).

## Favorites

### Behaviour
- Heart icon on list cards, map mini-cards, and detail pages; toggling is instant and optimistic (REQ-FAV-01/02).
- Favorites tab shows saved attractions with the same card layout, current open-state, and distance; supports sort and the standard filters.
- If a favorited attraction is unpublished/removed later, it renders as a disabled card with an explanatory note ("no longer available") and a removal option — favorites reference attraction IDs, and details are re-fetched, not frozen.

### Storage (decision)
- IndexedDB (via a thin wrapper) storing `{attractionId, addedAt}` only; no attraction content is duplicated.
- No server round trip, no cookies, no account (REQ-FAV-01). Storage survives PWA installation; users are informed (More tab) that clearing browser data deletes favorites.
- **Later sync path (REQ-FAV-03):** the record shape already contains a `syncState` field placeholder; when optional accounts arrive (phase 1.5+), local records merge server-side by `(attractionId, addedAt)` union. No MVP server work needed — see [../architecture/auth-and-anonymous-usage.md](../architecture/auth-and-anonymous-usage.md#future-optional-accounts).

## My Day (manual plan)

Full functional spec: [../planning/manual-planner.md](../planning/manual-planner.md). UX summary:

- Persistent "My Day" tab with a stop-count badge; adding from anywhere shows a non-blocking confirmation toast with an "Undo" action.
- Plan screen: date picker · starting-point selector (current position / place search / accommodation) · ordered stop list with per-stop cards (name, planned visit duration, arrival estimate, open-state for the chosen date) · total-duration bar · conflict warnings inline on affected stops.
- Reordering: drag handles on desktop; explicit ↑/↓ buttons on mobile and for keyboard/screen-reader users ([../quality/accessibility.md](../quality/accessibility.md)).
- One active plan in the MVP ("My Day"); saving snapshots it into a local plan list ("My plans") — multiple *saved* plans are allowed, one *editable* current plan keeps the mental model simple. (Recommendation; revisit if metrics show multi-day planning demand.)

## Shared plans {#shared-plans}

- "Share" serializes the current plan to the server and returns `/{locale}/plan/{token}` (REQ-PLAN-08/09). Until first share, plans are purely local.
- Token: ≥128-bit URL-safe random, unguessable, no enumeration endpoint ([../architecture/auth-and-anonymous-usage.md](../architecture/auth-and-anonymous-usage.md#share-tokens)).
- Shared view is read-only; recipients "Copy to My Day" to edit their own copy (F4 in [core-user-flows.md](core-user-flows.md#f4-open-a-shared-plan)).
- Re-sharing after edits creates a **new** snapshot/token (immutable snapshots — simplest consistent model; the old link keeps showing the old plan with a "newer version may exist" note only if the sharer created it — not tracked across devices).
- Shared plans store: stop IDs + order, date, starting point **as coordinates rounded to ~100 m** (privacy: exact home addresses are not persisted server-side; [../quality/security-and-privacy.md](../quality/security-and-privacy.md#location-data)).
- Retention: shared plans expire 12 months after last access (documented in privacy policy; configurable).

## Print / export (REQ-PLAN-10)

Print stylesheet renders: plan date, stops in order with name, municipality, planned arrival, visit duration, opening hours for that date, address, official URL as printed text, and a static overview map image (or stop list only if the static map provider is unavailable). "Export" in MVP = browser print-to-PDF; no server-side PDF generation (avoid infra for marginal benefit — later idea).
