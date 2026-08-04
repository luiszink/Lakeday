# Testing strategy

Status: **architectural decision** (tooling, layers, gates), **recommendation** (coverage targets).

## Tooling

| Layer | Tool | Where |
|---|---|---|
| Unit (domain) | **Vitest** | `packages/domain` — pure functions, no I/O |
| Integration | Vitest + **Testcontainers** (PostgreSQL+PostGIS) | `packages/db`, API route handlers |
| End-to-end | **Playwright** (mobile viewport first: Pixel-class + iPhone-class emulation) | `apps/web` |
| Accessibility | axe-core in Playwright + manual audits | e2e suite |
| Performance | Lighthouse CI budgets ([../architecture/pwa-strategy.md](../architecture/pwa-strategy.md#performance-budget)) | CI on PRs |
| Contract | zod schemas + JSON-Schema validation of research fixtures | domain + import pipeline |

CI gates: lint, typecheck, unit, integration, e2e-smoke on every PR; full e2e + Lighthouse on main ([../operations/deployment.md](../operations/deployment.md#ci-pipeline)).

## Required test areas (with owning tickets in [../tickets/README.md](../tickets/README.md))

| Area | Content |
|---|---|
| Domain unit tests | Entity invariants, publish-transition rules, scope rule (band, municipality+relevance, exception) |
| Filter tests | Every dimension's semantics (AND across, OR within, must-vs-nice unknown handling); combination cases; zero-result hint counts |
| Distance sorting | PostGIS distance correctness vs. haversine reference; tie-breaking; rounded-coordinate tolerance |
| Opening-hours engine | Weekly rules, seasonal windows, DE/CH/AT holiday calendars (Sunday!), exceptional-closure overrides, `UNKNOWN` propagation, DST boundaries |
| Localization | Catalog completeness (CI fail on missing key), slug round-trips, currency formatting EUR/CHF, holiday-aware copy, language-switch state preservation (e2e), text-expansion layout check |
| Ingestion contract | Valid/invalid research JSON fixtures; evidence-envelope enforcement; copied-prose guard; taxonomy-code rejection; per-record error reporting |
| Duplicate detection | Seeded near-duplicates (name variants, 50 m/250 m coordinates, same official URL, same OSM ID); precision/recall assertions on fixture set |
| Refresh pipeline | Hash-unchanged fast path; auto-apply classes; review-queue routing; SOURCE_UNAVAILABLE backoff; idempotent re-runs; asymmetric safety rules (closure add vs remove) |
| Map integration | Marker/list result parity, bbox query truncation flag, cluster behaviour, provider-failure fallback to list (e2e with tile requests blocked) |
| Accessibility | axe on every core screen; keyboard-only plan reorder; SR announcements for filter results count ([accessibility.md](accessibility.md)) |
| Critical e2e flows | F1 discover→detail→official link · F2 rainy-day chips · F3 build/reorder/conflict/save/share plan · F4 open shared plan + copy · F5 language switch · F6 report issue |
| Stale-data behaviour | Badge thresholds (DUE/STALE), open-now exclusion for critically stale hours, honest empty states |
| External-provider failure | Fakes forced into `ProviderUnavailable`: map→list fallback, geocoder→region picker, weather→hints hidden, refresh→backoff (no user-facing errors) |
| Visual mobile verification | Playwright screenshot comparison on key screens, both locales, light/dark, 360 px and 768 px widths |
| Planner feasibility (phase 2) | Golden persona plans + property tests ([../planning/deterministic-planner.md](../planning/deterministic-planner.md#testing-feasibility-suite--designed-now-built-in-phase-2)) |
| AI evaluation (phase 3) | Eval dataset + trap prompts ([../planning/ai-travel-assistant.md](../planning/ai-travel-assistant.md#evaluation-strategy)) |

## Test personas {#test-personas}

Fixture dataset + e2e scenarios instantiate the personas from [../product/personas-and-user-journeys.md](../product/personas-and-user-journeys.md):

| Persona | Scenario skeleton |
|---|---|
| German couple without a car (P1) | PT-reachable filter around Konstanz, DE locale, ferry-adjacent attractions |
| English-speaking solo traveller (P2) | EN locale end-to-end, CHF price rendering, Sunday filter in CH |
| Family with toddler + stroller (P3) | age 0-2 + stroller must-filters exclude UNKNOWN; short-duration sort |
| Family with older children (P4) | Multi-interest filter, 3-stop plan with conflict resolution |
| Wheelchair user (P5) | wheelchair must-filter, verified-only results, accessible e2e run (keyboard+SR) |
| Rainy-day visitor (P6) | Rain chip + open-now correctness on a holiday date |
| Budget visitor (P7) | FREE/LOW filter + picnic flag; zero-result relaxation path |

The shared **fixture dataset** (~40 synthetic attractions across all regions/countries, deliberately including edge cases: unknown hours, CHF prices, scope exception, stale facts, near-duplicates) lives in `packages/db/seed/fixtures/` and is used by unit, integration, and e2e layers alike (single source of test truth).

## Coverage targets (pragmatic)

Domain package ≥ 90 % line/branch (it is pure logic — cheap to test, catastrophic to get wrong) · API handlers ≥ 80 % · UI components: no percentage target; behaviour covered via e2e + targeted component tests for stateful widgets (filter panel, plan reorder). No coverage theatre: excluded-from-coverage code requires a comment.
