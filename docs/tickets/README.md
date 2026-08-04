# Implementation backlog

The backlog is organized into 20 epics (`LAKE-EPIC-001`…`020`) and 77 tickets (`LAKE-001`…`077`). MVP tickets (LAKE-001…068) are **implementation-ready**; phase-2/3 tickets (LAKE-069…077) are **planning-ready** and must not be started before their gates ([../product/success-metrics.md](../product/success-metrics.md#phase-gates)).

**Structure note:** tickets are grouped per epic in `tasks/LAKE-EPIC-0NN-tasks.md` (rationale: [../README.md](../README.md#deviations-from-the-originally-requested-file-structure)). Every ticket has a stable ID and heading anchor.

**How to work a ticket:** [../agents/implementation-guide.md](../agents/implementation-guide.md). Sequencing: [../roadmap/implementation-roadmap.md](../roadmap/implementation-roadmap.md) · [../roadmap/dependencies.md](../roadmap/dependencies.md).

## Epic index

| Epic | Name | Tickets | Milestone | Phase |
|---|---|---|---|---|
| [LAKE-EPIC-001](epics/LAKE-EPIC-001-repository-foundation.md) | Repository foundation | 001–005 | M0/M1 | MVP |
| [LAKE-EPIC-002](epics/LAKE-EPIC-002-domain-and-database.md) | Domain and database | 006–012 | M0/M1 | MVP |
| [LAKE-EPIC-003](epics/LAKE-EPIC-003-content-administration.md) | Content administration | 013–017 | M1/M3 | MVP |
| [LAKE-EPIC-004](epics/LAKE-EPIC-004-attraction-ingestion.md) | Attraction ingestion | 018–023 | M3 | MVP |
| [LAKE-EPIC-005](epics/LAKE-EPIC-005-bilingual-content.md) | Bilingual content | 024–027 | M1 | MVP |
| [LAKE-EPIC-006](epics/LAKE-EPIC-006-list-and-search.md) | List and search | 028–031 | M2 | MVP |
| [LAKE-EPIC-007](epics/LAKE-EPIC-007-map.md) | Map | 032–035 | M3 | MVP |
| [LAKE-EPIC-008](epics/LAKE-EPIC-008-filters-and-sorting.md) | Filters and sorting | 036–039 | M3 | MVP |
| [LAKE-EPIC-009](epics/LAKE-EPIC-009-attraction-details.md) | Attraction details | 040–042 | M2/M4 | MVP |
| [LAKE-EPIC-010](epics/LAKE-EPIC-010-favorites.md) | Favorites | 043–044 | M4 | MVP |
| [LAKE-EPIC-011](epics/LAKE-EPIC-011-manual-plans.md) | Manual plans | 045–047 | M4 | MVP |
| [LAKE-EPIC-012](epics/LAKE-EPIC-012-sharing.md) | Sharing | 048–050 | M4 | MVP |
| [LAKE-EPIC-013](epics/LAKE-EPIC-013-scheduled-refresh.md) | Scheduled refresh | 051–055 | M5 | MVP |
| [LAKE-EPIC-014](epics/LAKE-EPIC-014-pwa.md) | PWA | 056–057 | M6 | MVP |
| [LAKE-EPIC-015](epics/LAKE-EPIC-015-accessibility.md) | Accessibility | 058–059 | M6 | MVP |
| [LAKE-EPIC-016](epics/LAKE-EPIC-016-seo.md) | SEO | 060–061 | M6 | MVP |
| [LAKE-EPIC-017](epics/LAKE-EPIC-017-analytics.md) | Analytics | 062–063 | M6 | MVP |
| [LAKE-EPIC-018](epics/LAKE-EPIC-018-testing-and-deployment.md) | Testing and deployment | 064–068 | M6 | MVP |
| [LAKE-EPIC-019](epics/LAKE-EPIC-019-deterministic-planner.md) | Deterministic planner | 069–073 | Gate G1 | Phase 2 |
| [LAKE-EPIC-020](epics/LAKE-EPIC-020-ai-assistant.md) | AI travel assistant | 074–077 | Gate G2 | Phase 3 |

## Traceability matrix {#traceability-matrix}

Requirements from [../product/mvp-scope.md](../product/mvp-scope.md) → implementing tickets. Specs and ADRs are linked inside each ticket.

| Requirement | Tickets |
|---|---|
| REQ-DISC-01 list | LAKE-028, LAKE-029 |
| REQ-DISC-02 map | LAKE-032, LAKE-033, LAKE-034 |
| REQ-DISC-03 detail pages | LAKE-040 |
| REQ-DISC-04 search | LAKE-030 |
| REQ-DISC-05 filters | LAKE-036, LAKE-037 |
| REQ-DISC-06 distance sort | LAKE-039 |
| REQ-DISC-07 relevance sort | LAKE-039 |
| REQ-DISC-08 location selection | LAKE-031 |
| REQ-DISC-09 DE/EN content | LAKE-024, LAKE-025, LAKE-026, LAKE-027 |
| REQ-DISC-10 freshness display | LAKE-041, LAKE-055 |
| REQ-DISC-11 official links | LAKE-040 |
| REQ-FILT-01 normalized filters | LAKE-008, LAKE-036 |
| REQ-FILT-02…13, 15…23 dimensions | LAKE-036, LAKE-037 |
| REQ-FILT-14 open now / on date | LAKE-012, LAKE-038 |
| REQ-FAV-01/02 anonymous local favorites | LAKE-043, LAKE-044 |
| REQ-FAV-03 sync-ready model | LAKE-043 |
| REQ-PLAN-01…03 add/remove/reorder | LAKE-045 |
| REQ-PLAN-04/05 date & start point | LAKE-045 |
| REQ-PLAN-06/07 duration & conflicts | LAKE-046, LAKE-047 |
| REQ-PLAN-08 save | LAKE-047, LAKE-048 |
| REQ-PLAN-09 share link | LAKE-048, LAKE-049 |
| REQ-PLAN-10 print/export | LAKE-050 |
| REQ-PLAN-11 no account | LAKE-043, LAKE-045 (architecture: ADR-004) |
| REQ-PWA-01/02 installable PWA | LAKE-056 |
| REQ-PWA-03 offline behaviour | LAKE-057 |
| REQ-PWA-04 native gates documented | LAKE-056 (verifies doc link; gates in [../architecture/pwa-strategy.md](../architecture/pwa-strategy.md#native-app-gates)) |
| REQ-DATA-01 master DB | LAKE-006…010 |
| REQ-DATA-02 per-fact provenance | LAKE-006, LAKE-019, LAKE-051 |
| REQ-DATA-03 refresh + review | LAKE-016, LAKE-051…053 |
| REQ-DATA-04 duplicate detection | LAKE-011, LAKE-019 |
| REQ-DATA-05 original summaries | LAKE-021 |
| REQ-DATA-06 publication workflow | LAKE-009, LAKE-015 |
| REQ-DATA-07 safe degradation / stale | LAKE-035, LAKE-055 |
| REQ-DATA-08 scope rule | LAKE-007, LAKE-009 |
| REQ-DATA-09 admin interface | LAKE-013…017 |
| REQ-DATA-10 launch dataset | LAKE-023 (+ research operation, [../data/research-workflow.md](../data/research-workflow.md)) |
| REQ-I18N-01 i18n | LAKE-024…027 |
| REQ-A11Y-01 WCAG 2.2 AA | LAKE-058, LAKE-059 (+ per-ticket DoD) |
| REQ-SEC-01 GDPR/privacy | LAKE-031, LAKE-048, LAKE-062, LAKE-068 |
| REQ-SEC-02 rate limiting | LAKE-028, LAKE-041, LAKE-048 |
| REQ-SEO-01 SEO | LAKE-060, LAKE-061 |
| REQ-OBS-01 observability | LAKE-051, LAKE-066 |
| REQ-REP-01 issue reports | LAKE-041 |

Reverse traceability: each ticket links its requirement IDs and spec files; ADR rationale lives in [../adr/](../adr/ADR-001-shoreline-scope.md).

## Status tracking

Ticket status is tracked in the issue tracker once the repo is hosted (OQ-8); until then, mark status inline in the task files (`Status: open / in progress / done`). All tickets start `open`.
