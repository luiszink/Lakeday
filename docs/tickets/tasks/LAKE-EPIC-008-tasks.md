# LAKE-EPIC-008 — Tasks: Filters and sorting

Epic: [LAKE-EPIC-008](../epics/LAKE-EPIC-008-filters-and-sorting.md). Global [definition of done](../../agents/definition-of-done.md) applies. Order: 036 → 037/038 (parallel) → 039.

---

## LAKE-036 — Filter engine and API

**Status:** open · **Phase:** MVP/M3 · **Parallel:** no (base for 037–039)

**Objective:** All filter dimensions (REQ-FILT-02…23 except open-now) as a domain query-spec + SQL translation + API parameters, with correct AND/OR and must/nice unknown semantics.

**User story:** As Familie Weber (P3), I want "age 0–2 + stroller + max 30 min" to return only verified matches so I can trust every result.

**Context:** [filter-and-search-behaviour.md](../../ux/filter-and-search-behaviour.md#general-semantics-decision) (semantics are binding), [tag-and-filter-taxonomy.md](../../data/tag-and-filter-taxonomy.md) (dimension classes), [api-contracts.md](../../architecture/api-contracts.md#get-apiattractions--listsearchfilter) (params).

**In scope:** `FilterSpec` type + zod param parsing for every dimension (region, distance radius, category two-level, interests, audiences, child ages, indoor/outdoor, rain/heat ordinals, season, price, duration bands, transport modes, food/café/picnic, reservation, wheelchair/stroller, dogs, visitor languages); must/nice unknown handling per taxonomy class (must ⇒ exclude UNKNOWN; nice ⇒ include, rank later); SQL translation helper (composable WHERE builder in `packages/db`); distance filter via `ST_DWithin` on rounded `near`; map (bbox) + search (q) composition verified.
**Out of scope:** UI (037), open-now (038 — needs hours evaluation over candidate rows), sorting + zero-result hints (039).

**Dependencies:** LAKE-028, LAKE-008, LAKE-031 (near param shape). **Files:** `packages/domain/src/filter/*`, `packages/db/src/attraction-query.ts`, API route extension.

**Domain rules:** the semantics table in the UX spec is the test oracle — implement dimension-by-dimension against it.
**API changes:** all filter params active. **DB changes:** none beyond existing indexes; measure before adding more (spec note).
**UI states:** n/a (API). **DE/EN:** filter values are locale-independent codes.
**A11y:** n/a here. **Privacy/security:** param validation caps list sizes (≤ all vocabulary values); `near` remains rounded.

**Acceptance criteria:**
- [ ] Per-dimension integration tests pass against fixture set (each dimension: match, non-match, unknown-handling case)
- [ ] Combination test: P3 scenario (age band + stroller + radius) returns exactly the verified fixtures
- [ ] must-filter excludes UNKNOWN (wheelchair fixture pair proves it); nice-filter includes
- [ ] p95 < 300 ms with 5 combined filters on fixtures ×10

**Tests:** Unit: spec parsing, semantics functions. Integration: the dimension matrix (the [filter test](../../quality/testing-strategy.md) requirement). E2E: none (037).
**Manual validation:** curl combinations on staging.
**Commands:** `pnpm test -g filter-engine`. **Rollback:** params optional; endpoint stays compatible.

---

## LAKE-037 — Filter UI

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 036, parallel to 038)

**Objective:** The filter panel (mobile sheet / desktop sidebar), quick-filter chips, URL state binding, active-filter indicators, and applied-filter management.

**User story:** As a rainy-day visitor (P6), I want one tap on "Rainy day ☔" to transform the list so I don't compose filters manually.

**Context:** [filter-and-search-behaviour.md](../../ux/filter-and-search-behaviour.md#quick-filters-chips-above-list), [information-architecture.md](../../ux/information-architecture.md#screen-inventory-mvp).

**In scope:** filter sheet/sidebar with all dimensions grouped (localized vocabulary labels from seed data); quick chips (`Open now` — activates with 038, `Free`, `Rainy day ☔`, `With kids` age picker, `Accessible ♿`); URL round-trip (restore on load/share/back); active-filter count badge + per-filter clear + clear-all; result-count preview in the panel ("Show 23 results"); analytics event slots.
**Out of scope:** zero-result relaxation UI (039), open-now logic (038).

**Dependencies:** LAKE-036, LAKE-029. **Files:** `components/filters/**`, discover integration.

**Domain rules:** UI never invents semantics — it renders `FilterSpec` state only.
**API changes:** none. **DB changes:** none.
**UI states:** panel loading (vocab prefetched, effectively instant); applying shows list skeletons; URL-restored state visually complete; result-count preview loading state.
**DE/EN:** every label/value localized from vocabulary tables; chips localized (`Regentag ☔`).
**A11y:** sheet focus-trapped with return focus; chip groups as labelled groups with roving focus; count changes announced; must-filter semantics explained accessibly ("only verified entries shown").
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Every REQ-FILT dimension operable in the panel; state round-trips through URL
- [ ] Chips apply their preset and reflect in the panel; P3 flow ≤ 4 taps
- [ ] Result-count preview accurate; clear-all restores unfiltered state
- [ ] axe clean; keyboard-only completes the P3 scenario

**Tests:** E2E: chip flows, panel round-trip, URL restore (both locales, mobile viewport). Unit: URL serialization.
**Manual validation:** device run-through of all chips.
**Commands:** `pnpm test:e2e -g filters`. **Rollback:** UI layer; revert safe.

---

## LAKE-038 — Open-now and open-on-date filter

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 036, parallel to 037)

