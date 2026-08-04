# LAKE-EPIC-010 — Favorites

**Phase:** MVP (M4) · **Status:** open

## Goal
Anonymous, local-first favorites: IndexedDB store with sync-ready record shape, heart toggles everywhere, and the favorites screen with live data (REQ-FAV-01/02/03).

## Success criteria
- Favoriting works offline and without any server communication; unpublished favorites degrade gracefully; the record shape carries `syncState` for phase-1.5 account sync.

## Tickets
[LAKE-043](../tasks/LAKE-EPIC-010-tasks.md#lake-043--local-favorites-store-and-toggles) store+toggles · [LAKE-044](../tasks/LAKE-EPIC-010-tasks.md#lake-044--favorites-screen) screen

## Dependencies
LAKE-029 (cards), LAKE-040 (detail integration). Lane C start — parallel-safe against lanes A/B.

## Key specs
[favorites-and-plans.md](../../ux/favorites-and-plans.md#favorites) · [ADR-004](../../adr/ADR-004-anonymous-favorites.md) · [auth-and-anonymous-usage.md](../../architecture/auth-and-anonymous-usage.md#anonymous-data-model)
