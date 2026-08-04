# LAKE-EPIC-002 — Tasks: Domain and database

Epic: [LAKE-EPIC-002](../epics/LAKE-EPIC-002-domain-and-database.md). Global [definition of done](../../agents/definition-of-done.md) applies to all tickets. Internal chain 006→007→008→009→010 is strictly sequential; 011/012 run in parallel after 009.

---

## LAKE-006 — Prisma schema and initial migration

**Status:** done · **Phase:** MVP/M0 · **Parallel:** no (foundation chain)

**Objective:** Implement the complete content schema from the domain model as Prisma models + initial migration: all 27 tables, native enums, constraints, and base indexes.

**User story:** As an implementation agent, I want the full schema in place early so later tickets add behaviour, not migrations-with-surprises.

**Context:** [domain-model.md](../../architecture/domain-model.md) (authoritative logical model), [database-schema.md](../../architecture/database-schema.md) (physical decisions: naming, enums-vs-lookups, constraints).

**In scope:** every entity/table listed in [database-schema.md#table-plan](../../architecture/database-schema.md#table-plan); PostGIS columns as `Unsupported(...)` with raw-SQL migration steps (extension enabling, geography columns, GiST index); check/unique constraints from the spec; `packages/db` client export; empty typed-helper module for geometry queries.
**Out of scope:** seed data (LAKE-007/008), fixtures (LAKE-010), FTS/trigram indexes (LAKE-030), any query logic.

**Dependencies:** LAKE-004. **Files:** `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/0001_init/`, `packages/db/src/index.ts`, `packages/db/src/geo.ts` (stub).

**Approach:** 1) model stable editorial entities; 2) volatile entities (schedules, closures, prices, provenance, proposals); 3) user-data entities (plan, plan_stop, user_report); 4) admin/licence/registry entities; 5) raw-SQL migration steps for PostGIS pieces; 6) verify `prisma migrate diff` is clean.

**Domain rules:** encode only structural invariants here (constraints per spec); cross-row invariants belong to LAKE-009.
**API changes:** none. **DB changes:** the initial migration. **Migration requirements:** runs on empty DBs only (initial); additive-first policy starts after this ticket.
**UI states / DE-EN / A11y:** n/a.
**Privacy/security:** `plan.start_point` stored as rounded coordinates by contract (enforced at API layer later; column comment documents it).

**Acceptance criteria:**

- [ ] `pnpm db:migrate` creates all tables on a clean DB; `prisma migrate diff` clean
- [ ] Constraints verified by tests: scope-exception check, localization uniqueness, external-ID uniqueness, share-token uniqueness, plan-stop ordering
- [ ] `attraction.location` accepts and returns WGS84 points via the geo helper stub

**Tests:** Integration (Testcontainers): migration applies; constraint violations rejected; enum round-trips. Unit: none. E2E: none.
**Manual validation:** inspect schema in a DB client; compare table list against the spec's table plan.
**Commands:** `pnpm db:migrate`, `pnpm --filter db test`.
**Rollback:** pre-data phase — drop DB and re-migrate.

---

## LAKE-007 — PostGIS setup and geographic seed data

**Status:** done · **Phase:** MVP/M0 · **Parallel:** no (chain)

**Objective:** Load the shoreline geometry and the nine region polygons as versioned seed data; implement the `shorelineDistanceM` computation and the scope-rule check helpers.

**User story:** As the system, I need authoritative geometries so every attraction's scope membership and region assignment are computable, not asserted.

