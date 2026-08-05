# Database schema

Status: **architectural decision** (PostgreSQL + PostGIS + Prisma; [ADR-009](../adr/ADR-009-technology-stack.md)). This file plans the physical schema; the authoritative logical model is [domain-model.md](domain-model.md). The Prisma schema is created in ticket LAKE-006.

## Technology

- **PostgreSQL 16+** with **PostGIS** (geography type, `ST_DWithin`, `ST_Distance`) and **pg_trgm** (fuzzy search).
- **Prisma** as ORM and migration tool. PostGIS columns are managed as `Unsupported("geography(Point,4326)")` with raw-SQL migration steps and thin query helpers in `packages/db`; this is a known, accepted Prisma limitation — geometry queries go through typed raw-SQL helpers, everything else through the Prisma client.
- All timestamps `timestamptz` in UTC; presentation converts to `Europe/Berlin` / `Europe/Zurich` / `Europe/Vienna` (same zone, kept symbolic per country).

## Table plan

Tables map 1:1 to the entities in [domain-model.md](domain-model.md#entities):

`attraction`, `attraction_localization`, `category`, `attraction_category`, `interest`, `attraction_interest`, `audience`, `attraction_audience`, `editorial_tag`, `attraction_tag`, `opening_schedule`, `opening_rule`, `exceptional_closure`, `price_info`, `source_record`, `fact_provenance`, `change_proposal`, `external_identifier`, `attraction_image`, `region`, `plan`, `plan_stop`, `user_report`, `admin_user`, `licence`, `attraction_alias` (merge redirects), `holiday_calendar` (seeded public holidays per country/subdivision), `research_import_batch` (immutable import audit summary).

Naming: `snake_case` tables/columns; Prisma maps to camelCase. Enums as native Postgres enums for closed sets that change with code (status, verification); as lookup tables for editor-extensible vocabularies (category, interest, audience — see [../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md#governance)).

The source registry adds the `source_origin` table; immutable `source_record` rows may reference their registered origin.

## Key DDL decisions

### Source and licence registries
`source_origin` stores the origin URL, source type, linked licence, refresh cadence, health, public attribution, notes, and `PENDING / APPROVED / REJECTED` approval state. `source_record.source_origin_id` connects immutable evidence to its registry origin. Approval is ADMIN-controlled; import and refresh code must use the shared approval guard before consuming an origin. `licence` additionally stores terms URL, public attribution text, and permission evidence (admin-only).

### Geometry
```sql
-- attraction.location
location geography(Point, 4326) NOT NULL
-- region.polygon, shoreline reference geometry
polygon geography(MultiPolygon, 4326)
-- data/geo/shoreline.geojson loaded into table shoreline_geometry(version, geom)
```
`shoreline_distance_m` is a stored column recomputed by trigger-free batch job whenever `shoreline_geometry.version` changes (explicit, auditable — no magic triggers).

### Search indexes {#search-indexes}
```sql
CREATE INDEX attraction_loc_fts ON attraction_localization
  USING gin(to_tsvector('simple', unaccent(name || ' ' || coalesce(summary,''))));
CREATE INDEX attraction_loc_trgm ON attraction_localization
  USING gin (unaccent(lower(name)) gin_trgm_ops);
```
`simple` dictionary + `unaccent` (not `german`/`english` stemmers) keeps DE/EN behaviour symmetric and diacritics-insensitive; revisit if recall proves poor (recorded in [../roadmap/open-questions.md](../roadmap/open-questions.md) OQ-7).

### Geo and filter indexes
```sql
CREATE INDEX attraction_location_gix ON attraction USING gist(location);
CREATE INDEX attraction_status_region_ix ON attraction(status, region_code);
-- partial index for the hot path: published attractions only
CREATE INDEX attraction_published_ix ON attraction(region_code, price_level) WHERE status = 'PUBLISHED';
```
Multi-dimensional filter queries rely on Postgres combining these; measure before adding more. Expected scale (≤ ~5k attractions) makes over-indexing the bigger risk.

### Integrity constraints (selection)
```sql
-- scope exception must be justified
CHECK (NOT scope_exception OR length(scope_exception_reason) > 0)
-- localization uniqueness
UNIQUE (attraction_id, locale); UNIQUE (locale, slug)
-- external IDs unique per system
UNIQUE (system, external_id)
-- share tokens unique
UNIQUE (share_token)
-- plan stops ordered uniquely
UNIQUE (plan_id, sort_index)
```
The "published requires both localizations + category + verified critical facts" invariant spans rows and is enforced in the domain layer at the publish transition (single choke point `publishAttraction()`), plus a nightly data-quality sweep ([../quality/data-quality-strategy.md](../quality/data-quality-strategy.md)) — not as fragile DB triggers.

## Migration strategy

- Prisma Migrate; every migration reviewed in PR; raw SQL steps allowed inside Prisma migrations for PostGIS/index work.
- Rule: **additive first** — destructive changes (drop/rename) require a two-step deploy (add + backfill, later remove) once real data exists.
- Seed scripts (idempotent, in `packages/db/seed/`): regions + polygons, shoreline geometry, categories/interests/audiences, holiday calendars, licence registry, one admin user (from env), pilot fixtures for tests.
- Every migration must pass `prisma migrate diff` cleanliness check in CI ([../operations/deployment.md](../operations/deployment.md#ci-pipeline)).

## Data volumes and retention

| Table group | Expected scale | Retention |
|---|---|---|
| Content (attraction & children) | 10³–10⁴ rows | Permanent; `ARCHIVED` status instead of delete |
| `source_record` | 10⁴–10⁵, grows with refresh | Raw payloads compressed; prune payload (keep metadata + hash) after 24 months |
| `fact_provenance`, `change_proposal` | 10⁴–10⁵ | Permanent (audit trail) |
| `plan`, `plan_stop` | grows with sharing | Deleted 12 months after `last_accessed_at` (privacy; documented) |
| `user_report` | small | Resolved reports pruned after 12 months |

## Backup and recovery

Managed-Postgres daily snapshots + PITR; restore drill documented in [../operations/maintenance.md](../operations/maintenance.md#backup-and-restore). The content database is the company's core asset — backup verification is a launch blocker (ticket LAKE-067).
