# LAKE-EPIC-002 — Domain and database

**Phase:** MVP (M0/M1) · **Status:** open

## Goal
The complete data foundation: Prisma/PostGIS schema for all content entities, geographic seed data (shoreline, regions), controlled vocabularies, the pure domain package with invariants, the shared fixture dataset, and the first two domain engines (duplicate detection, opening hours).

## Success criteria
- All entities from [domain-model.md](../../architecture/domain-model.md) exist as migrations; scope rule computes `shorelineDistanceM`; publish invariants enforced in one choke point; fixtures load reproducibly; dedup scorer and hours engine pass their golden test suites.

## Tickets
[LAKE-006](../tasks/LAKE-EPIC-002-tasks.md#lake-006--prisma-schema-and-initial-migration) schema · [LAKE-007](../tasks/LAKE-EPIC-002-tasks.md#lake-007--postgis-setup-and-geographic-seed-data) PostGIS+geo · [LAKE-008](../tasks/LAKE-EPIC-002-tasks.md#lake-008--vocabulary-and-calendar-seeds) vocab seeds · [LAKE-009](../tasks/LAKE-EPIC-002-tasks.md#lake-009--domain-package-and-publish-invariants) domain pkg · [LAKE-010](../tasks/LAKE-EPIC-002-tasks.md#lake-010--fixture-dataset) fixtures · [LAKE-011](../tasks/LAKE-EPIC-002-tasks.md#lake-011--duplicate-detection-scorer) dedup · [LAKE-012](../tasks/LAKE-EPIC-002-tasks.md#lake-012--opening-hours-engine) hours engine

## Dependencies
LAKE-001, LAKE-004. Strict internal chain 006→007→008→009→010; 011/012 parallel after 009.

## Key specs
[domain-model.md](../../architecture/domain-model.md) · [database-schema.md](../../architecture/database-schema.md) · [tag-and-filter-taxonomy.md](../../data/tag-and-filter-taxonomy.md) · [ADR-001](../../adr/ADR-001-shoreline-scope.md), [ADR-003](../../adr/ADR-003-master-attraction-database.md)
