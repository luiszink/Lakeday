# Deployment

Status: **architectural decision** (requirements, CI pipeline), **recommendation** (concrete host — final pick in ticket LAKE-002 after a quick pricing check).

## Hosting requirements (binding)

1. **EU data residency** for app + database (GDPR; [../quality/security-and-privacy.md](../quality/security-and-privacy.md)).
2. Managed **PostgreSQL 16+ with PostGIS** extension support.
3. Next.js support (Node runtime; ISR/streaming) — container hosting also acceptable.
4. **Scheduler/cron** hitting the job endpoints ([../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md)).
5. Preview deployments per PR (greatly de-risks agent-driven development).
6. CDN for static assets and images.

**Recommendation:** a European PaaS/container host (e.g. Hetzner + Coolify, Scaleway, Railway-EU-region, or Fly.io Frankfurt) + managed EU Postgres (e.g. Neon EU, Scaleway, or host-native) ⚠️ verify PostGIS availability and pricing at pick time. Vercel is technically easiest for Next.js but requires the EU-residency and cron/limit questions answered first — comparison happens in LAKE-002; the architecture is deliberately host-portable (standard Node build, no proprietary APIs outside adapters).

## Environments

| Env              | Purpose                                                  | Data                                                        |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Local            | Development                                              | Docker Compose Postgres+PostGIS, fixture seed               |
| Preview (per PR) | Review UI/behaviour                                      | Fixture seed, isolated ephemeral DB (or schema-per-preview) |
| Staging          | Pre-production, research-import rehearsal, pilot dataset | Copy of production schema; pilot/real content               |
| Production       | Public                                                   | Real content; backups + PITR                                |

Config via environment variables only ([../architecture/system-architecture.md](../architecture/system-architecture.md#environment-variables)); no environment-specific code branches.

## CI pipeline {#ci-pipeline}

GitHub Actions (repo will live on GitHub — assumption, OQ-8):

```
PR:   install → lint + typecheck → unit (domain) → integration (Testcontainers PG+PostGIS)
      → build → e2e smoke (Playwright) → Lighthouse budgets → gitleaks → prisma migrate diff check
main: full e2e matrix (2 viewports × 2 locales) → deploy staging → smoke on staging
prod: manual promotion from staging (tag) → migration deploy (expand-only gate) → deploy → smoke → rollback-ready
```

- Migrations run **before** app deploy; only additive migrations may auto-deploy; destructive steps require the two-phase protocol ([../architecture/database-schema.md](../architecture/database-schema.md#migration-strategy)) and a manual gate.
- Rollback: previous app image/build kept warm; DB rollbacks are **not** performed (forward-fix policy; additive-first makes old app + new schema compatible).
- Deployment notifications + release notes generated from merged ticket IDs.

### Branch protection

Protect `main` in GitHub before accepting feature pull requests. Require the `Lint, typecheck, unit, and build`, `PostGIS integration`, `Prisma migration consistency`, and `Secret scan` checks from the **Pull request checks** workflow; require branches to be up to date and restrict direct pushes. Administrators should follow the same rules. The staging deployment job remains disabled until LAKE-002 configures the selected provider and its secrets.

## Scheduled jobs

Host scheduler (or GitHub Actions cron as stopgap) → authenticated `POST /api/jobs/*`:

| Schedule                     | Job                   |
| ---------------------------- | --------------------- |
| `0 */2 * * *`                | refresh?type=weather  |
| `30 4 * * *`                 | refresh?type=closures |
| `0 3 * * 1`                  | refresh?type=hours    |
| `0 4 1 * *`                  | refresh?type=prices   |
| seasonal (4×/yr, pre-season) | refresh?type=seasonal |
| `0 2 * * *`                  | data-quality sweep    |
| `0 5 * * *`                  | sitemap               |

Job runs are idempotent and monitored ([observability.md](observability.md#job-monitoring)); a missed run is recoverable by re-trigger.

## Domain & TLS

Domain TBD (OQ-1, working title). TLS via host/Let's Encrypt; apex + `www` redirect; HSTS preload after stability.
