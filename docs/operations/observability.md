# Observability

Status: **architectural decision** (what must be observable), **recommendation** (tool picks — finalized in LAKE-066).

Sized for a small team: **few high-signal dashboards and alerts**, not an observability platform.

## Logging

- Structured JSON logs (pino or console-JSON on serverless) with request ID, route, status, duration; **no PII**: `near` coordinates, share tokens, and report free-text are scrub-listed ([../quality/security-and-privacy.md](../quality/security-and-privacy.md#location-data)); IPs truncated where the host allows.
- Levels: error (actionable), warn (degradation — provider fallbacks land here), info (lifecycle), debug (dev only).
- Admin actions (login, publish, review decisions, imports) → audit log (DB table, immutable).

## Error tracking

Sentry (EU region) or GlitchTip (self-host) ⚠️ pick + DPA check in LAKE-066. Client + server, sourcemaps, release tagging by deploy, PII scrubbing enabled. Budget alert: new error class or >50 events/h.

## Metrics & dashboards

| Dashboard | Signals |
|---|---|
| Public health | p50/p95/p99 latency per route group · error rate · uptime (external ping on `/api/health` + a real attraction page) |
| Provider health | Tile/geocoder/weather failure rates, circuit-breaker state, fallback activations ([../architecture/external-services.md](../architecture/external-services.md#provider-failure-policy-summary)) |
| Job health | Per job: last run, duration, fetched/changed/auto-applied/queued/failed counts |
| Data quality | Review-queue depth + age, staleness percentages, source-health board ([../quality/data-quality-strategy.md](../quality/data-quality-strategy.md#quality-metrics)) |
| DB | Connections, slow queries (>250 ms logged), storage growth |

`/api/health`: shallow (process up + DB ping). Deep checks live in job summaries, not the health endpoint (avoid cascading false alarms).

## Job monitoring {#job-monitoring}

Every job run persists a `job_run` row (type, started, finished, status, counts, error summary). Alerts: job missed its schedule by >2× interval · job failed twice consecutively · refresh queued >100 review items in one run (anomaly — possible source format change) · `SOURCE_UNAVAILABLE` >20 % of a run.

## Alerting policy

Few, actionable, deduplicated → email/webhook (team chat): site down (2 consecutive external ping failures) · error-rate spike · job alerts above · DB storage >80 % · TLS/domain expiry. Everything else is dashboard-only. No on-call theatre for a pre-launch product; alert list revisited at launch (LAKE-068).

## Synthetic checks

External uptime monitor (EU probe): `/de` (list renders — content phrase match), one detail page, `/api/health`. Every 5 min; independent of hosting provider.
