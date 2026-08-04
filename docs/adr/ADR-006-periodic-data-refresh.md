# ADR-006: Periodic data refresh with review queue instead of live queries

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

Users expect "live" correctness for hours, prices, and closures — but querying source websites per user request is impossible (latency, load on third-party sites, legal politeness) and live third-party APIs for this content don't broadly exist. Meanwhile, automated extraction is fallible: silently auto-publishing scraped changes would eventually publish garbage (source redesigns, seasonal ambiguity), destroying the trust that is the product's core asset.

## Decision

1. Volatile facts are refreshed **periodically by scheduled jobs** with a per-fact-class freshness policy (weather 1–3 h · closures daily · hours weekly · prices monthly · seasonal pre-season · [../data/refresh-and-review-pipeline.md](../data/refresh-and-review-pipeline.md)); nothing fetches external sources in a user request path.
2. Every volatile fact carries full freshness metadata: source, type, `lastCheckedAt`, `nextRefreshAt`, confidence, `updateStatus`, optional `detectedChange` and `reviewerDecision` (REQ-DATA-02).
3. **Uncertain changes never auto-publish**: only narrowly defined auto-safe classes (unchanged confirmations, small price changes, official closure *additions*) apply automatically; everything else — all hours-structure changes, closure removals, accessibility changes — creates a `ChangeProposal` for human review. The asymmetry is deliberate: wrongly claiming "open/accessible" harms users more than wrongly claiming "closed".
4. Source failures degrade safely: last verified values remain, honestly labelled (`SOURCE_UNAVAILABLE`, staleness badges, official-link prominence); pages never go blank because a third party is down (REQ-DATA-07).
5. Staleness is user-visible by design: "last verified" dates, per-fact warnings past 2× policy age, exclusion from "open now" past 4× in season.

## Alternatives considered

- **Live fetching on request** — rejected: latency, third-party load, fragility, likely ToS issues.
- **Fully automated publish of extracted changes** — rejected: extraction errors would reach users; trust is unrecoverable.
- **Fully manual maintenance** — rejected: doesn't scale past ~100 attractions × several volatile facts; freshness would silently rot.
- **No freshness display** ("pretend it's live") — rejected: honesty about data age is a differentiator and a liability shield.

## Consequences

- Requires job infrastructure, provenance schema, review-queue UI, and editor capacity (review SLA: safety-relevant < 2 working days) — a real operational commitment (risk R-03).
- Users see slightly stale data within policy windows — accepted and communicated, superior to confidently wrong data.
- The review queue doubles as the funnel for user reports and research imports — one moderation surface for all change sources.
- Refresh telemetry (queue depth, source health) becomes a first-class ops signal ([../operations/observability.md](../operations/observability.md#job-monitoring)).
