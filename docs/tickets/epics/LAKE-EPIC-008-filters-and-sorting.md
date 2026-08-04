# LAKE-EPIC-008 — Filters and sorting

**Phase:** MVP (M3) · **Status:** open

## Goal
All 22 structured filter dimensions with correct must/nice semantics, the filter UI with quick chips and URL state, open-now/on-date filtering via the hours engine, and both sort orders with zero-result help (REQ-FILT-*, REQ-DISC-05/06/07).

## Success criteria
- Every dimension filters correctly per the taxonomy; unknown handling matches must/nice classes; zero results always offer relaxations; relevance is deterministic and explainable.

## Tickets
[LAKE-036](../tasks/LAKE-EPIC-008-tasks.md#lake-036--filter-engine-and-api) engine+API · [LAKE-037](../tasks/LAKE-EPIC-008-tasks.md#lake-037--filter-ui) UI · [LAKE-038](../tasks/LAKE-EPIC-008-tasks.md#lake-038--open-now-and-open-on-date-filter) open-now · [LAKE-039](../tasks/LAKE-EPIC-008-tasks.md#lake-039--sorting-and-zero-result-help) sorting

## Dependencies
LAKE-028/029 (list), LAKE-008 (vocabularies), LAKE-012 (hours engine, for 038), LAKE-031 (location, for distance sort).

## Key specs
[filter-and-search-behaviour.md](../../ux/filter-and-search-behaviour.md) · [tag-and-filter-taxonomy.md](../../data/tag-and-filter-taxonomy.md) · [api-contracts.md](../../architecture/api-contracts.md#get-apiattractions--listsearchfilter)
