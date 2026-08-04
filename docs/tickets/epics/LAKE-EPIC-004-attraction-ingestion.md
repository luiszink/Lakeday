# LAKE-EPIC-004 — Attraction ingestion

**Phase:** MVP (M3) · **Status:** open

## Goal
The bridge between the research workflow and the production database: schema-validated import of research output with dedup, provenance creation, the copied-prose guard, an admin import UI — validated end-to-end by the pilot (BS-01, BS-14, BS-06).

## Success criteria
- Research JSON imports into drafts with complete SourceRecords/FactProvenance; duplicates and low-confidence records land in review; the pilot retro meets the exit criteria in [research-workflow.md](../../data/research-workflow.md#pilot-procedure).

## Tickets
[LAKE-018](../tasks/LAKE-EPIC-004-tasks.md#lake-018--research-validation-cli-and-conventions) CLI · [LAKE-019](../tasks/LAKE-EPIC-004-tasks.md#lake-019--research-import-endpoint) import endpoint · [LAKE-020](../tasks/LAKE-EPIC-004-tasks.md#lake-020--research-output-schema-in-code) schema-in-code · [LAKE-021](../tasks/LAKE-EPIC-004-tasks.md#lake-021--copied-prose-guard-and-rejection-reporting) prose guard · [LAKE-022](../tasks/LAKE-EPIC-004-tasks.md#lake-022--admin-import-ui) import UI · [LAKE-023](../tasks/LAKE-EPIC-004-tasks.md#lake-023--research-pilot-execution-and-retro) pilot

## Dependencies
LAKE-009, LAKE-011 (dedup), LAKE-013/014 (admin). Internal chain: 020 → 019/018 → 021/022 → 023 (023 also needs LAKE-016).

## Key specs
[research-workflow.md](../../data/research-workflow.md) · [research-output-schema.md](../../data/research-output-schema.md) · [research prompts](../../research/prompts/attraction-discovery.md)
