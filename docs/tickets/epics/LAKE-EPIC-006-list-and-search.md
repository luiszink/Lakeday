# LAKE-EPIC-006 — List and search

**Phase:** MVP (M2) · **Status:** open

## Goal
The default discovery surface: the public list API with caching and pagination, the mobile-first list UI, full-text search, and location selection (geolocation opt-in or place choice) (REQ-DISC-01/04/08).

## Success criteria
- A visitor browses attractions on a fast list in both locales, searches with typo tolerance and diacritics-insensitivity, and sets a location without granting geolocation.

## Tickets
[LAKE-028](../tasks/LAKE-EPIC-006-tasks.md#lake-028--public-attractions-list-api) list API · [LAKE-029](../tasks/LAKE-EPIC-006-tasks.md#lake-029--list-ui) list UI · [LAKE-030](../tasks/LAKE-EPIC-006-tasks.md#lake-030--full-text-search) search · [LAKE-031](../tasks/LAKE-EPIC-006-tasks.md#lake-031--location-selection) location

## Dependencies
LAKE-005, LAKE-009/010 (domain + fixtures), LAKE-024. Lane A start ([dependencies.md](../../roadmap/dependencies.md#parallel-work-lanes)).

## Key specs
[filter-and-search-behaviour.md](../../ux/filter-and-search-behaviour.md) · [api-contracts.md](../../architecture/api-contracts.md#public-read-api) · [database-schema.md](../../architecture/database-schema.md#search-indexes)
