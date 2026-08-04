# LAKE-EPIC-007 — Tasks: Map

Epic: [LAKE-EPIC-007](../epics/LAKE-EPIC-007-map.md). Global [definition of done](../../agents/definition-of-done.md) applies. Order: 032 → 033 → 034 → 035 (034/035 partly parallel).

---

## LAKE-032 — Map provider abstraction

**Status:** open · **Phase:** MVP/M3 · **Parallel:** no (before other map tickets)

**Objective:** The `MapProvider` interface + MapLibre GL adapter + test fake, with tile-provider configuration, attribution metadata, and lazy loading — per [ADR-005](../../adr/ADR-005-map-provider-abstraction.md).

**User story:** As the team, we want to swap tile providers by config so seasonal cost/limit surprises never force a rewrite.

**Context:** [external-services.md#map-tiles](../../architecture/external-services.md#map-tiles) (⚠️ provider terms verified here), [map-and-list-behaviour.md](../../ux/map-and-list-behaviour.md#provider-abstraction).

**In scope:** interface (init/destroy, setMarkers, cluster config, fitBounds, viewport events, locate-dot, attribution retrieval); MapLibre adapter loading style/tiles from `MAP_TILE_URL`/key; deterministic fake adapter (renders marker data as DOM list for tests); dynamic import boundary (map bundle excluded from initial route JS — budget test); attribution component rendering provider + OSM credits non-dismissable; provider terms verification checklist executed and recorded.
**Out of scope:** the map screen (LAKE-033), clustering tuning (033), offline tile caching (LAKE-057).

**Dependencies:** LAKE-001; tile account (external). **Files:** `apps/web/src/providers/map/{types,maplibre,fake}.ts`, `components/map/attribution.tsx`.

**Domain rules:** none. **API changes:** none. **DB changes:** none.
**UI states:** adapter init failure surfaces a typed error the screen (035) turns into fallback.
**DE/EN:** attribution text per provider requirement (not translated where legally fixed).
**A11y:** interface exposes hooks for keyboard handlers + marker accessible names (033 consumes).
**Privacy/security:** tile key restricted by referrer where provider supports; no user coords to tile hosts beyond inherent tile requests (documented).

**Acceptance criteria:**
- [ ] Feature code compiles against the interface only (lint rule: no `maplibre-gl` import outside adapter)
- [ ] Swapping to fake via env/config renders the DOM-list map in e2e
- [ ] Initial-route JS budget unchanged (bundle analysis assertion)
- [ ] Terms/attribution verification recorded in external-services.md

**Tests:** Unit: adapter mapping logic. Integration: n/a. E2E: fake-adapter smoke.
**Manual validation:** real tiles render locally with test key.
**Commands:** `pnpm test -g map-provider`. **Rollback:** interface stays; adapter swap by config.

---

## LAKE-033 — Map view

**Status:** open · **Phase:** MVP/M3 · **Parallel:** no (after 032)

**Objective:** The Discover map: category markers, clustering, bbox querying with truncation handling, marker mini-cards, and "search this area".

**User story:** As a visitor, I want to see what is around me spatially so I can pick something in the right direction.

**Context:** [map-and-list-behaviour.md#map-behaviour](../../ux/map-and-list-behaviour.md#map-behaviour); `bbox` param on the list API.

**In scope:** `bbox` param in `GET /api/attractions` (cap 200, relevance-prioritized, `truncated` flag — server work included here); map screen at `/{locale}/karte|map`; initial whole-lake viewport; clustering >50 markers with spiderfy at max zoom; debounced viewport queries (300 ms) behind explicit "search this area" for pan (auto for zoom); marker tap → bottom-sheet mini-card (reuses card component) → detail; selected-marker state; user-location dot (from LAKE-031 opt-in state).
**Out of scope:** list sync (LAKE-034), degradation (LAKE-035), filter wiring verification (LAKE-036 scope).

**Dependencies:** LAKE-032, LAKE-028/029. **Files:** map route, `components/map/*`, API bbox extension.

**Domain rules:** map result set = list result set semantics (same query params). **API changes:** `bbox` param. **DB changes:** none (GiST index exists).
**UI states:** tiles loading; zero-in-viewport ("no attractions here — zoom out"); truncated notice; marker-fetch error toast with retry.
**DE/EN:** all map UI strings localized.
**A11y:** map keyboard zoom/pan when focused; markers with accessible names; the equivalence guarantee remains the list ([accessibility.md#map-alternative](../../quality/accessibility.md#map-alternative)); reduced motion: no fly-to.
**Privacy/security:** viewport queries carry bbox only (inherently coarse).

**Acceptance criteria:**
- [ ] Whole-lake view clusters sensibly on fixtures; cluster→zoom→spiderfy works
- [ ] bbox responses capped with truncation flag; UI communicates it
- [ ] Mini-card opens detail; back returns to the same viewport
- [ ] axe + keyboard checks pass; reduced-motion verified

**Tests:** Integration: bbox query + cap. E2E (fake adapter): marker interactions, area search. Visual: map screenshot.
**Manual validation:** real-tile mobile session around Konstanz fixtures.
**Commands:** `pnpm test:e2e -g map`. **Rollback:** map route removable; list unaffected.

---

## LAKE-034 — Map-list synchronization

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 033)

**Objective:** One result set, two views: segmented control, shared query state, hover/selection highlighting (desktop), and the mobile card carousel synced to visible markers.

**User story:** As a visitor, I want to flip between list and map without losing my filters or place.

**Context:** [map-and-list-behaviour.md#relationship](../../ux/map-and-list-behaviour.md#relationship-between-map-and-list).

**In scope:** List|Map segmented control preserving full query state via URL; desktop split view (≥1024 px) with bidirectional hover/selection highlight; mobile carousel of visible-marker cards synced on viewport change; map/list toggle analytics event slot.
**Out of scope:** filters themselves (LAKE-036/037).

**Dependencies:** LAKE-033. **Files:** discover layout, `components/map/carousel.tsx`, state hooks.

**Domain rules / API / DB:** none.
**UI states:** carousel empty mirrors map-empty; view switch reuses cached results (no needless refetch — test).
**DE/EN:** localized control labels. **A11y:** segmented control with proper tab/radio semantics; carousel keyboard-navigable and announced; hover-highlight has focus equivalent.
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Switching views preserves results and URL restorability at any state
- [ ] Desktop hover/selection highlight bidirectional; keyboard focus achieves the same
- [ ] Mobile carousel follows viewport; card tap centers its marker

**Tests:** E2E: sync scenarios both viewports (fake adapter). Unit: state mapping.
**Manual validation:** device check of carousel ergonomics.
**Commands:** `pnpm test:e2e -g map-sync`. **Rollback:** independent layer; revert safe.

---

## LAKE-035 — Map degradation and fallback

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 033)

**Objective:** REQ-DATA-07 for the map: tile/provider failure detection, styled fallback panel with automatic list fallback, failure metrics, and circuit-breaker behaviour.

**User story:** As a visitor on a dead zone or during a provider outage, I still want to find attractions — the map is an enhancement, not a dependency.

**Context:** [map-and-list-behaviour.md#offline--degraded-behaviour](../../ux/map-and-list-behaviour.md#offline--degraded-behaviour), [external-services.md#provider-failure-policy](../../architecture/external-services.md#provider-failure-policy-summary).

**In scope:** tile-error detection (failed tile/style-load threshold); fallback panel ("Map currently unavailable") with the result list rendered inline; automatic retry with backoff + manual retry; provider-failure metric events; circuit breaker preventing tile-request storms; e2e with blocked tile hosts.
**Out of scope:** offline tile caching (LAKE-057).

**Dependencies:** LAKE-033/034. **Files:** map error boundary, breaker util, metrics hook.

**Domain rules / API / DB:** none.
**UI states:** this ticket *is* the map's error/degraded story; no dead ends (list always reachable).
**DE/EN:** fallback copy localized, honest, non-technical.
**A11y:** degradation announced; focus handled on swap.
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Blocking tile hosts in e2e produces the fallback with usable list within 5 s; recovery on unblock + retry
- [ ] Breaker stops repeated tile hammering (network assertion)
- [ ] Failure metric emitted once per episode, not per tile

**Tests:** E2E: blocked-host scenario (provider-failure suite, [testing-strategy](../../quality/testing-strategy.md)). Unit: breaker logic.
**Manual validation:** dev-tools offline toggle on the map view.
**Commands:** `pnpm test:e2e -g map-fallback`. **Rollback:** protective layer; do not revert without replacement.
