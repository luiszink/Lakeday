# LAKE-EPIC-013 — Scheduled refresh

**Phase:** MVP (M5) · **Status:** open

## Goal
The live-data machinery: idempotent job framework, hours/prices refreshers with diff detection and asymmetric auto-apply, closure refresh with user-report triage, the weather cache, and user-facing staleness presentation (REQ-DATA-02/03/07, [ADR-006](../../adr/ADR-006-periodic-data-refresh.md)).

## Success criteria
- Facts refresh on policy cadence; uncertain changes queue for review; source outages degrade to labelled stale data; badges and open-now exclusions behave per spec.

## Tickets
[LAKE-051](../tasks/LAKE-EPIC-013-tasks.md#lake-051--job-framework) framework · [LAKE-052](../tasks/LAKE-EPIC-013-tasks.md#lake-052--opening-hours-and-price-refresh) hours+prices · [LAKE-053](../tasks/LAKE-EPIC-013-tasks.md#lake-053--closure-refresh-and-report-triage) closures+triage · [LAKE-054](../tasks/LAKE-EPIC-013-tasks.md#lake-054--weather-cache) weather · [LAKE-055](../tasks/LAKE-EPIC-013-tasks.md#lake-055--staleness-presentation) staleness UI

## Dependencies
LAKE-016 (review queue), LAKE-019 (provenance write paths), LAKE-040/041 (detail surfaces). Internal: 051 → 052/053/054 (parallel) → 055.

## Key specs
[refresh-and-review-pipeline.md](../../data/refresh-and-review-pipeline.md) · [data-refresh prompt](../../research/prompts/data-refresh.md) · [observability.md](../../operations/observability.md#job-monitoring)
