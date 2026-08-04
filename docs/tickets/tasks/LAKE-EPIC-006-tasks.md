# LAKE-EPIC-006 — Tasks: List and search

Epic: [LAKE-EPIC-006](../epics/LAKE-EPIC-006-list-and-search.md). Global [definition of done](../../agents/definition-of-done.md) applies. Lane A begins here.

---

## LAKE-028 — Public attractions list API

**Status:** open · **Phase:** MVP/M2 · **Parallel:** no (lane A foundation)

**Objective:** `GET /api/attractions` returning published attraction cards with pagination, caching, base parameter validation, and rate limiting — the endpoint filters/search/map all extend.

**Context:** [api-contracts.md#get-apiattractions](../../architecture/api-contracts.md#get-apiattractions--listsearchfilter). This ticket implements the endpoint skeleton + card shape + `locale`/`cursor`/`limit`; `q` lands in LAKE-030, filter params in LAKE-036, `bbox` in LAKE-033, `near`/`sort` in LAKE-039.

**In scope:** zod-validated query parsing (unknown params rejected with helpful error); published-only query; `AttractionCard` projection incl. open-state via hours engine (from cached rules), freshness badge level, thumbnail ref; cursor pagination; cache headers (`s-maxage=60, stale-while-revalidate=300`); rate limit 120/min/IP; OpenAPI-ish contract doc generated from zod (markdown output committed).
**Out of scope:** search, filters, sorting, bbox (successor tickets).

**Dependencies:** LAKE-009/010, LAKE-012. **Files:** `apps/web/app/api/attractions/route.ts`, `packages/domain/src/api/attractions.ts` (schemas), query helpers in `packages/db`.

**Domain rules:** only `PUBLISHED`; open-state computed, never stored.
**API changes:** the endpoint. **DB changes:** none. **Migration:** none.
**UI states:** n/a (API). **DE/EN:** `locale` selects localization row; missing locale row impossible for published (invariant).
**A11y:** n/a. **Privacy/security:** rate limiting; no draft leakage (test); logs scrub query params containing coordinates (prep for LAKE-039).

**Acceptance criteria:**
- [ ] Returns fixture cards paginated; cursor stable under concurrent inserts
- [ ] Draft/archived never appear (test); open-state correct against hours fixtures
- [ ] Invalid params → 400 with path-precise messages; rate limit enforced (test with loop)

**Tests:** Unit: schema parsing. Integration: pagination, projection, publish filtering, cache headers. E2E: none.
**Manual validation:** curl against staging fixtures.
**Commands:** `pnpm test -g attractions-api`. **Rollback:** endpoint revert; no data.

---

## LAKE-029 — List UI

**Status:** open · **Phase:** MVP/M2 · **Parallel:** no (after 028)

**Objective:** The Discover list: mobile-first card list with infinite scroll, all four UI states, and the card component reused by map mini-cards, favorites, and plans.

**User story:** As Anna & Jonas (P1), I want to scan attractions quickly on my phone so choosing today's outing takes seconds.

**Context:** [information-architecture.md](../../ux/information-architecture.md), [core-user-flows.md F1](../../ux/core-user-flows.md#f1-discover-nearby).

**In scope:** card (name, category icon+label, municipality+region, open-state with icon+text, price level, duration band, distance slot, thumbnail with attribution overlay affordance, favorite-heart slot, freshness badge slot); virtualized/infinite list on cursor pagination; skeleton loading; empty state (educational, no dead end); error state with retry; offline banner integration point; ISR-rendered first page for SEO.
**Out of scope:** filters UI (LAKE-037), search box (LAKE-030), sort control (LAKE-039), favorites logic (LAKE-043).

**Dependencies:** LAKE-028, LAKE-005. **Files:** `apps/web/app/[locale]/(discover)/page.tsx`, `components/attraction-card/*`, `components/list/*`.

**UI states:** loading skeletons (reduced-motion-aware); empty (fixture-off scenario) with region suggestions; error retry; per-card stale badge (full logic LAKE-055 — slot now).
**DE/EN:** all card strings from catalogs; date/price formatting via LAKE-024 helpers.
**A11y:** cards as articles with complete accessible names; list semantics; result count announced via live region on updates; touch targets ≥44 px; images with editorial alt.
**Privacy/security:** no geolocation here (LAKE-031).

**Acceptance criteria:**
- [ ] 360 px + desktop render correct in both locales; infinite scroll stable
- [ ] All four states demonstrable (storybook-style fixture page or e2e screenshots)
- [ ] axe clean; SR announces card names + result updates
- [ ] First page server-rendered (view-source shows content)

**Tests:** Unit: card formatting logic. E2E: list browse + states (network mocks). Visual: screenshots both locales/viewports.
**Manual validation:** real device scroll performance.
**Commands:** `pnpm test:e2e -g list`. **Rollback:** UI revert.

---

## LAKE-030 — Full-text search

**Status:** open · **Phase:** MVP/M2 · **Parallel:** yes (after 028)

**Objective:** REQ-DISC-04: diacritics-insensitive, typo-tolerant search over localized names/summaries/municipality/tags with cross-locale name matching, integrated in API and list UI.

**Context:** [filter-and-search-behaviour.md#search](../../ux/filter-and-search-behaviour.md#search-req-disc-04), [database-schema.md#search-indexes](../../architecture/database-schema.md#search-indexes), OQ-7 (dictionary choice — default `simple`+unaccent).

**In scope:** FTS + `pg_trgm` indexes (additive migration incl. `unaccent` extension); `q` param implementation (prefix from 2 chars, fuzzy from 5, cross-locale name match, rank blending with relevance); search box UI (debounced, clearable, preserves filters); zero-result state defers to LAKE-039's hints (basic "no results for '…'" now).
**Out of scope:** search-suggestion dropdown (later idea), zero-result relaxation UI (LAKE-039).

**Dependencies:** LAKE-028/029. **Files:** migration, query helper, `components/search-box/*`.

**Domain rules:** search ANDs with filters. **API changes:** `q` param active. **DB changes:** indexes + extensions (additive).
**UI states:** searching indicator; zero-result basic state; error falls back to unfiltered list with notice.
**DE/EN:** query normalization identical per locale; cross-locale matching tested (`mainau island` in DE UI).
**A11y:** search input labelled; results-count live region; `type="search"` semantics.
**Privacy/security:** queries not logged raw (aggregated zero-result pipeline later, LAKE-063).

**Acceptance criteria:**
- [ ] `ueberlingen` finds Überlingen fixtures; `Pfalbauten` (typo) finds Pfahlbauten; cross-locale name match works
- [ ] p95 < 200 ms server-side on fixture volume ×10 (synthetic load test note)
- [ ] Combines correctly with a filter (once LAKE-036 lands — contract test now with stub)

**Tests:** Integration: matching matrix (diacritics/typo/prefix/cross-locale). E2E: search interaction.
**Manual validation:** exploratory searches on staging.
**Commands:** `pnpm test -g search`. **Rollback:** param optional; indexes stay (harmless).

---

## LAKE-031 — Location selection

**Status:** open · **Phase:** MVP/M2 · **Parallel:** yes (after 029)

**Objective:** REQ-DISC-08: choose the reference location via opt-in geolocation or place search (geocode proxy), persisted locally, feeding distance display/sorting/filtering.

**User story:** As a visitor without granting location, I want to type my hotel's town and get everything distance-aware anyway.

**Context:** [core-user-flows.md F1](../../ux/core-user-flows.md#f1-discover-nearby), [security-and-privacy.md#location-data](../../quality/security-and-privacy.md#location-data), [external-services.md#geocoding](../../architecture/external-services.md#geocoding) (⚠️ provider terms verified in this ticket).

**In scope:** location control in Discover header ("Near: …"); geolocation only on gesture with inline purpose text; `GET /api/geocode` proxy (provider adapter + fake, scope-bbox-constrained, cached, rate-limited, key server-side); place-picker sheet (search results + region quick picks); local persistence (last location, label); coordinate rounding (~100 m) before any API call; distance display on cards once location set.
**Out of scope:** distance *sorting* (LAKE-039), plan start point reuse (LAKE-045 imports this control).

**Dependencies:** LAKE-029; geocoder account (external). **Files:** `apps/web/app/api/geocode/route.ts`, `src/providers/geocoder/*`, `components/location-picker/*`.

**Domain rules:** none. **API changes:** geocode proxy. **DB changes:** none.
**UI states:** permission denied → picker fallback (no nagging); geocoder down → region picks still work (`ProviderUnavailable` path); loading states on search.
**DE/EN:** localized labels; geocoder queried with locale hint where supported.
**A11y:** picker fully keyboard operable; geolocation button explains purpose accessibly.
**Privacy/security:** rounding verified by test; raw coords never in requests/logs; provider terms on result storage verified and recorded (⚠️ gate).

**Acceptance criteria:**
- [ ] Both paths (geolocation, place search) set the location and show distances on cards
- [ ] Requests carry only rounded coordinates (network assertion test)
- [ ] Geocoder failure degrades to region picker without errors surfacing raw
- [ ] Terms verification documented in external-services.md (checklist item)

**Tests:** Unit: rounding, adapter mapping. Integration: proxy incl. failure fake. E2E: pick-place flow with mocked geocoder; geolocation-denied flow.
**Manual validation:** real device geolocation grant/deny.
**Commands:** `pnpm test -g location`. **Rollback:** control removable; list works locationless.
