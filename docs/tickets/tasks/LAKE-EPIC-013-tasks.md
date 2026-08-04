# LAKE-EPIC-013 — Tasks: Scheduled refresh

Epic: [LAKE-EPIC-013](../epics/LAKE-EPIC-013-scheduled-refresh.md). Global [definition of done](../../agents/definition-of-done.md) applies. Order: 051 → 052/053/054 (parallel) → 055.

---

## LAKE-051 — Job framework

**Status:** open · **Phase:** MVP/M5 · **Parallel:** no (epic foundation)

**Objective:** The scheduled-job backbone: authenticated job endpoints, `job_run` persistence, idempotency, politeness-aware fetching utilities, scheduler configuration, and alert hooks (REQ-DATA-03 infrastructure, REQ-OBS-01 partial).

**User story:** As the operator, I want every job observable, idempotent, and re-triggerable so a missed cron never becomes a data incident.

**Context:** [refresh-and-review-pipeline.md#idempotency--operations](../../data/refresh-and-review-pipeline.md#idempotency--operations), [deployment.md#scheduled-jobs](../../operations/deployment.md#scheduled-jobs), [observability.md#job-monitoring](../../operations/observability.md#job-monitoring).

**In scope:** `POST /api/jobs/*` route pattern with `JOB_TRIGGER_SECRET` bearer auth (timing-safe compare); `job_run` table (additive migration: type, timestamps, status, counts JSON, error summary); job registry + runner harness (timeout, per-run idempotency key, single-flight lock per job type); polite fetcher utility (per-host ≥10 s spacing, robots.txt respect, contact UA, 30 s timeout, 2 retries, SSRF guard: https-only, no private ranges, registry-approved origins only, redirect cap); scheduler config for the host (cron table from deployment.md); wiring existing batch functions (shoreline recompute LAKE-007, plan retention LAKE-048, data-quality sweep skeleton, sitemap slot for LAKE-061); alert hook (job missed >2× interval, 2 consecutive failures).
**Out of scope:** the actual refreshers (052–054), dashboards (LAKE-066).

**Dependencies:** LAKE-002/003, LAKE-017 (origin approval source). **Files:** `apps/web/app/api/jobs/*`, `packages/db` job_run migration, `apps/web/src/jobs/{runner,fetcher}.ts`, scheduler config.

**Domain rules:** jobs never mutate published facts directly — they write provenance updates and proposals only (enforced by using domain services).
**API changes:** job endpoints. **DB changes:** `job_run` (additive). **Migration:** additive.
**UI states:** n/a (admin job-run list view included minimally: last runs table in admin).
**DE/EN:** n/a (ops). **A11y:** admin table semantics.
**Privacy/security:** bearer secret, timing-safe; SSRF guard tested; logs scrub secrets; fetcher UA identifies us with contact.

**Acceptance criteria:**
- [ ] Unauthenticated/wrong-secret job calls → 401 (timing-safe); double-trigger runs once (lock test)
- [ ] job_run rows complete with counts; failure recorded with summary
- [ ] Fetcher: spacing, robots respect, SSRF rejections, UA — all covered by tests
- [ ] Scheduler config deployed on staging; one full scheduled cycle observed

**Tests:** Unit: runner, lock, fetcher guards. Integration: endpoint auth, job_run persistence. E2E: none.
**Manual validation:** trigger each wired job manually on staging; inspect runs.
**Commands:** `curl -H "Authorization: Bearer $JOB_TRIGGER_SECRET" -X POST …/api/jobs/data-quality`.
**Rollback:** disable scheduler; endpoints inert without triggers.

---

## LAKE-052 — Opening-hours and price refresh

**Status:** open · **Phase:** MVP/M5 · **Parallel:** yes (after 051)

**Objective:** Weekly hours + monthly price refreshers: due-fact selection, source fetch + content-hash fast path, structured extraction + diff, asymmetric auto-apply vs ChangeProposal routing, and SOURCE_UNAVAILABLE backoff.

**User story:** As a visitor in October, I want winter hours reflected without an editor manually re-checking 500 pages.

**Context:** [refresh-and-review-pipeline.md#scheduled-refresh-flow](../../data/refresh-and-review-pipeline.md#scheduled-refresh-flow) + auto-apply table (binding), [data-refresh prompt](../../research/prompts/data-refresh.md) (extraction contract).

**In scope:** `refresh?type=hours|prices` jobs on the 051 harness; due selection by `nextRefreshAt`; hash-unchanged fast path (stamp + reschedule); extraction step behind an `Extractor` interface — MVP implementation: deterministic parsers where feeds/structured data exist + LLM-assisted extraction batch queue as **manual-assist** (extraction requests exported for an operator-run agent using the data-refresh prompt; results re-ingested) — no runtime LLM dependency; diff + change classification (`price_minor/major`, `hours_structure`, …); auto-apply rules exactly per spec (unchanged, price_minor ≤10 % high-confidence); everything else → ChangeProposal; SOURCE_UNAVAILABLE handling (keep value, backoff ×2 capped, status update); per-source health counters (LAKE-017 display).
**Out of scope:** closures (053), staleness UI (055), fully automated LLM extraction (revisit post-pilot — recorded in open questions if desired).

**Dependencies:** LAKE-051, LAKE-016 (proposals), LAKE-019 (provenance write services reuse). **Files:** `apps/web/src/jobs/refresh-{hours,prices}.ts`, extractor interface + parsers, export/ingest CLI for assisted extraction.

**Domain rules:** asymmetric safety rules binding; lower-priority sources never override higher-priority values (conflict ⇒ proposal).
**API changes:** job types. **DB changes:** none.
**UI states:** n/a (admin queue consumes results). **DE/EN:** closure/hour notes as structured data; localization downstream.
**A11y:** n/a. **Privacy/security:** fetcher rules from 051; extraction exports contain only public page content.

**Acceptance criteria:**
- [ ] Fixture-source suite (local mock server): unchanged → stamp only; small price change → auto-applied with provenance; hours change → proposal with correct diff; source 500 → backoff + status
- [ ] No direct mutation of published facts outside auto-safe classes (test)
- [ ] Health counters increment; anomaly alert fires on >100 proposals/run (threshold test)
- [ ] Re-run idempotent

**Tests:** Integration: the mock-source matrix (refresh-pipeline suite in [testing-strategy](../../quality/testing-strategy.md)). Unit: classification, backoff math.
**Manual validation:** run against 2–3 real pilot sources on staging; review resulting proposals.
**Commands:** `curl … /api/jobs/refresh?type=hours`.
**Rollback:** disable job type; facts keep last verified values (that is the designed degradation).

---

## LAKE-053 — Closure refresh and report triage

**Status:** open · **Phase:** MVP/M5 · **Parallel:** yes (after 051)

**Objective:** Daily exceptional-closure refresh (where supported sources exist) and the user-report triage path (report → plausibility → ChangeProposal), completing the three proposal origins.

**User story:** As a visitor, I want today's storm closure of the ferry gardens visible before I stand at a locked gate.

**Context:** [refresh-and-review-pipeline.md#user-reports](../../data/refresh-and-review-pipeline.md#user-reports); closure asymmetry: additions auto-apply from official sources, removals always review.

**In scope:** `refresh?type=closures` job (per-source closure detection for registered closure-capable sources; additions high-confidence auto-apply, removals/ambiguity → proposals); closure display integration verified on detail/cards (rendering exists — data now flows); admin triage view for user reports (LAKE-041's rows): dedupe similar reports, spam dismiss, escalate-to-proposal with prefilled evidence ("user report" origin), PII-scan checklist step; report-rate quality signal counter (per attraction).
**Out of scope:** event data (phase 1.5), automated report clustering (manual at this scale).

**Dependencies:** LAKE-051, LAKE-041, LAKE-016. **Files:** closures job, admin reports triage page upgrade, proposal-from-report service.

**Domain rules:** reports never mutate content; closure removal never auto-applied.
**API changes:** job type + triage endpoints. **DB changes:** none.
**UI states (admin):** triage list with dedupe grouping; empty = positive.
**DE/EN:** closure reasons localized (short structured text both locales — translation-state machinery applies).
**A11y:** admin table semantics. **Privacy/security:** PII-scan step for report free-text before proposal creation (⚠️ process); reporter anonymity preserved.

**Acceptance criteria:**
- [ ] Mock-source: new closure auto-applies with provenance; removal → proposal; detail page shows active closure fixture
- [ ] Report triage: dedupe groups two similar fixture reports; escalation creates a prefilled proposal; dismissal audited
- [ ] Report-rate counter feeds the quality report (LAKE-066 dashboard slot)

**Tests:** Integration: closure matrix + triage flow. E2E: closure visible on detail (fixture).
**Manual validation:** triage staging reports from LAKE-041 testing.
**Commands:** `curl … /api/jobs/refresh?type=closures`.
**Rollback:** job off; closures editable manually via LAKE-015.

---

## LAKE-054 — Weather cache

**Status:** open · **Phase:** MVP/M5 · **Parallel:** yes (after 051)

**Objective:** The weather adapter + 1–3 h cache per lake sub-area, powering the rainy-day chip prefill and a minimal "rain expected" hint (OQ-11 default).

**Context:** [refresh-and-review-pipeline.md#weather](../../data/refresh-and-review-pipeline.md#weather), [external-services.md#weather](../../architecture/external-services.md#weather) (Open-Meteo, CC BY attribution).

**In scope:** `WeatherProvider` interface + Open-Meteo adapter + fake; `refresh?type=weather` job caching forecasts for 4 sample points (Konstanz, Friedrichshafen, Bregenz, Radolfzell) in a small cache table; today/tomorrow rain/heat classification helper; UI: rainy-day chip auto-suggested when rain expected at the user's area (subtle hint, not a modal); attribution on surfaces showing weather hints + licences page row; provider-failure = hints hidden (nothing else degrades — test).
**Out of scope:** forecast panels, per-attraction weather, phase-2 planner weather inputs (interface ready).

**Dependencies:** LAKE-051, LAKE-037 (chip surface). **Files:** weather provider module, cache migration (additive small table), job, hint component.

**Domain rules:** weather is ephemeral context — never stored per attraction, never a fact with provenance.
**API changes:** job type; internal weather read for UI (server-rendered hint). **DB changes:** `weather_cache` (additive).
**UI states:** hint present/absent only — absence is the failure mode (silent).
**DE/EN:** hint strings localized. **A11y:** hint is supplementary text, not color-only.
**Privacy/security:** user area = the coarse selected-location area; no per-user weather calls.

**Acceptance criteria:**
- [ ] Job caches 4 areas; classification helper correct on fixture forecasts (rain/heat/none)
- [ ] Rain-expected fixture surfaces the chip hint; provider-down hides hints with zero user-facing errors
- [ ] Open-Meteo attribution present on hint surface + licences page

**Tests:** Unit: classification. Integration: job + cache + failure fake. E2E: hint appears/disappears by mock.
**Manual validation:** live forecast sanity check on staging.
**Commands:** `curl … /api/jobs/refresh?type=weather`.
**Rollback:** feature flag hides hints; job harmless.

---

## LAKE-055 — Staleness presentation

**Status:** open · **Phase:** MVP/M5 · **Parallel:** no (epic completion)

**Objective:** REQ-DATA-07/REQ-DISC-10 completion: compute `updateStatus`/staleness levels from provenance + policy everywhere, render the full badge/warning system, and enforce the critically-stale open-now exclusion.

**User story:** As a visitor, I want to instantly distinguish "verified last week" from "we haven't checked since spring" so I know when to double-check.

**Context:** [refresh-and-review-pipeline.md#staleness-presentation](../../data/refresh-and-review-pipeline.md#staleness-presentation-req-data-07) (threshold table is binding).

**In scope:** staleness computation service (policy age vs `lastCheckedAt` → quiet/grace/warning/critical levels) used by list/detail/plan projections; detail per-fact warnings with official-link prominence; card-level freshness badge (worst critical fact); critically-stale hours ⇒ open-now exclusion + "hours unverified" treatment (completes LAKE-038 hook); plan validation surfaces stale-hours info (LAKE-046 already codes it — verify chain); nightly data-quality sweep completion (consistency rules from [data-quality-strategy.md](../../quality/data-quality-strategy.md#quality-dimensions--rules) + staleness stats into the quality report slot).
**Out of scope:** dashboards (LAKE-066).

**Dependencies:** LAKE-052/053 (real statuses), LAKE-040/041 (surfaces), LAKE-038. **Files:** staleness service in domain, projection updates, sweep job completion.

**Domain rules:** thresholds from policy config (2×, 4× multipliers configurable); outages never blank pages.
**API changes:** freshness fields enriched in responses. **DB changes:** none.
**UI states:** this ticket completes the "stale" quadrant of the global UI-state requirement across surfaces.
**DE/EN:** warning templates localized with dates.
**A11y:** warnings text+icon, associated with their facts; not color-only.
**Privacy/security:** none.

**Acceptance criteria:**
- [ ] Fixture matrix renders all four levels correctly on detail + cards
- [ ] Critically-stale-hours fixture excluded from open-now, shown elsewhere with badge (e2e)
- [ ] Sweep writes quality-report stats; consistency violations flagged on fixtures designed to violate
- [ ] SOURCE_UNAVAILABLE fixture keeps values + warning (no blank sections)

**Tests:** Unit: level computation. Integration: projection enrichment, sweep. E2E: stale-behaviour suite ([testing-strategy](../../quality/testing-strategy.md)).
**Manual validation:** age a staging fixture artificially; observe all surfaces.
**Commands:** `pnpm test -g staleness`.
**Rollback:** levels degrade to quiet (config) without layout changes.
