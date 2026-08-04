# LAKE-EPIC-010 — Tasks: Favorites

Epic: [LAKE-EPIC-010](../epics/LAKE-EPIC-010-favorites.md). Global [definition of done](../../agents/definition-of-done.md) applies. Lane C begins here.

---

## LAKE-043 — Local favorites store and toggles

**Status:** open · **Phase:** MVP/M4 · **Parallel:** yes (lane C)

**Objective:** REQ-FAV-01/02/03: the IndexedDB favorites store (sync-ready record shape) and heart toggles on cards, mini-cards, and detail pages — fully offline, zero server contact.

**User story:** As a visitor comparing options, I want to heart attractions instantly without an account so shortlisting feels effortless.

**Context:** [favorites-and-plans.md#favorites](../../ux/favorites-and-plans.md#favorites), [ADR-004](../../adr/ADR-004-anonymous-favorites.md), [auth-and-anonymous-usage.md#anonymous-data-model](../../architecture/auth-and-anonymous-usage.md#anonymous-data-model).

**In scope:** thin IndexedDB wrapper (`packages/domain` interface + web implementation; versioned schema; `{attractionId, addedAt, syncState:'local'}`); persistent-storage API request (iOS eviction mitigation, R-14); optimistic heart toggle component with undo-free instant semantics; reactive favorite-state across views (same tab); storage-unavailable fallback (private-mode: session-memory + notice); More-tab data note ("clearing browser data deletes favorites").
**Out of scope:** favorites screen (LAKE-044), server sync (phase 1.5), plan store (LAKE-045 reuses the wrapper).

**Dependencies:** LAKE-029, LAKE-040 (toggle surfaces). **Files:** `packages/domain/src/local-store/*` (interface), `apps/web/src/local-store/*`, `components/favorite-toggle/*`.

**Domain rules:** store holds IDs + metadata only — no content duplication.
**API changes:** none (that is the point). **DB changes:** none server-side.
**UI states:** toggle instant (no spinner); storage-unavailable notice; toggle disabled state for unpublished (edge).
**DE/EN:** labels/notices localized.
**A11y:** toggle as pressed-state button (`aria-pressed`) with accessible name incl. attraction ("Insel Mainau als Favorit speichern"); state change announced; ≥44 px target.
**Privacy/security:** zero network traffic for favorites (network-assertion test); no identifiers created.

**Acceptance criteria:**
- [ ] Toggling persists across reloads and offline; zero requests observed
- [ ] Record shape includes `syncState`; wrapper versioning upgrades cleanly (migration test v1→v1.1 dummy)
- [ ] Private-mode fallback works with visible notice
- [ ] SR announces both states correctly in both locales

**Tests:** Unit: wrapper (fake IDB), migration. E2E: toggle persistence + offline toggle + network-silence assertion.
**Manual validation:** iOS Safari + Android Chrome device check.
**Commands:** `pnpm test -g favorites-store`. **Rollback:** additive component; revert leaves local data harmless.

---

## LAKE-044 — Favorites screen

**Status:** open · **Phase:** MVP/M4 · **Parallel:** yes (after 043)

**Objective:** The Favorites tab: saved attractions with live current data, standard sorting/filtering, unpublished-item degradation, and add-to-plan integration.

**User story:** As Familie Weber (P3), I want yesterday evening's shortlist ready on the tab with current open-states so the morning decision is instant.

**Context:** [favorites-and-plans.md#behaviour](../../ux/favorites-and-plans.md#behaviour).

**In scope:** favorites list resolving IDs → current cards via batched API (`GET /api/attractions?ids=…` — small param addition included here); live open-state/distance on cards; sort (added-date default, distance, relevance) + standard filter reuse; unpublished/merged favorites as disabled cards with explanation + remove (aliases resolved to survivor with notice); empty state (educational, discover CTA); offline: cached card data where available, offline banner.
**Out of scope:** collections/multiple lists (later idea), sharing favorites (not a feature).

**Dependencies:** LAKE-043, LAKE-028 (+ ids param), LAKE-036 (filter reuse). **Files:** favorites route, `ids` param extension, screen components.

**Domain rules:** details re-fetched, never frozen; alias resolution follows merge protocol.
**API changes:** `ids` param on list endpoint (cap 100). **DB changes:** none.
**UI states:** loading skeletons; empty (no dead end); partial-failure (some IDs unresolvable → disabled cards); offline cached view.
**DE/EN:** localized; disabled-card explanations localized.
**A11y:** list semantics as Discover; disabled cards announced with reason; remove buttons labelled per item.
**Privacy/security:** ids param carries IDs only (public identifiers); cap prevents abuse.

**Acceptance criteria:**
- [ ] Favorited fixtures render with live open-state; sort/filter work
- [ ] Unpublishing a favorited fixture yields the disabled-card treatment; merged alias resolves with notice
- [ ] Offline shows cached favorites with banner
- [ ] Empty state converts to Discover

**Tests:** Integration: ids param, alias resolution. E2E: favorite → tab → detail round trip; unpublish scenario. Unit: sort logic.
**Manual validation:** device walkthrough incl. airplane mode.
**Commands:** `pnpm test:e2e -g favorites`. **Rollback:** screen revert; store untouched.
