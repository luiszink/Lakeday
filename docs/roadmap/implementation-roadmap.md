# Implementation roadmap

Status: **recommendation** (sequencing); phase boundaries are **architectural decisions** ([ADR-002](../adr/ADR-002-pwa-before-native.md), [ADR-007](../adr/ADR-007-deterministic-before-llm.md)).

Backlog: [../tickets/README.md](../tickets/README.md) · Dependencies: [dependencies.md](dependencies.md). No calendar dates — milestones are dependency-ordered; team/agent capacity determines pace.

## Milestone plan (MVP = M0–M6)

### M0 — Foundation
Epics 1–2 core: scaffolding, CI, local dev, hosting/staging, Prisma schema, PostGIS + geo seed, vocabularies, domain package, fixtures.
**Exit:** `pnpm dev` runs the app against seeded fixture data; CI green; staging deploys on merge.
Tickets: LAKE-001…010.

### M1 — Content backbone
Domain engines (dedup, opening hours), admin auth + CRUD, i18n foundation, translation states.
**Exit:** an editor can create, localize, and publish a fixture attraction end-to-end; publish invariants enforced.
Tickets: LAKE-011…017 (except 016 review queue can slip to M3), LAKE-024…026.

### M2 — Discovery (list first)
List API + UI, search, location selection, detail API + page, images.
**Exit:** a visitor can find and read attraction pages in both locales on mobile; deployed to staging with fixture data.
Tickets: LAKE-028…031, LAKE-040, LAKE-042.

### M3 — Filters, map, ingestion
Filter engine + UI + open-now + sorting; map (provider abstraction, view, sync, fallback); research import pipeline + review queue; **research pilot (LAKE-023) runs here** — earliest realistic point, deliberately before scaling content work.
**Exit:** full discovery experience with real pilot data (BS-01/BS-14/BS-06) on staging; pilot retro done; research can scale in parallel from here on.
Tickets: LAKE-036…039, LAKE-032…035, LAKE-018…023, LAKE-016.

### M4 — Personal features
Favorites; manual plans (store, validation engine, screen); sharing (API, shared view, print); freshness display + user reports.
**Exit:** J3 journey (plan a family day, share it) works end-to-end anonymously.
Tickets: LAKE-043…050, LAKE-041.

### M5 — Live-data pipeline
Job framework, hours/prices/closures refreshers, weather, staleness presentation.
**Exit:** freshness policy active; review queue receiving real proposals; stale badges honest.
Tickets: LAKE-051…055.

### M6 — Launch hardening
PWA (manifest, SW, offline), accessibility audits, SEO, analytics, e2e persona suite, performance budgets, observability, backup drill, legal pages, launch checklist. Content coverage grows via the (parallel) research operation to REQ-DATA-10.
**Exit = public MVP launch.**
Tickets: LAKE-056…068.

### Post-MVP
- **Phase 1.5** (no gate; demand-driven): events refresh, guest-card structured data, optional accounts + favorites sync, more sectors.
- **Phase 2** (Gate G1): deterministic planner — LAKE-069…073.
- **Phase 3** (Gate G2): AI assistant — LAKE-074…077.
Gates: [../product/success-metrics.md](../product/success-metrics.md#phase-gates).

## Content track (parallel to code)

Research is an **operation, not a code milestone**: pilot at M3, then sector-by-sector production research (priority order in [../data/research-workflow.md](../data/research-workflow.md#step-details)) running alongside M4–M6. Launch requires REQ-DATA-10 coverage — this is typically the schedule-critical path, start early.

## Principles

1. **Vertical slices after M1:** every milestone ends with something visible on staging.
2. **Data pipeline before mass content:** no production research before the pilot retro (avoids re-researching under a changed schema).
3. **Cross-cutting concerns are per-ticket duties** (a11y, i18n, states — [../agents/definition-of-done.md](../agents/definition-of-done.md)); the M6 tickets are audits and infrastructure, not "add accessibility at the end".
4. **Parallelization:** see [dependencies.md](dependencies.md#parallel-work-lanes) — after M1 roughly three independent lanes exist (discovery UI, ingestion/admin, personal features).
