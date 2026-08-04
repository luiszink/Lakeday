# LAKE-EPIC-009 — Attraction details

**Phase:** MVP (M2 core, M4 freshness/reports) · **Status:** open

## Goal
The attraction detail page — the product's most important single screen: complete structured facts in decision-priority order, official links, licensed images with attribution, per-fact freshness display, and the incorrect-information report flow (REQ-DISC-03/10/11, REQ-REP-01).

## Success criteria
- Detail pages render every published field bilingually with the hierarchy from the IA spec; freshness is honest per fact; a visitor reports wrong data in under 30 seconds; every image is licence-clean and attributed.

## Tickets
[LAKE-040](../tasks/LAKE-EPIC-009-tasks.md#lake-040--detail-api-and-page) API+page · [LAKE-041](../tasks/LAKE-EPIC-009-tasks.md#lake-041--freshness-display-and-issue-reports) freshness+reports · [LAKE-042](../tasks/LAKE-EPIC-009-tasks.md#lake-042--image-pipeline) images

## Dependencies
LAKE-028 (API base), LAKE-025 (slugs), LAKE-012 (hours for open-state). 041 stale badges complete with LAKE-055.

## Key specs
[information-architecture.md](../../ux/information-architecture.md#content-hierarchy-on-the-detail-page) · [refresh-and-review-pipeline.md](../../data/refresh-and-review-pipeline.md#staleness-presentation-req-data-07) · [provenance-and-licensing.md](../../data/provenance-and-licensing.md#images)