**Objective:** REQ-FILT-14: "open now" and "open on date" filtering via the hours engine, with correct UNKNOWN exclusion and holiday awareness, in API and UI.

**User story:** As a spontaneous visitor at 16:30, I want only places that are actually still open — across three countries' Sunday and holiday rules.

**Context:** [filter-and-search-behaviour.md](../../ux/filter-and-search-behaviour.md#dimension-specific-behaviour) (open semantics: UNKNOWN excluded from open-now with badge elsewhere), LAKE-012 engine.

**In scope:** `open=now|date:YYYY-MM-DD` param; efficient evaluation (hours rules prefetched for candidate rows, engine evaluated in-process; measure — expected fine at scale); holiday calendars applied per attraction country/subdivision; UI: chip + date picker in panel; "open today until 18:00" display strings on cards (evaluation reuse); critically-stale-hours exclusion hook (activates fully with LAKE-055).
**Out of scope:** time-window filtering beyond date (later), countdown displays.

**Dependencies:** LAKE-012, LAKE-036; LAKE-037 for UI slot. **Files:** filter extension, card open-state enrichment, date-picker component.

**Domain rules:** UNKNOWN hours ⇒ excluded from open-now results (never falsely "open"); closed-by-exception respected.
**API changes:** `open` param. **DB changes:** none.
**UI states:** date in past → soft warning; engine-unknown shown as "hours unverified" badge outside the open-now filter.
**DE/EN:** localized day/time formatting (24 h de; locale-appropriate en).
**A11y:** date picker keyboard operable with text fallback (per [accessibility.md](../../quality/accessibility.md#forms--errors)).
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Golden e2e: Sunday filter in CH vs DE fixture divergence; Pfingstmontag case correct
- [ ] Unknown-hours fixture never appears under open-now; appears otherwise with badge
- [ ] `open=date:` matches the engine's day summary exactly (property test vs engine)

**Tests:** Integration: filter vs engine consistency matrix. E2E: chip + date flows. Unit: param parsing.
**Manual validation:** check a real holiday date on staging fixtures.
**Commands:** `pnpm test -g open-filter`. **Rollback:** param optional.

---

## LAKE-039 — Sorting and zero-result help

**Status:** open · **Phase:** MVP/M3 · **Parallel:** no (completes the epic)

**Objective:** REQ-DISC-06/07: distance sorting (PostGIS) and deterministic relevance scoring, plus the zero-result helper with per-filter would-match counts and safe relaxation actions.

**User story:** As a visitor with an over-constrained filter set, I want to see *why* nothing matches and fix it in one tap — without the app silently dropping my accessibility needs.

**Context:** [filter-and-search-behaviour.md#sorting](../../ux/filter-and-search-behaviour.md#sorting) (formula v1 is binding config), [#zero-results](../../ux/filter-and-search-behaviour.md#zero-results).

**In scope:** `sort=distance` (requires location; UI prompts via LAKE-031 control) with relevance tie-break; `sort=relevance` implementing the weighted formula (weights from config; `dataCompleteness`/`freshness`/`seasonFit`/`proximity` computed in query or post-processing — measure); default-sort logic (relevance without location, distance with); `zeroResultHints` (per-active-filter would-match counts via efficient grouped queries); zero-result UI: restrictive-filter display, one-tap relaxations (radius step-up, drop most-restrictive nice filter, open-now→open-today), **never auto-relaxing must filters** (honest message instead); zero-result analytics event slot.
**Out of scope:** personalization/ML (explicitly none in MVP), sponsored anything.

**Dependencies:** LAKE-036/037/038, LAKE-031. **Files:** scoring in `packages/domain/src/relevance.ts` + query support, zero-result components, sort control.

**Domain rules:** formula weights are config; scoring is deterministic and documented publicly ([filter-and-search-behaviour.md#relevance](../../ux/filter-and-search-behaviour.md#relevance)); must-filters never auto-relaxed.
**API changes:** `sort` param, `zeroResultHints` response field. **DB changes:** none.
**UI states:** the zero-result state is the centerpiece — restrictive filters listed with counts; relaxation buttons preview their counts; distance sort without location → location prompt state.
**DE/EN:** localized honest messaging (e.g. "Keine verifiziert rollstuhlgerechten Orte in diesem Umkreis" / "No verified wheelchair-accessible places within this radius").
**A11y:** relaxation options are buttons with clear labels; result changes announced.
**Privacy/security:** distance sort uses rounded coordinates (existing rule).

**Acceptance criteria:**
- [ ] Distance order matches haversine reference on fixtures (±1 m tolerance); tie-break stable
- [ ] Relevance order reproducible; weight change via config reorders (test)
- [ ] Zero-result: hints accurate; relaxations produce non-zero results in the P7 test scenario; wheelchair filter never auto-dropped
- [ ] Distance-sort-without-location prompts and recovers gracefully

**Tests:** Integration: distance correctness ([testing-strategy](../../quality/testing-strategy.md) distance suite), hint counts. Unit: scoring math. E2E: zero-result relaxation flow (P7 persona).
**Manual validation:** contrive an over-filtered state on staging and relax out of it.
**Commands:** `pnpm test -g sorting`. **Rollback:** sort defaults to relevance; hints field optional.
