# Maintenance

Status: **recommendation** (operating rhythm for a small team + agents).

## Routine cadence {#routine-cadence}

| Cadence | Task | Owner |
|---|---|---|
| Daily (automated) | Refresh jobs, data-quality sweep, sitemap — human involvement only on alerts | Jobs |
| 2–3×/week | Review queue: safety-relevant proposals < 2 working days, others < 7 ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md#review-queue)) | Reviewer |
| Weekly | Data-quality report review · zero-result log → data-gap candidates · user-report triage | Editor |
| Monthly | Dependency updates (Renovate/Dependabot batch, CI-gated) · provider usage/quota check vs. free-tier limits ([../architecture/external-services.md](../architecture/external-services.md)) · error-tracker triage | Engineer |
| Quarterly | Vocabulary distribution review ([../data/tag-and-filter-taxonomy.md](../data/tag-and-filter-taxonomy.md#governance)) · scope-exception re-review (ADR-001) · accessibility manual audit · restore drill | Team |
| Yearly | Holiday-calendar seed refresh (following year, DE-BW/CH-TG/CH-SH/AT-VBG) · licence registry re-verification of ⚠️ entries · shoreline/region geometry review | Editor + Engineer |
| Pre-season (4×/yr) | Seasonal refresh job verification · seasonal content check (lido openings, winter closures) | Editor |

## Backup and restore {#backup-and-restore}

- Managed-Postgres daily snapshots + PITR (WAL) — [../architecture/database-schema.md](../architecture/database-schema.md#backup-and-recovery).
- **Quarterly restore drill:** restore latest snapshot into a scratch instance, run the data-quality sweep against it, record duration + result in the ops log. The content DB is the core asset; an unverified backup is not a backup.
- `data/geo/` and `data/research/` are additionally versioned in git (second line of defense for seed/research data).

## Data stewardship

- Every attraction has an implicit steward (last publishing editor); the quality report surfaces attractions with repeated user reports for editorial attention.
- Source-registry health: persistently failing sources (≥ 3 consecutive failures) are flagged; editor re-sources the facts or marks fields UNKNOWN honestly.
- Merged/archived attractions keep aliases forever (stable IDs promise — [../architecture/domain-model.md](../architecture/domain-model.md)).

## Dependency & security maintenance

Renovate with grouped minor/patch PRs (CI must pass) · majors manual · `pnpm audit` in CI (fail on high/critical with known exploit) · Next.js security releases applied within a week · gitleaks continuous.

## Documentation maintenance

Docs are code: tickets changing behaviour update the relevant spec file in the same PR ([../agents/definition-of-done.md](../agents/definition-of-done.md)) · ADRs are immutable once accepted — superseding decisions get new ADRs · [../roadmap/open-questions.md](../roadmap/open-questions.md) reviewed monthly; resolved items move into the owning spec.
