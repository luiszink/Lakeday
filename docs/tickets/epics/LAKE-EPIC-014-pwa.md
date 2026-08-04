# LAKE-EPIC-014 — PWA

**Phase:** MVP (M6) · **Status:** open

## Goal
Progressive Web App capabilities: manifest, service worker with the documented caching strategy, install hint, and honest offline behaviour with capped tile caching (REQ-PWA-01…03, [ADR-002](../../adr/ADR-002-pwa-before-native.md)).

## Success criteria
- Installable on Android and iOS (manual instructions); app shell + visited content survive short offline gaps; offline state is visible and truthful; performance budgets hold.

## Tickets
[LAKE-056](../tasks/LAKE-EPIC-014-tasks.md#lake-056--manifest-and-service-worker) manifest+SW · [LAKE-057](../tasks/LAKE-EPIC-014-tasks.md#lake-057--offline-behaviour) offline

## Dependencies
Core surfaces stable (epics 6–9); LAKE-003 (Lighthouse CI budgets active).

## Key specs
[pwa-strategy.md](../../architecture/pwa-strategy.md)
