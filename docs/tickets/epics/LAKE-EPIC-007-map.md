# LAKE-EPIC-007 — Map

**Phase:** MVP (M3) · **Status:** open

## Goal
The map view as an equal partner to the list: provider abstraction with MapLibre adapter, marker/cluster map with bbox querying, map↔list synchronization, and honest degradation when tiles fail (REQ-DISC-02, REQ-DATA-07).

## Success criteria
- Map and list always show the same result set; clustering keeps the whole-lake view readable; tile failure degrades to the list without dead ends; OSM + provider attribution always visible.

## Tickets
[LAKE-032](../tasks/LAKE-EPIC-007-tasks.md#lake-032--map-provider-abstraction) abstraction · [LAKE-033](../tasks/LAKE-EPIC-007-tasks.md#lake-033--map-view) map view · [LAKE-034](../tasks/LAKE-EPIC-007-tasks.md#lake-034--map-list-synchronization) sync · [LAKE-035](../tasks/LAKE-EPIC-007-tasks.md#lake-035--map-degradation-and-fallback) degradation

## Dependencies
LAKE-028 (bbox param), LAKE-029. Tile-provider account + terms verification (external, [external-services.md](../../architecture/external-services.md#map-tiles)).

## Key specs
[map-and-list-behaviour.md](../../ux/map-and-list-behaviour.md) · [ADR-005](../../adr/ADR-005-map-provider-abstraction.md) · [provenance-and-licensing.md](../../data/provenance-and-licensing.md#openstreetmap)
