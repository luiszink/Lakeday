# ADR-003: Own verified master attraction database

**Status:** Accepted · 2026-08 · **Deciders:** product owner + architecture

## Context

The product's differentiator is trustworthy, structured, bilingual attraction data with dimensions no aggregator offers (child-age bands, verified accessibility, rain suitability, guest-card notes, cross-border practicalities). Options ranged from proxying third-party APIs (Google Places, OpenTripMap) to building an owned database. Third-party terms are restrictive: Google Places historically prohibits persistent storage/caching of most content and ties display to Google Maps; OSM/Wikipedia content is licensed but generic and unverified for operational facts; none provide our filter dimensions. Later phases (deterministic planner, AI assistant) additionally require stable IDs and verified facts as guardrails.

## Decision

1. Build and own a **master attraction database** as the single source of truth ([../architecture/domain-model.md](../architecture/domain-model.md)), populated through the research workflow ([../data/research-workflow.md](../data/research-workflow.md)) and maintained by the refresh pipeline.
2. Every fact carries **per-fact provenance** (source, timestamps, confidence — REQ-DATA-02); editorial summaries are original, never copied (REQ-DATA-05).
3. **Google Places must not become the persistent master database** — any future Google integration requires a dedicated analysis of storage, attribution, caching, display, and licensing restrictions *before* adoption ([../data/data-source-policy.md](../data/data-source-policy.md#google-places)).
4. External sources feed the database through documented priority rules; they never serve users directly at runtime.

## Alternatives considered

- **Google Places as backend** — rejected: licensing prohibits the master-DB pattern; costs scale with traffic; our filter dimensions don't exist there; product becomes a thin skin over a commodity.
- **OSM/Wikidata bulk import as content base** — rejected: unverified operational facts (hours/prices unreliable), ODbL share-alike questions for a derivative database, and it would anchor quality at "community data" level. OSM remains a valued *input* per fact.
- **Licensed commercial POI dataset** — rejected for MVP: cost without our differentiating fields; may complement later.
- **Editorial CMS without structured provenance** — rejected: kills refresh automation, staleness honesty, and AI-guardrail use.

## Consequences

- Content research/verification becomes the schedule-critical path and an ongoing operational cost (risks R-01…R-03) — accepted as the price of the moat.
- Requires admin tooling, review queue, and freshness machinery in the MVP (epics 3, 4, 13).
- Stable attraction IDs become a public contract (plans, favorites, AI tools, SEO URLs).
- The database is a genuine company asset with backup/restore as launch-blocking discipline.
- Later monetization (referrals, B2B guides) builds on owned data without third-party licensing conflicts.