**Context:** [geographic-scope.md](../../product/geographic-scope.md) (region model, inclusion rule), [ADR-001](../../adr/ADR-001-shoreline-scope.md). Geometry source: OSM water polygons for the lake + manually drawn region/corridor polygons (ODbL attribution for derived geometry recorded in the Licence registry seed — coordinate with LAKE-017's registry shape; a minimal licence row is seeded here).

**In scope:** `data/geo/shoreline.geojson` + `data/geo/regions/*.geojson` (created in this ticket — traced, simplified geometries incl. Seerhein + Hochrhein corridor to Stein am Rhein); loader into `shoreline_geometry` + `region` tables; `computeShorelineDistanceM(point)` and `assignRegion(point)` helpers in `packages/db/src/geo.ts`; batch recompute job function (invoked manually; scheduled wiring in LAKE-051); `SCOPE_SHORELINE_BAND_KM` config read.
**Out of scope:** UI, automatic geometry updates.

**Dependencies:** LAKE-006. **Files:** `data/geo/*`, `packages/db/seed/geo.ts`, `packages/db/src/geo.ts`.

**Approach:** trace geometries once (QGIS or geojson.io) at ~50 m tolerance — precision beyond that is meaningless for a 5 km band; version field on `shoreline_geometry`; helpers via `ST_Distance`/`ST_DWithin`/`ST_Contains` in typed raw SQL.

**Domain rules:** scope rule evaluation order: band → shoreline municipality+relevance → exception ([geographic-scope.md](../../product/geographic-scope.md#inclusion-rule-decision-configurable)); rule 2 municipality list is a small seeded lookup (shoreline municipalities).
**API changes:** none. **DB changes:** seed only + `shoreline_municipality` lookup table (additive migration).
**UI states / DE-EN / A11y:** n/a. **Privacy/security:** none.

**Acceptance criteria:**

- [ ] Known-point tests: Mainau ≈ 0 m; Konstanz Münster < 1 km; Affenberg Salem ≈ 6–8 km (outside band); Stein am Rhein Rathaus inside corridor; Säntis far outside
- [ ] Every region polygon assigns its anchor places correctly (test per [geographic-scope.md](../../product/geographic-scope.md#product-regions) anchors)
- [ ] Band threshold read from config; changing it changes scope results in tests

**Tests:** Integration: the coordinate assertions above on Testcontainers. Unit: rule-order logic with stubbed distances.
**Manual validation:** render the GeoJSONs in a viewer; eyeball corridor coverage Konstanz↔Stein am Rhein.
**Commands:** `pnpm db:seed --only geo`.
**Rollback:** geometries are versioned; reload previous version + recompute.

---

## LAKE-008 — Vocabulary and calendar seeds

**Status:** done · **Phase:** MVP/M0 · **Parallel:** no (chain)

**Objective:** Seed all controlled vocabularies (categories, subcategories, interests, audiences) with DE/EN labels, the licence registry base rows, and public-holiday calendars for DE-BW, CH-TG, CH-SH, AT-VBG (current + next year).

**Context:** [tag-and-filter-taxonomy.md](../../data/tag-and-filter-taxonomy.md) (values + governance), [domain-model.md](../../architecture/domain-model.md#opening-hours) (holiday calendars).

**In scope:** idempotent seed scripts as reviewed source of truth (`packages/db/seed/vocabularies.ts`, `holidays.ts`, `licences.ts`); holiday data researched from official sources with source comments.
**Out of scope:** vocabulary admin UI (governance is PR-based by decision), attraction data.

**Dependencies:** LAKE-006. **Files:** seed scripts above.

**Approach:** plain typed arrays; seed = upsert by code (idempotent); CI guard that codes are never removed once present (comparison against migration snapshot).

**Domain rules:** codes immutable; labels editable ([taxonomy governance](../../data/tag-and-filter-taxonomy.md#governance)).
**API/DB changes:** seed only. **UI states:** n/a.
**DE/EN:** every vocabulary value has both labels — CI check fails on gaps.
**A11y:** labels are what screen readers announce in filters — plain words, no internal jargon.
**Privacy/security:** none.

**Acceptance criteria:**

- [ ] All taxonomy values from the spec exist with DE+EN labels after `pnpm db:seed`
- [ ] Re-running seeds changes nothing (idempotency test)
- [ ] Holiday test: Pfingstmontag is a holiday in DE-BW, not in CH-TG; Bundesfeier (1 Aug) in CH only

**Tests:** Integration: seed idempotency + the holiday assertions. **Manual validation:** spot-check labels for tone.
**Commands:** `pnpm db:seed`. **Rollback:** seeds are upserts; fix-forward.

---

## LAKE-009 — Domain package and publish invariants

**Status:** done · **Phase:** MVP/M1 · **Parallel:** no (chain; shared foundation)

**Objective:** The pure domain package: entity types, zod schemas (single source for API contracts), the `publishAttraction()` invariant choke point, and the scope-rule domain function.

**User story:** As the system, I must make it impossible to publish an attraction that violates the published-content invariants.

**Context:** [domain-model.md](../../architecture/domain-model.md) (invariants), [api-contracts.md](../../architecture/api-contracts.md) (zod as contract source).

**In scope:** TS types + zod schemas for all entities and enums; `publishAttraction(attraction, localizations, facts) → Result<Published, InvariantViolation[]>` checking: both localizations complete & not STALE, coordinates + region + category present, critical facts verified-or-explicitly-unknown, scope rule passes, exception justified; `Result` helper types; unit-test harness.
**Out of scope:** persistence wiring (thin service in LAKE-015 calls this), filter engine (LAKE-036), plan validation (LAKE-046).

**Dependencies:** LAKE-006 (types alignment), LAKE-007 (scope helpers interface). **Files:** `packages/domain/src/entities/*`, `packages/domain/src/publish.ts`, `packages/domain/src/scope.ts`, `packages/domain/src/result.ts`.

**Approach:** domain functions take plain data + injected capability interfaces (e.g. `ScopeGeometry`) — no I/O; violations are enumerated, not thrown (editor UX needs the full list).

**Domain rules:** the invariant list above is the canonical implementation of REQ-DATA-06/08.
**API changes:** none yet (schemas exported for later). **DB changes:** none.
**UI states / DE-EN:** violation messages carry stable codes; localization happens at the UI layer.
**A11y:** n/a. **Privacy/security:** none.

**Acceptance criteria:**

- [ ] Every invariant has a positive and negative unit test (≥ 12 cases incl. STALE translation, unjustified exception, out-of-band coordinates)
- [ ] Lint proves package purity (no framework/db imports)
- [ ] zod schemas round-trip the fixture shapes

**Tests:** Unit: exhaustive invariant matrix. Integration: none (pure). E2E: none.
**Manual validation:** none beyond tests. **Commands:** `pnpm --filter domain test`.
**Rollback:** pure code; revert freely.

---

## LAKE-010 — Fixture dataset

**Status:** done · **Phase:** MVP/M1 · **Parallel:** no (chain end; unblocks all UI lanes)

**Objective:** The shared synthetic fixture dataset: ~40 attractions across all 9 regions and 3 countries, deliberately covering edge cases, loadable as seed for dev/preview/tests.

**Context:** [testing-strategy.md](../../quality/testing-strategy.md#test-personas) (single source of test truth). Fixtures are **synthetic but realistic** — real place names may inspire them, but all facts are invented and marked `fixture: true` (never published to production).

**In scope:** fixture definitions incl.: unknown-hours attraction, CHF-priced Swiss attractions, scope exception with justification, stale facts, near-duplicate pair, wheelchair FULL/UNKNOWN pair, all categories used, DE+EN localizations everywhere; loader integrated into `db:seed` (dev/test envs only — guard against production).
**Out of scope:** real researched data (LAKE-023 pilot).

**Dependencies:** LAKE-008, LAKE-009 (fixtures must pass invariants where marked published). **Files:** `packages/db/seed/fixtures/*.ts`.

**Approach:** typed fixture builders (small factory helpers) so tests can derive variants; every fixture attraction passes `publishAttraction` unless deliberately draft/broken (those are marked).

**Domain rules:** fixtures conform to taxonomy codes and invariants — they double as living documentation.
**API/DB changes:** seed only. **UI states:** n/a. **DE/EN:** both localizations, translated properly (fixtures are also copy examples).
**A11y / Privacy:** n/a (synthetic).

**Acceptance criteria:**

- [ ] ≥ 40 attractions; every region, country, category, price level, and edge case above represented (assertion test)
- [ ] Published fixtures all pass invariants; production guard refuses fixture load when `NODE_ENV=production`
- [ ] e2e suite can rely on stable fixture IDs (documented list)

**Tests:** Integration: load + assertions. **Manual validation:** browse fixtures in the dev UI once list exists.
**Commands:** `pnpm db:seed`. **Rollback:** re-seed.

---

## LAKE-011 — Duplicate detection scorer

**Status:** open · **Phase:** MVP/M1 · **Parallel:** yes (after 009; parallel to 012)

**Objective:** The deterministic duplicate scorer: candidate-pair scoring on external IDs, official URLs, coordinates, and normalized names, with configurable thresholds and merge-decision classification.

**Context:** [domain-model.md#duplicate-detection](../../architecture/domain-model.md#duplicate-detection-req-data-04), [data-quality-strategy.md#duplicate-detection](../../quality/data-quality-strategy.md#duplicate-detection).

**In scope:** name normalization (lowercase, diacritics fold, legal/venue suffix strip, trigram similarity); URL normalization (host+path, tracking-param strip); distance scoring; combination rules (certain/strong/weak → auto-link / review / distinct); pure functions + threshold config; region-bucketed pair generation helper for sweeps.
**Out of scope:** merge execution UI (LAKE-016), import wiring (LAKE-019), nightly sweep scheduling (LAKE-051).

**Dependencies:** LAKE-009, LAKE-010 (fixture duplicates). **Files:** `packages/domain/src/dedup/*`.

**Approach:** implement per spec table; measure precision/recall against seeded fixture duplicates; document threshold rationale in code.

**Domain rules:** ≥1 certain or ≥2 strong ⇒ duplicate (auto-link at import); 1 strong ⇒ review; else distinct.
**API/DB/UI/DE-EN/A11y/Privacy:** n/a (pure logic).

**Acceptance criteria:**

- [ ] Seeded fixture duplicate pair detected as duplicate; distinct neighbors (Burg vs Neues Schloss Meersburg analog) classified distinct
- [ ] Precision = 1.0, recall = 1.0 on the fixture set (small set — perfect score expected; thresholds tuned when pilot data arrives)
- [ ] Trigram similarity handles umlauts/ß correctly (`Schloß`≈`Schloss`)

**Tests:** Unit: normalization edge cases, scoring matrix, combination rules. **Manual validation:** none.
**Commands:** `pnpm --filter domain test dedup`. **Rollback:** pure code.

---

## LAKE-012 — Opening-hours engine

**Status:** open · **Phase:** MVP/M1 · **Parallel:** yes (after 009; parallel to 011)

**Objective:** The pure opening-hours evaluation engine: `openStateAt()` over weekly rules, seasonal schedule windows, country/subdivision holiday calendars, and exceptional-closure overrides — with honest `UNKNOWN`.

**User story:** As a visitor, I want "open now" and plan-conflict warnings to be correct across three countries' holidays, or honestly absent — never guessed.

**Context:** [domain-model.md#opening-hours](../../architecture/domain-model.md#opening-hours), risk R-08 (complexity is the known trap — keep the model exactly as scoped).

**In scope:** rule evaluation for a timestamp and a date-range (day summary: opens/closes/closed/unknown); holiday resolution via calendar codes; `appliesOnPublicHolidays` semantics (AS_WEEKDAY / CLOSED / SPECIAL); exceptional-closure precedence; DST-safe date math (`Temporal` polyfill or date-fns-tz); evaluation for "open on date" (any opening that day) and "open at instant".
**Out of scope:** minute-level event hours, "opens in 20 minutes" countdowns, fetching/refreshing hours (LAKE-052).

**Dependencies:** LAKE-008 (calendars), LAKE-009. **Files:** `packages/domain/src/opening-hours/*`.

**Approach:** normalize rules into per-day intervals for the queried date, apply holiday substitution, subtract closures, evaluate. Golden tests first (table-driven).

**Domain rules:** UNKNOWN propagates (missing schedule or `hoursUnknown` ⇒ UNKNOWN, never CLOSED); closures beat rules; holiday calendar chosen by the attraction's country/subdivision.
**API/DB/UI:** none here. **DE/EN:** day summaries return structured data; formatting is UI concern.
**A11y/Privacy:** n/a.

**Acceptance criteria:**

- [ ] Golden tests pass: Sunday in CH vs DE, Pfingstmontag divergence, seasonal switch boundary, closure override, DST spring-forward day, `AS_WEEKDAY` holiday, unknown-hours attraction
- [ ] Property test: engine never returns OPEN outside any rule interval
- [ ] Performance: ≤ 1 ms per evaluation (it runs per list row)

**Tests:** Unit: golden table (≥ 25 cases) + property tests. **Manual validation:** cross-check three fixture attractions against manually computed calendars.
**Commands:** `pnpm --filter domain test opening-hours`. **Rollback:** pure code.
